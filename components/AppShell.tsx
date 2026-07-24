"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, Users, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

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

function Wordmark() {
  return (
    <div className="flex items-baseline gap-2.5">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo_acid_tight.png" alt="ACID" className="h-6 w-auto" />
      <span className="font-display text-lg leading-none uppercase tracking-[0.18em] font-light">
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
        className="w-full text-xs px-3 py-2 rounded-lg border border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground transition-colors"
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
            ? "bg-neutral-900 text-white"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
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
      <aside className="hidden md:flex md:flex-col md:fixed md:inset-y-0 md:left-0 md:w-60 border-r border-border bg-card px-4 py-5">
        <div className="px-2">
          <Wordmark />
        </div>
        <nav className="flex flex-col gap-1 mt-8">{NAV.map((i) => navLink(i))}</nav>
        <div className="mt-auto pt-4 space-y-2">
          <div className="px-2 text-[11px] text-muted-foreground truncate" title={userEmail}>
            {userEmail}
          </div>
          <SignOut />
        </div>
      </aside>

      {/* Top bar — mobile */}
      <header className="md:hidden sticky top-0 z-20 bg-card border-b border-border">
        <div className="flex items-center justify-between px-4 h-14">
          <Wordmark />
          <SignOut className="w-auto" />
        </div>
        <nav className="flex gap-1 px-3 pb-2 overflow-x-auto">
          {NAV.map((i) => navLink(i, true))}
        </nav>
      </header>

      {/* Content */}
      <div className="md:pl-60">
        <div className="max-w-5xl mx-auto px-5 py-6 md:py-8">{children}</div>
      </div>
    </div>
  );
}
