"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, Users, ShieldCheck, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePerfil } from "@/components/PerfilProvider";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  match: (path: string) => boolean;
};

const NAV: NavItem[] = [
  {
    href: "/",
    label: "Clientes",
    icon: LayoutGrid,
    match: (p) => p === "/" || p.startsWith("/clientes"),
  },
  { href: "/time", label: "Time", icon: Users, match: (p) => p.startsWith("/time") },
];

const NAV_MASTER: NavItem = {
  href: "/usuarios",
  label: "Usuários",
  icon: ShieldCheck,
  match: (p) => p.startsWith("/usuarios"),
};

function Wordmark() {
  return (
    <div className="flex items-baseline gap-2.5">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo_acid_tight.png" alt="ACID" className="h-6 w-auto" />
      <span className="font-display text-lg leading-none uppercase tracking-[0.18em] font-light text-white">
        Finance
      </span>
    </div>
  );
}

function SignOut({ className }: { className?: string }) {
  return (
    <form action="/auth/signout" method="post" className={className}>
      <button
        type="submit"
        className="w-full text-xs px-3 py-2 rounded-lg border border-neutral-700 text-neutral-400 hover:border-neutral-500 hover:text-white transition-colors"
      >
        Sair
      </button>
    </form>
  );
}

export function AppShell({
  children,
  userEmail,
}: {
  children: React.ReactNode;
  userEmail: string;
}) {
  const pathname = usePathname() ?? "/";
  const { isMaster } = usePerfil();
  const navItems = isMaster ? [...NAV, NAV_MASTER] : NAV;

  const navLink = (item: NavItem, mobile = false) => {
    const active = item.match(pathname);
    const Icon = item.icon;
    return (
      <Link
        key={item.href}
        href={item.href}
        className={cn(
          "flex items-center gap-3 rounded-xl text-sm font-medium transition-colors",
          mobile ? "px-3 h-10" : "px-3 h-11",
          active
            ? "bg-white/10 text-white"
            : "text-neutral-400 hover:bg-white/5 hover:text-white"
        )}
      >
        <Icon className={cn("h-[18px] w-[18px] shrink-0", active && "text-acid")} />
        {item.label}
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Sidebar / dock — desktop */}
      <aside className="hidden md:flex md:flex-col md:fixed md:inset-y-0 md:left-0 md:w-60 border-r border-neutral-800 bg-neutral-950 px-4 py-5">
        <div className="px-2">
          <Wordmark />
        </div>
        <nav className="flex flex-col gap-1 mt-8">{navItems.map((i) => navLink(i))}</nav>
        <div className="mt-auto pt-4 space-y-2">
          <div className="px-2 text-[11px] text-neutral-500 truncate" title={userEmail}>
            {userEmail}
          </div>
          <SignOut />
        </div>
      </aside>

      {/* Top bar — mobile */}
      <header className="md:hidden sticky top-0 z-20 bg-neutral-950 border-b border-neutral-800">
        <div className="flex items-center justify-between px-4 h-14">
          <Wordmark />
          <SignOut className="w-auto" />
        </div>
        <nav className="flex gap-1 px-3 pb-2 overflow-x-auto">
          {navItems.map((i) => navLink(i, true))}
        </nav>
      </header>

      {/* Content */}
      <div className="md:pl-60">
        <div className="max-w-5xl mx-auto px-5 py-6 md:py-8">{children}</div>
      </div>
    </div>
  );
}
