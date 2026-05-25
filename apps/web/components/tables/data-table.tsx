import { Card } from "@/components/ui/card";

export function DataTable<T extends Record<string, React.ReactNode>>({ title, rows }: { title: string; rows: T[] }) {
  const headers = rows[0] ? Object.keys(rows[0]) : [];
  return (
    <Card className="overflow-hidden p-0">
      <div className="border-b border-[var(--line)] px-5 py-4">
        <h2 className="font-semibold">{title}</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead className="bg-white/5 text-left text-xs uppercase text-slate-400">
            <tr>
              {headers.map((header) => (
                <th key={header} className="px-4 py-3 font-medium">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={index} className="border-t border-[var(--line)] hover:bg-white/[0.03]">
                {headers.map((header) => (
                  <td key={header} className="px-4 py-3 text-slate-200">
                    {row[header]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
