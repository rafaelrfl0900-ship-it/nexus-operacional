export function PageHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="mb-6 flex flex-col gap-2">
      <p className="text-xs uppercase text-cyan-200/80">NEXUS OPERACIONAL</p>
      <h2 className="text-3xl font-semibold">{title}</h2>
      <p className="max-w-3xl text-sm text-slate-400">{description}</p>
    </div>
  );
}
