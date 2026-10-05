import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { CATEGORIES, DEFAULT_SETTINGS, label, useSettings, type Settings } from "@/lib/moderation";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — SentinelAI" },
      { name: "description", content: "Configure moderation thresholds, category weights and word lists." },
      { property: "og:title", content: "Moderation Settings — SentinelAI" },
      { property: "og:description", content: "Tune the policy engine." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const [saved, save] = useSettings();
  const [s, setS] = useState<Settings>(saved);
  useEffect(() => setS(saved), [saved]);
  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => setS({ ...s, [k]: v });

  return (
    <AppShell title="Settings" subtitle="Policy engine configuration"
      action={<div className="flex gap-2">
        <button onClick={() => { save(DEFAULT_SETTINGS); toast("Reset to defaults"); }} className="glass px-4 py-2 text-sm">Reset</button>
        <button onClick={() => { save(s); toast.success("Settings saved"); }} className="rounded-lg bg-gradient-accent px-4 py-2 text-sm font-medium text-primary-foreground">Save changes</button>
      </div>}>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="glass space-y-6 p-6">
          <h3 className="font-medium">Decision thresholds</h3>
          {([["approveBelow", "Auto-approve below"], ["reviewAt", "Human review from"], ["rejectAt", "Auto-reject from"]] as const).map(([k, l]) => (
            <div key={k}>
              <div className="mb-2 flex justify-between text-sm"><span>{l}</span><span className="font-mono">{s[k]}</span></div>
              <Slider value={[s[k]]} min={0} max={100} step={1} onValueChange={([v]) => set(k, v)} />
            </div>
          ))}
          <div>
            <div className="mb-2 text-sm">Model</div>
            <select value={s.model} onChange={(e) => set("model", e.target.value)} className="w-full rounded-lg border border-input bg-secondary px-3 py-2 text-sm">
              {["RoBERTa v1.0", "DeBERTa v3", "DistilBERT v2"].map((m) => <option key={m}>{m}</option>)}
            </select>
          </div>
        </div>
        <div className="glass space-y-4 p-6">
          <h3 className="font-medium">Category risk weights</h3>
          {CATEGORIES.map((c) => (
            <div key={c} className="flex items-center gap-4">
              <span className="w-32 text-sm text-muted-foreground">{label(c)}</span>
              <Slider className="flex-1" value={[s.weights[c]]} min={0} max={2} step={0.1} onValueChange={([v]) => set("weights", { ...s.weights, [c]: v })} />
              <span className="w-8 text-right font-mono text-xs">{s.weights[c].toFixed(1)}</span>
            </div>
          ))}
        </div>
        {([["blocked", "Blocked words — always critical"], ["allowed", "Allowed phrases — ignored"]] as const).map(([k, l]) => (
          <div key={k} className="glass p-6">
            <h3 className="mb-3 font-medium">{l}</h3>
            <Textarea value={s[k].join("\n")} onChange={(e) => set(k, e.target.value.split("\n").map((x) => x.trim()).filter(Boolean))} className="min-h-32 font-mono text-sm" placeholder="One per line" />
          </div>
        ))}
      </div>
    </AppShell>
  );
}
