// Server-only data layer.
// If DATABASE_URL is set (e.g. EC2 + AWS RDS) -> pure PostgreSQL via `pg`, auto-migrates. No Supabase code runs.
// If not set (Lovable preview) -> falls back to Lovable Cloud.
import type { Pool } from "pg";

export type Customer = {
  id: string;
  name: string;
  email: string;
  city: string | null;
  plan: string;
  created_at: string;
};
export type NewCustomer = { name: string; email: string; city: string | null; plan: string };

let pool: Pool | null = null;
let migrated: Promise<void> | null = null;

const MIGRATION = `
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  city TEXT,
  plan TEXT NOT NULL DEFAULT 'Basic',
  extra JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO customers (name, email, city, plan)
SELECT * FROM (VALUES
  ('Aarav Sharma','aarav@example.com','Mumbai','Pro'),
  ('Priya Patel','priya@example.com','Ahmedabad','Basic'),
  ('Rohan Gupta','rohan@example.com','Delhi','Enterprise'),
  ('Ananya Iyer','ananya@example.com','Chennai','Pro'),
  ('Vikram Singh','vikram@example.com','Jaipur','Basic')
) AS v(name,email,city,plan)
WHERE NOT EXISTS (SELECT 1 FROM customers);
`;

async function getPool(url: string) {
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

const COLS = "id::text, name, email, city, plan, created_at::text";

export async function listCustomers(): Promise<Customer[]> {
  const url = process.env["DATABASE_URL"];
  if (url) {
    const p = await getPool(url);
    return (await p.query(`SELECT ${COLS} FROM customers ORDER BY created_at DESC`)).rows;
  }
  const { supabase } = await import("@/integrations/supabase/client");
  const { data, error } = await supabase.from("customers").select("id,name,email,city,plan,created_at").order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function insertCustomer(c: NewCustomer) {
  const url = process.env["DATABASE_URL"];
  if (url) {
    const p = await getPool(url);
    await p.query("INSERT INTO customers (name,email,city,plan) VALUES ($1,$2,$3,$4)", [c.name, c.email, c.city, c.plan]);
    return;
  }
  const { supabase } = await import("@/integrations/supabase/client");
  const { error } = await supabase.from("customers").insert(c);
  if (error) throw new Error(error.message);
}

export async function removeCustomer(id: string) {
  const url = process.env["DATABASE_URL"];
  if (url) {
    const p = await getPool(url);
    await p.query("DELETE FROM customers WHERE id = $1", [id]);
    return;
  }
  const { supabase } = await import("@/integrations/supabase/client");
  const { error } = await supabase.from("customers").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
