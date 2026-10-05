import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppShell, RiskBadge } from "@/components/AppShell";
import { Textarea } from "@/components/ui/textarea";
import { label } from "@/lib/moderation";
import history from "@/data/history.json";

export const Route = createFileRoute("/review")({
  head: () => ({
    meta: [
      { title: "Review Queue — SentinelAI" },
      { name: "description", content: "Human-in-the-loop review of AI moderation decisions." },
      { property: "og:title", content: "Review Queue — SentinelAI" },
      { property: "og:description", content: "Approve, reject, escalate or correct AI decisions." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Review,
});

interface Item { id: string; text: string; risk: number; confidence: number; label: string; decision: string; status: string; at: string; note?: string }

const seed: Item[] = history.filter((h) => h.risk_score >= 45).slice(0, 12).map((h) => ({
  id: h.moderation_id, text: `${label(h.content_type)} submission ${h.content_id} from user ${h.user_id}`, risk: h.risk_score, confidence: h.confidence,
  label: h.ai_label, decision: h.ai_decision, status: "PENDING", at: h.timestamp,
}));

const ACTIONS = [["APPROVED", "Approve", "border-safe/40 bg-safe/10 text-safe"], ["REJECTED", "Reject", "border-critical/40 bg-critical/10 text-critical"], ["ESCALATED", "Escalate", "border-high/40 bg-high/10 text-high"], ["FALSE POSITIVE", "False positive", "border-border bg-secondary"], ["FALSE NEGATIVE", "False negative", "border-border bg-secondary"]] as const;

function Review() {
  const [items, setItems] = useState<Item[]>(seed);
  const [sel, setSel] = useState<string | null>(null);
  const [note, setNote] = useState("");

  useEffect(() => {
    const local: Item[] = JSON.parse(localStorage.getItem("mod-queue") || "[]");
    const done: Record<string, Item> = JSON.parse(localStorage.getItem("mod-done") || "{}");
    setItems([...local, ...seed].map((i) => done[i.id] ?? i));
  }, []);

  const pending = items.filter((i) => i.status === "PENDING");
  const cur = items.find((i) => i.id === sel) ?? pending[0];

  const decide = (status: string) => {
    if (!cur) return;
    const updated = { ...cur, status, note };
    const done = JSON.parse(localStorage.getItem("mod-done") || "{}");
    done[cur.id] = updated;
    localStorage.setItem("mod-done", JSON.stringify(done));
    setItems((xs) => xs.map((x) => (x.id === cur.id ? updated : x)));
    setNote(""); setSel(null);
    toast.success(`Marked ${status.toLowerCase()} — logged for audit`);
  };

  return (
    <AppShell title="Review queue" subtitle={`${pending.length} items awaiting a human decision`}>
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="glass divide-y divide-border lg:col-span-2">
          {items.map((i) => (
            <button key={i.id} onClick={() => setSel(i.id)} className={`flex w-full items-center gap-3 p-4 text-left transition hover:bg-secondary/50 ${cur?.id === i.id ? "bg-secondary/60" : ""}`}>
              <RiskBadge risk={i.risk} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm">{i.text}</div>
                <div className="font-mono text-[11px] text-muted-foreground">{label(i.label)} · {i.id}</div>
              </div>
              <span className={`font-mono text-[10px] ${i.status === "PENDING" ? "text-accent" : "text-muted-foreground"}`}>{i.status}</span>
            </button>
          ))}
        </div>
        <div className="lg:col-span-3">
          {cur ? (
            <div className="glass space-y-5 p-6">
              <div className="font-mono text-xs text-muted-foreground">{cur.id} · {new Date(cur.at).toLocaleString()}</div>
              <p className="rounded-lg bg-secondary/50 p-4">{cur.text}</p>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {[["AI prediction", label(cur.label)], ["AI decision", label(cur.decision)], ["Risk score", cur.risk], ["Confidence", `${cur.confidence}%`]].map(([k, v]) => (
                  <div key={k as string}><div className="text-xs text-muted-foreground">{k}</div><div className="font-display text-lg font-medium">{v}</div></div>
                ))}
              </div>
              <div className="rounded-lg border border-primary/25 bg-primary/5 p-4 text-sm text-muted-foreground">
                <span className="font-medium text-primary">AI explanation: </span>Patterns associated with {label(cur.label).toLowerCase()} scored {cur.risk}/100 at {cur.confidence}% confidence.
              </div>
              {cur.status !== "PENDING" && <div className="text-sm">Previous decision: <b>{cur.status}</b>{cur.note && <> — “{cur.note}”</>}</div>}
              <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Moderator notes (optional)" maxLength={1000} />
              <div className="flex flex-wrap gap-2">
                {ACTIONS.map(([s, l, c]) => <button key={s} onClick={() => decide(s)} className={`rounded-lg border px-4 py-2 text-sm ${c}`}>{l}</button>)}
              </div>
            </div>
          ) : <div className="glass p-10 text-center text-muted-foreground">Queue is clear.</div>}
        </div>
      </div>
    </AppShell>
  );
}
