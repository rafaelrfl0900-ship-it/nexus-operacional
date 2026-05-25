import { cn } from "@/lib/format";

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <section className={cn("rounded-lg border border-[var(--line)] bg-[var(--panel)] p-5 shadow-2xl shadow-black/20 backdrop-blur-xl", className)}>
      {children}
    </section>
  );
}

export function StatCard({ label, value, hint, status }: { label: string; value: string; hint?: string; status?: string }) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-slate-400">{label}</p>
          <strong className="mt-2 block text-2xl">{value}</strong>
        </div>
        {status ? <StatusBadge status={status} /> : null}
      </div>
      {hint ? <p className="mt-4 text-xs text-slate-400">{hint}</p> : null}
    </Card>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const color =
    status === "OK"
      ? "border-emerald-300/30 bg-emerald-300/10 text-emerald-200"
      : status === "CRITICAL"
        ? "border-rose-300/30 bg-rose-300/10 text-rose-200"
        : "border-amber-300/30 bg-amber-300/10 text-amber-200";
  return <span className={cn("rounded-md border px-2 py-1 text-xs font-medium", color)}>{status}</span>;
}
