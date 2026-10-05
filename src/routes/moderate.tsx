import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, CheckCircle2, XCircle, Send } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Textarea } from "@/components/ui/textarea";
import { analyze, highlight, label, riskToken, useSettings, type Result } from "@/lib/moderation";
import samples from "@/data/samples.json";

export const Route = createFileRoute("/moderate")({
  head: () => ({
    meta: [
      { title: "Analyze Content — SentinelAI" },
      { name: "description", content: "Paste text to get an instant risk score, category breakdown and explanation." },
      { property: "og:title", content: "Analyze Content — SentinelAI" },
      { property: "og:description", content: "Instant AI risk scoring with explainable results." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Moderate,
});

const tokenText: Record<string, string> = { safe: "text-safe", low: "text-low", medium: "text-medium", high: "text-high", critical: "text-critical" };
const tokenBg: Record<string, string> = { safe: "bg-safe", low: "bg-low", medium: "bg-medium", high: "bg-high", critical: "bg-critical" };

function Moderate() {
  const [settings] = useSettings();
  const [text, setText] = useState("");
  const [res, setRes] = useState<Result | null>(null);
  const [analyzed, setAnalyzed] = useState("");

  const run = () => {
    if (!text.trim()) return;
    setRes(analyze(text, settings));
    setAnalyzed(text);
  };

  const act = (a: string) => {
    if (!res) return;
    const queue = JSON.parse(localStorage.getItem("mod-queue") || "[]");
    queue.unshift({ id: `L${Date.now()}`, text: analyzed, risk: res.risk, confidence: res.confidence, label: res.top[0] ?? "safe", decision: res.decision, status: a === "review" ? "PENDING" : a.toUpperCase(), at: new Date().toISOString() });
    localStorage.setItem("mod-queue", JSON.stringify(queue));
    toast.success(a === "review" ? "Sent to the review queue" : `Content ${a}`);
  };

  return (
    <AppShell title="Analyze content" subtitle={`Text moderation · policy model ${settings.model}`}>
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-4 lg:col-span-2">
          <div className="glass p-5">
            <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste a comment, post or message…" className="min-h-48 resize-none border-0 bg-transparent text-base focus-visible:ring-0" maxLength={5000} />
            <div className="mt-3 flex items-center justify-between">
              <span className="font-mono text-xs text-muted-foreground">{text.length}/5000</span>
              <button onClick={run} disabled={!text.trim()} className="inline-flex items-center gap-2 rounded-lg bg-gradient-accent px-4 py-2 font-medium text-primary-foreground shadow-glow disabled:opacity-40">
                <Sparkles className="size-4" /> Analyze
              </button>
            </div>
          </div>
          <div className="glass p-5">
            <div className="mb-3 text-sm font-medium">Samples from your dataset</div>
            <div className="space-y-2">
              {[...samples.slice(0, 5), { text: "You're so pathetic, nobody likes you. I'll find you and hurt you.", label: "THREAT" }, { text: "CLICK HERE for free money!!! Limited offer, buy now www.win.biz", label: "SPAM" }].map((s) => (
                <button key={s.text} onClick={() => setText(s.text)} className="block w-full rounded-lg border border-border bg-secondary/40 px-3 py-2 text-left text-sm transition hover:border-primary/40">
                  <span className="mr-2 font-mono text-[10px] text-primary">{s.label}</span>{s.text}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-3">
          {!res ? (
            <div className="glass grid h-full min-h-96 place-items-center p-8 text-center text-muted-foreground">
              <div><Sparkles className="mx-auto mb-3 size-8 text-primary" />Results appear here: risk score, categories and why.</div>
            </div>
          ) : (
            <motion.div key={analyzed} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass space-y-6 p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="font-mono text-xs text-muted-foreground">DECISION</div>
                  <div className={`font-display text-2xl font-semibold ${tokenText[riskToken(res.risk)]}`}>{res.decision}</div>
                  <div className="text-sm text-muted-foreground">{res.level}</div>
                </div>
                <div className="flex gap-8">
                  <div><div className="text-xs text-muted-foreground">Risk score</div><div className={`font-display text-4xl font-semibold ${tokenText[riskToken(res.risk)]}`}>{res.risk}<span className="text-base text-muted-foreground">/100</span></div></div>
                  <div><div className="text-xs text-muted-foreground">Confidence</div><div className="font-display text-4xl font-semibold">{res.confidence}%</div></div>
                </div>
              </div>

              <div>
                <div className="mb-2 text-sm font-medium">Highlighted content</div>
                <p className="rounded-lg bg-secondary/50 p-4 text-sm leading-relaxed">
                  {highlight(analyzed, res.hits).map((p, i) => p.hit ? <mark key={i} className="rounded bg-critical/25 px-0.5 text-foreground">{p.t}</mark> : <span key={i}>{p.t}</span>)}
                </p>
              </div>

              <div>
                <div className="mb-3 text-sm font-medium">Category scores</div>
                <div className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
                  {Object.entries(res.scores).sort((a, b) => b[1] - a[1]).map(([c, v]) => (
                    <div key={c} className="flex items-center gap-3 text-sm">
                      <span className="w-28 truncate text-muted-foreground">{label(c)}</span>
                      <div className="h-1.5 flex-1 rounded-full bg-secondary"><motion.div initial={{ width: 0 }} animate={{ width: `${v}%` }} transition={{ duration: 0.8 }} className={`h-full rounded-full ${tokenBg[riskToken(v)]}`} /></div>
                      <span className="w-9 text-right font-mono text-xs">{v}%</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-primary/25 bg-primary/5 p-4">
                <div className="text-sm font-medium text-primary">Why was this flagged?</div>
                <p className="mt-1 text-sm text-muted-foreground">{res.explanation}</p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button onClick={() => act("approved")} className="inline-flex items-center gap-2 rounded-lg border border-safe/40 bg-safe/10 px-4 py-2 text-sm text-safe"><CheckCircle2 className="size-4" />Approve</button>
                <button onClick={() => act("rejected")} className="inline-flex items-center gap-2 rounded-lg border border-critical/40 bg-critical/10 px-4 py-2 text-sm text-critical"><XCircle className="size-4" />Reject</button>
                <button onClick={() => act("review")} className="inline-flex items-center gap-2 rounded-lg border border-border bg-secondary px-4 py-2 text-sm"><Send className="size-4" />Send to review</button>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
