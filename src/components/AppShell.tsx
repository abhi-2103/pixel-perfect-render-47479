import { Link } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";

const NAV = [
  { to: "/moderate", label: "Analyze" },
  { to: "/dashboard", label: "Dashboard" },
  { to: "/review", label: "Review Queue" },
  { to: "/settings", label: "Settings" },
] as const;

export function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2 font-display font-semibold">
      <span className="grid size-8 place-items-center rounded-lg bg-gradient-accent text-primary-foreground shadow-glow">
        <ShieldCheck className="size-4" />
      </span>
      <span>Sentinel<span className="text-primary">AI</span></span>
    </Link>
  );
}

export function TopNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4">
        <Logo />
        <nav className="flex items-center gap-1 overflow-x-auto text-sm">
          {NAV.map((n) => (
            <Link key={n.to} to={n.to} className="rounded-md px-3 py-1.5 text-muted-foreground transition hover:text-foreground"
              activeProps={{ className: "bg-secondary !text-foreground" }}>
              {n.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}

export function AppShell({ title, subtitle, children, action }: { title: string; subtitle?: string; children: ReactNode; action?: ReactNode }) {
  return (
    <div className="min-h-screen">
      <TopNav />
      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold">{title}</h1>
            {subtitle && <p className="mt-1 text-muted-foreground">{subtitle}</p>}
          </div>
          {action}
        </div>
        {children}
      </main>
    </div>
  );
}

export function RiskBadge({ risk }: { risk: number }) {
  const t = risk <= 20 ? "text-safe border-safe/40 bg-safe/10" : risk <= 40 ? "text-low border-low/40 bg-low/10" : risk <= 60 ? "text-medium border-medium/40 bg-medium/10" : risk <= 80 ? "text-high border-high/40 bg-high/10" : "text-critical border-critical/40 bg-critical/10";
  return <span className={`inline-flex rounded-full border px-2 py-0.5 font-mono text-xs ${t}`}>{risk}</span>;
}
