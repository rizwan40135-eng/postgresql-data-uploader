import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Customer Records" },
      { name: "description", content: "View and add customer records stored in the database." },
      { property: "og:title", content: "Customer Records" },
      { property: "og:description", content: "View and add customer records stored in the database." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

type Customer = {
  id: string;
  name: string;
  email: string;
  city: string | null;
  plan: string;
  created_at: string;
};

function Index() {
  const [rows, setRows] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: "", email: "", city: "", plan: "Basic" });
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const { data, error } = await supabase
      .from("customers")
      .select("id,name,email,city,plan,created_at")
      .order("created_at", { ascending: false });
    if (error) setError(error.message);
    setRows(data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const { error } = await supabase.from("customers").insert({
      name: form.name.trim(),
      email: form.email.trim(),
      city: form.city.trim() || null,
      plan: form.plan,
    });
    if (error) return setError(error.message);
    setForm({ name: "", email: "", city: "", plan: "Basic" });
    load();
  }

  async function remove(id: string) {
    await supabase.from("customers").delete().eq("id", id);
    load();
  }

  return (
    <main className="mx-auto max-w-4xl p-6 space-y-6">
      <header>
        <h1 className="text-3xl font-bold">Customer Records</h1>
        <p className="text-muted-foreground">{rows.length} records in the database</p>
      </header>

      <Card className="p-4">
        <form onSubmit={add} className="grid gap-3 sm:grid-cols-5">
          <Input required placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input required type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Input placeholder="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          <select
            className="h-9 rounded-md border border-input bg-background px-2 text-sm"
            value={form.plan}
            onChange={(e) => setForm({ ...form, plan: e.target.value })}
          >
            <option>Basic</option>
            <option>Pro</option>
            <option>Enterprise</option>
          </select>
          <Button type="submit">Add</Button>
        </form>
        {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
      </Card>

      <div className="space-y-2">
        {loading ? (
          <p className="text-muted-foreground">Loading…</p>
        ) : (
          rows.map((c) => (
            <Card key={c.id} className="flex items-center justify-between p-4">
              <div>
                <p className="font-medium">{c.name}</p>
                <p className="text-sm text-muted-foreground">
                  {c.email}{c.city ? ` · ${c.city}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{c.plan}</Badge>
                <Button size="sm" variant="ghost" onClick={() => remove(c.id)}>Delete</Button>
              </div>
            </Card>
          ))
        )}
      </div>
    </main>
  );
}
