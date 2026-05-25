"use client";

import { Factory } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { apiPostClient, saveSession, SessionData } from "@/services/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@nexus.local");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const session = await apiPostClient<SessionData>("/auth/login", { email, password });
      saveSession(session);
      router.push("/dashboard");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Nao foi possivel iniciar a sessao.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="grid min-h-screen place-items-center bg-[#070b12] px-4">
      <Card className="w-full max-w-md">
        <div className="mb-8 flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-lg border border-cyan-300/30 bg-cyan-300/10">
            <Factory className="size-5 text-cyan-200" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">NEXUS OPERACIONAL</h1>
            <p className="text-sm text-slate-400">Sessao segura</p>
          </div>
        </div>
        <form className="space-y-4" onSubmit={submit}>
          <label className="block space-y-2">
            <span className="text-xs uppercase text-slate-400">Email</span>
            <input className="w-full rounded-md border border-[var(--line)] bg-white/5 px-3 py-2 outline-none focus:border-cyan-300/60" value={email} onChange={(event) => setEmail(event.target.value)} />
          </label>
          <label className="block space-y-2">
            <span className="text-xs uppercase text-slate-400">Senha</span>
            <input type="password" className="w-full rounded-md border border-[var(--line)] bg-white/5 px-3 py-2 outline-none focus:border-cyan-300/60" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Senha do usuario" />
          </label>
          {error ? <p className="rounded-md border border-rose-300/30 bg-rose-300/10 px-3 py-2 text-sm text-rose-100">{error}</p> : null}
          <Button className="w-full" type="submit" disabled={loading}>
            {loading ? "Validando..." : "Entrar"}
          </Button>
        </form>
      </Card>
    </section>
  );
}
