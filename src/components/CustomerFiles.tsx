import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getUploadUrl, recordFile, getFiles, getDownloadUrl, removeFile } from "@/lib/files.functions";
import { Button } from "@/components/ui/button";

type F = { id: string; file_name: string; file_size: number };

export function CustomerFiles({ customerId }: { customerId: string }) {
  const [files, setFiles] = useState<F[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sign = useServerFn(getUploadUrl);
  const record = useServerFn(recordFile);
  const list = useServerFn(getFiles);
  const dl = useServerFn(getDownloadUrl);
  const del = useServerFn(removeFile);

  async function load() {
    try { setFiles(await list({ data: { customerId } })); } catch (e) { setError((e as Error).message); }
  }
  useEffect(() => { load(); }, [customerId]);

  async function upload(file: File) {
    setBusy(true); setError(null);
    try {
      const mimeType = file.type || "application/octet-stream";
      const { url, key } = await sign({ data: { customerId, fileName: file.name, mimeType } });
      const res = await fetch(url, { method: "PUT", body: file, headers: { "Content-Type": mimeType } });
      if (!res.ok) throw new Error(`S3 upload failed [${res.status}]`);
      await record({ data: { customer_id: customerId, file_name: file.name, s3_key: key, mime_type: mimeType, file_size: file.size } });
      await load();
    } catch (e) { setError((e as Error).message); }
    setBusy(false);
  }

  return (
    <div className="mt-3 space-y-2 border-t pt-3">
      <input type="file" disabled={busy} onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }} className="text-sm" />
      {busy && <p className="text-sm text-muted-foreground">Uploading…</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}
      {files.map((f) => (
        <div key={f.id} className="flex items-center justify-between text-sm">
          <span>{f.file_name} · {(f.file_size / 1024).toFixed(1)} KB</span>
          <div className="flex gap-1">
            <Button size="sm" variant="outline" onClick={async () => window.open(await dl({ data: { fileId: f.id } }), "_blank")}>Open</Button>
            <Button size="sm" variant="ghost" onClick={async () => { await del({ data: { fileId: f.id } }); load(); }}>Remove</Button>
          </div>
        </div>
      ))}
    </div>
  );
}
