import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from "recharts";
import { AppShell } from "@/components/AppShell";
import { label, riskLevel } from "@/lib/moderation";
import history from "@/data/history.json";
import models from "@/data/models.json";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — SentinelAI" },
      { name: "description", content: "Moderation volume, risk distribution, category breakdown and model performance." },
      { property: "og:title", content: "Moderation Dashboard — SentinelAI" },
      { property: "og:description", content: "Live overview of AI and human moderation activity." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Dashboard,
});

type H = (typeof history)[number];
const RANGES = { today: 1, "2d": 2, all: 99 } as const;
const COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)", "var(--medium)", "var(--high)", "var(--safe)", "var(--muted-foreground)"];
const tip = { contentStyle: { background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--foreground)" } };

function Dashboard() {
  const [range, setRange] = useState<keyof typeof RANGES>("all");
  const data = useMemo(() => {
    const max = Math.max(...history.map((h) => +new Date(h.timestamp)));
    return (history as H[]).filter((h) => max - +new Date(h.timestamp) < RANGES[range] * 86400000);
  }, [range]);

  const count = (f: (h: H) => boolean) => data.filter(f).length;
  const fp = count((h) => h.ai_decision !== "APPROVED" && h.human_decision === "APPROVED");
  const flaggedByAi = count((h) => h.ai_decision !== "APPROVED");
  const cards = [
    ["Total analyzed", data.length],
    ["Approved", count((h) => h.ai_decision === "APPROVED")],
    ["Flagged", count((h) => h.ai_decision === "FLAGGED")],
    ["Rejected", count((h) => h.ai_decision === "REJECTED")],
    ["Quarantined", count((h) => h.ai_decision === "QUARANTINED")],
    ["High risk (61+)", count((h) => h.risk_score > 60)],
    ["Avg. confidence", `${Math.round(data.reduce((a, h) => a + h.confidence, 0) / (data.length || 1))}%`],
    ["False-positive rate", `${Math.round((fp / (flaggedByAi || 1)) * 100)}%`],
  ];

  const byHour = useMemo(() => {
    const m = new Map<string, { t: string; approved: number; flagged: number; rejected: number }>();
    for (const h of data) {
      const k = h.timestamp.slice(5, 13).replace(" ", " ") + "h";
      const r = m.get(k) ?? { t: k, approved: 0, flagged: 0, rejected: 0 };
      if (h.ai_decision === "APPROVED") r.approved++; else if (h.ai_decision === "FLAGGED") r.flagged++; else r.rejected++;
      m.set(k, r);
    }
    const arr = [...m.values()].sort((a, b) => a.t.localeCompare(b.t));
    const step = Math.ceil(arr.length / 24);
    return arr.reduce<typeof arr>((acc, r, i) => { if (i % step === 0) acc.push({ ...r }); else { const l = acc[acc.length - 1]; l.approved += r.approved; l.flagged += r.flagged; l.rejected += r.rejected; } return acc; }, []);
  }, [data]);

  const group = (f: (h: H) => string) => Object.entries(data.reduce<Record<string, number>>((a, h) => { const k = f(h); a[k] = (a[k] || 0) + 1; return a; }, {})).map(([name, value]) => ({ name, value }));
  const cats = group((h) => label(h.ai_label)).sort((a, b) => b.value - a.value);
  const levels = ["Safe", "Low Risk", "Medium Risk", "High Risk", "Critical"].map((l) => ({ name: l, value: count((h) => riskLevel(h.risk_score) === l) }));
  const types = group((h) => label(h.content_type));
  const conf = [50, 60, 70, 80, 90].map((b) => ({ name: `${b}–${b + 9}`, value: count((h) => h.confidence >= b && h.confidence < b + 10) }));
  const hva = ["APPROVED", "FLAGGED", "REJECTED", "QUARANTINED"].map((d) => ({ name: label(d), AI: count((h) => h.ai_decision === d), Human: count((h) => h.human_decision === d) }));
  const agree = Math.round((count((h) => h.ai_decision === h.human_decision) / (data.length || 1)) * 100);

  return (
    <AppShell title="Dashboard" subtitle="Based on your uploaded moderation history"
      action={
        <div className="glass flex p-1 text-sm">
          {(Object.keys(RANGES) as (keyof typeof RANGES)[]).map((r) => (
            <button key={r} onClick={() => setRange(r)} className={`rounded-md px-3 py-1.5 ${range === r ? "bg-secondary text-foreground" : "text-muted-foreground"}`}>
              {r === "today" ? "Last 24h" : r === "2d" ? "48h" : "All time"}
            </button>
          ))}
        </div>
      }>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {cards.map(([l, v]) => (
          <div key={l} className="glass p-5">
            <div className="text-xs text-muted-foreground">{l}</div>
            <div className="mt-1 font-display text-3xl font-semibold">{v}</div>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Panel title="Moderation activity over time" className="lg:col-span-2">
          <ResponsiveContainer height={280}>
            <AreaChart data={byHour}>
              <CartesianGrid stroke="var(--border)" vertical={false} />
              <XAxis dataKey="t" stroke="var(--muted-foreground)" fontSize={10} />
              <YAxis stroke="var(--muted-foreground)" fontSize={11} />
              <Tooltip {...tip} /><Legend />
              <Area dataKey="approved" stackId="1" stroke="var(--safe)" fill="var(--safe)" fillOpacity={0.25} />
              <Area dataKey="flagged" stackId="1" stroke="var(--medium)" fill="var(--medium)" fillOpacity={0.25} />
              <Area dataKey="rejected" stackId="1" stroke="var(--critical)" fill="var(--critical)" fillOpacity={0.25} />
            </AreaChart>
          </ResponsiveContainer>
        </Panel>
        <Panel title="Risk-level distribution">
          <ResponsiveContainer height={280}>
            <PieChart>
              <Pie data={levels} dataKey="value" nameKey="name" innerRadius={60} outerRadius={100} paddingAngle={2}>
                {["var(--safe)", "var(--low)", "var(--medium)", "var(--high)", "var(--critical)"].map((c) => <Cell key={c} fill={c} stroke="none" />)}
              </Pie>
              <Tooltip {...tip} /><Legend />
            </PieChart>
          </ResponsiveContainer>
        </Panel>
        <Panel title="Category distribution" className="lg:col-span-2">
          <ResponsiveContainer height={260}>
            <BarChart data={cats}>
              <CartesianGrid stroke="var(--border)" vertical={false} />
              <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={11} />
              <YAxis stroke="var(--muted-foreground)" fontSize={11} />
              <Tooltip {...tip} cursor={{ fill: "var(--secondary)" }} />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>{cats.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Bar>
            </BarChart>
          </ResponsiveContainer>
        </Panel>
        <Panel title="Content types">
          <ResponsiveContainer height={260}>
            <PieChart><Pie data={types} dataKey="value" nameKey="name" outerRadius={90}>{types.map((_, i) => <Cell key={i} fill={COLORS[i]} stroke="none" />)}</Pie><Tooltip {...tip} /><Legend /></PieChart>
          </ResponsiveContainer>
        </Panel>
        <Panel title={`Human vs AI decisions · ${agree}% agreement`} className="lg:col-span-2">
          <ResponsiveContainer height={260}>
            <BarChart data={hva}>
              <CartesianGrid stroke="var(--border)" vertical={false} />
              <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={11} />
              <YAxis stroke="var(--muted-foreground)" fontSize={11} />
              <Tooltip {...tip} cursor={{ fill: "var(--secondary)" }} /><Legend />
              <Bar dataKey="AI" fill="var(--chart-1)" radius={[6, 6, 0, 0]} />
              <Bar dataKey="Human" fill="var(--chart-2)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>
        <Panel title="AI confidence">
          <ResponsiveContainer height={260}>
            <BarChart data={conf}><XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={11} /><Tooltip {...tip} cursor={{ fill: "var(--secondary)" }} /><Bar dataKey="value" fill="var(--chart-5)" radius={[6, 6, 0, 0]} /></BarChart>
          </ResponsiveContainer>
        </Panel>
      </div>

      <Panel title="Model performance" className="mt-6">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-muted-foreground"><tr>{["Model", "Version", "Category", "Accuracy", "Precision", "Recall", "F1", "FPR"].map((h) => <th key={h} className="pb-3 font-normal">{h}</th>)}</tr></thead>
            <tbody className="font-mono">
              {models.map((m) => (
                <tr key={m.category} className="border-t border-border">
                  <td className="py-2 font-sans">{m.model_name}</td><td>{m.version}</td><td className="font-sans">{m.category}</td>
                  <td>{m.accuracy}</td><td>{m.precision}</td><td>{m.recall}</td><td>{m.f1_score}</td><td>{m.false_positive_rate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </AppShell>
  );
}

function Panel({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return <div className={`glass p-5 ${className}`}><div className="mb-4 text-sm font-medium">{title}</div>{children}</div>;
}
