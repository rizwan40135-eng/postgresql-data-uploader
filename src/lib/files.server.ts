// Files: binary goes to AWS S3, metadata row goes to AWS RDS (customer_files table).
// Env on EC2: DATABASE_URL, S3_BUCKET, AWS_REGION. AWS credentials come from the EC2 IAM role
// (or AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY if no role). No Supabase involved.
import type { Pool } from "pg";

export type CustomerFile = {
  id: string;
  customer_id: string;
  file_name: string;
  s3_key: string;
  mime_type: string;
  file_size: number;
  created_at: string;
};

let pool: Pool | null = null;
let migrated: Promise<void> | null = null;

const MIGRATION = `
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TABLE IF NOT EXISTS customer_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  s3_key TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_customer_files_customer ON customer_files(customer_id);
`;

function env() {
  const url = process.env["DATABASE_URL"];
  const bucket = process.env["S3_BUCKET"];
  const region = process.env["AWS_REGION"] || "ap-south-1";
  if (!url || !bucket) throw new Error("File storage needs DATABASE_URL and S3_BUCKET in .env (EC2 only).");
  return { url, bucket, region };
}

async function db() {
  const { url } = env();
  if (!pool) {
    const { default: pg } = await import("pg");
    pool = new pg.Pool({
      connectionString: url,
      ssl: process.env["DATABASE_SSL"] === "false" ? false : { rejectUnauthorized: false },
    });
  }
  if (!migrated) migrated = pool.query(MIGRATION).then(() => undefined).catch((e) => { migrated = null; throw e; });
  await migrated;
  return pool;
}

async function s3() {
  const { region, bucket } = env();
  const { S3Client } = await import("@aws-sdk/client-s3");
  return { client: new S3Client({ region }), bucket };
}

export async function presignUpload(customerId: string, fileName: string, mimeType: string) {
  const { client, bucket } = await s3();
  const { PutObjectCommand } = await import("@aws-sdk/client-s3");
  const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner");
  const safe = fileName.replace(/[^\w.\-]/g, "_");
  const key = `customers/${customerId}/${Date.now()}-${safe}`;
  const url = await getSignedUrl(client, new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: mimeType }), { expiresIn: 900 });
  return { url, key };
}

export async function saveFile(f: Omit<CustomerFile, "id" | "created_at">) {
  const p = await db();
  await p.query(
    "INSERT INTO customer_files (customer_id,file_name,s3_key,mime_type,file_size) VALUES ($1,$2,$3,$4,$5)",
    [f.customer_id, f.file_name, f.s3_key, f.mime_type, f.file_size],
  );
}

export async function listFiles(customerId: string): Promise<CustomerFile[]> {
  const p = await db();
  return (await p.query(
    "SELECT id::text, customer_id::text, file_name, s3_key, mime_type, file_size::int, created_at::text FROM customer_files WHERE customer_id=$1 ORDER BY created_at DESC",
    [customerId],
  )).rows;
}

export async function presignDownload(fileId: string) {
  const p = await db();
  const row = (await p.query("SELECT s3_key FROM customer_files WHERE id=$1", [fileId])).rows[0];
  if (!row) throw new Error("File not found");
  const { client, bucket } = await s3();
  const { GetObjectCommand } = await import("@aws-sdk/client-s3");
  const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner");
  return getSignedUrl(client, new GetObjectCommand({ Bucket: bucket, Key: row.s3_key }), { expiresIn: 300 });
}

export async function deleteFile(fileId: string) {
  const p = await db();
  const row = (await p.query("DELETE FROM customer_files WHERE id=$1 RETURNING s3_key", [fileId])).rows[0];
  if (!row) return;
  const { client, bucket } = await s3();
  const { DeleteObjectCommand } = await import("@aws-sdk/client-s3");
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: row.s3_key }));
}
