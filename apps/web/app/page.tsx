"use client";

import Link from "next/link";
import { navigation, NavigationRole } from "@/lib/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { getSession } from "@/services/api";

export default function HomePage() {
  const user = getSession()?.user;
  const visibleNavigation = navigation.filter((item) => user?.roles.some((role) => item.roles.includes(role as NavigationRole)));

  return (
    <div>
      <PageHeader
        title="Menu principal"
        description="Centro de comando para lancamentos diarios, controle semanal, historico permanente, dashboards e reunioes executivas."
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {visibleNavigation.slice(1).map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} className="group rounded-lg border border-[var(--line)] bg-[var(--panel)] p-5 shadow-2xl shadow-black/20 transition hover:border-cyan-200/50 hover:bg-cyan-300/10">
              <Icon className="mb-5 size-6 text-cyan-200" />
              <h2 className="text-lg font-semibold">{item.label}</h2>
              <p className="mt-2 text-sm text-slate-400">Abrir modulo operacional</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
