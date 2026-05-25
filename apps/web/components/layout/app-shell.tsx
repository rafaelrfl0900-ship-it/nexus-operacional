"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Factory, LogOut, Search, UserCircle2 } from "lucide-react";
import { navigation } from "@/lib/navigation";
import { cn } from "@/lib/format";
import { clearSession, getSession, SessionUser } from "@/services/api";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLogin = pathname === "/login";
  const [user, setUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    setUser(getSession()?.user ?? null);
  }, [pathname]);

  function logout() {
    clearSession();
    setUser(null);
    window.location.href = "/login";
  }

  if (isLogin) {
    return <main>{children}</main>;
  }

  return (
    <div className="min-h-screen nexus-grid">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-72 border-r border-[var(--line)] bg-[#07101d]/90 px-4 py-5 backdrop-blur-xl lg:block">
        <Link href="/" className="mb-7 flex items-center gap-3 px-2">
          <div className="grid size-10 place-items-center rounded-lg border border-cyan-300/30 bg-cyan-300/10">
            <Factory className="size-5 text-cyan-200" />
          </div>
          <div>
            <div className="text-sm font-semibold tracking-wide">NEXUS</div>
            <div className="text-xs uppercase text-slate-400">Operacional</div>
          </div>
        </Link>
        <nav className="nexus-scrollbar flex max-h-[calc(100vh-120px)] flex-col gap-1 overflow-y-auto pr-1">
          {navigation.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm text-slate-300 transition",
                  active && "bg-cyan-300/[0.12] text-white ring-1 ring-cyan-200/20",
                  !active && "hover:bg-white/[0.06] hover:text-white"
                )}
              >
                <Icon className="size-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-10 border-b border-[var(--line)] bg-[#07101d]/72 px-4 py-3 backdrop-blur-xl lg:px-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase text-cyan-200/80">Centro de comando industrial</p>
              <h1 className="text-lg font-semibold">NEXUS OPERACIONAL</h1>
            </div>
            <div className="hidden min-w-80 items-center gap-2 rounded-md border border-[var(--line)] bg-white/5 px-3 py-2 text-sm text-slate-400 md:flex">
              <Search className="size-4" />
              <span>Buscar por semana, produto, OP, setor ou motivo</span>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/login" className="hidden items-center gap-2 rounded-md border border-[var(--line)] bg-white/5 px-3 py-2 text-sm text-slate-300 md:flex">
                <UserCircle2 className="size-4" />
                <span>{user ? user.name : "Entrar"}</span>
              </Link>
              {user ? (
                <button type="button" onClick={logout} className="grid size-9 place-items-center rounded-md border border-[var(--line)] bg-white/5 text-slate-300 transition hover:text-white" aria-label="Sair">
                  <LogOut className="size-4" />
                </button>
              ) : null}
            </div>
          </div>
        </header>
        <main className="px-4 py-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
