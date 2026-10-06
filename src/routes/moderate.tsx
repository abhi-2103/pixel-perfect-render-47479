import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, CheckCircle2, XCircle, Send, Type, ImageIcon, Video, Mic, Square, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/AppShell";
import { Textarea } from "@/components/ui/textarea";
import { fromAi, highlight, label, riskToken, useSettings, type Result } from "@/lib/moderation";
import { aiModerate, type ModInput } from "@/lib/ai-moderation.functions";
import { blobToBase64, fileToDataUrl, resizeImage, videoFrames } from "@/lib/media";
import samples from "@/data/samples.json";

export const Route = createFileRoute("/moderate")({
  head: () => ({
    meta: [
      { title: "Analyze Content — SentinelAI" },
      { name: "description", content: "Analyze text, images, video and voice for a risk score, category breakdown and explanation." },
      { property: "og:title", content: "Analyze Content — SentinelAI" },
      { property: "og:description", content: "AI risk scoring for text, image, video and voice." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Moderate,
});

const tokenText: Record<string, string> = { safe: "text-safe", low: "text-low", medium: "text-medium", high: "text-high", critical: "text-critical" };
const tokenBg: Record<string, string> = { safe: "bg-safe", low: "bg-low", medium: "bg-medium", high: "bg-high", critical: "bg-critical" };
type Kind = "text" | "image" | "video" | "voice";
const TABS: { k: Kind; l: string; I: typeof Type }[] = [
  { k: "text", l: "Text", I: Type }, { k: "image", l: "Image", I: ImageIcon }, { k: "video", l: "Video", I: Video }, { k: "voice", l: "Voice", I: Mic },
];

function Moderate() {
  const [settings] = useSettings();
  const run$ = useServerFn(aiModerate);
  const [kind, setKind] = useState<Kind>("text");
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>("");
  const [recording, setRecording] = useState(false);
  const rec = useRef<MediaRecorder | null>(null);
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<Result | null>(null);
  const [analyzed, setAnalyzed] = useState("");
  const [frames, setFrames] = useState<string[]>([]);

  const pick = (f: File | null) => { setFile(f); setPreview(f ? URL.createObjectURL(f) : ""); setRes(null); };
  const switchKind = (k: Kind) => { setKind(k); pick(null); };

  const startRec = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      mr.ondataavailable = (e) => chunks.push(e.data);
      mr.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const type = mr.mimeType || "audio/webm";
        pick(new File([new Blob(chunks, { type })], `recording.${type.includes("mp4") ? "m4a" : "webm"}`, { type }));
      };
      mr.start(); rec.current = mr; setRecording(true);
    } catch { toast.error("Microphone access was blocked."); }
  };
  const stopRec = () => { rec.current?.stop(); setRecording(false); };

  const ready = kind === "text" ? !!text.trim() : !!file;

  const run = async () => {
    if (!ready || busy) return;
    setBusy(true); setRes(null);
    try {
      let payload: ModInput = { kind, text: text.trim() || undefined };
      let shown: string[] = [];
      if (kind === "image" && file) { shown = [await resizeImage(await fileToDataUrl(file))]; payload.images = shown; }
      if (kind === "video" && file) {
        shown = await videoFrames(file);
        payload.images = shown;
        if (file.size < 24 * 1024 * 1024) payload.audio = { base64: await blobToBase64(file), mime: file.type || "video/mp4", name: file.name };
      }
      if (kind === "voice" && file) payload.audio = { base64: await blobToBase64(file), mime: file.type || "audio/webm", name: file.name };
      if (kind !== "text" && !text.trim()) payload = { ...payload, text: undefined };
      const ai = await run$({ data: payload });
      const body = [text.trim(), ai.transcript].filter(Boolean).join("\n\n");
      setFrames(shown);
      setAnalyzed(body || (kind === "image" ? "(image)" : kind === "video" ? "(video — no speech)" : ""));
      setRes(fromAi(ai, settings, body));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Analysis failed");
    } finally { setBusy(false); }
  };

  const act = (a: string) => {
    if (!res) return;
    const queue = JSON.parse(localStorage.getItem("mod-queue") || "[]");
    queue.unshift({ id: `L${Date.now()}`, text: `[${kind}] ${analyzed}`, risk: res.risk, confidence: res.confidence, label: res.top[0] ?? "safe", decision: res.decision, status: a === "review" ? "PENDING" : a.toUpperCase(), at: new Date().toISOString() });
    localStorage.setItem("mod-queue", JSON.stringify(queue));
    toast.success(a === "review" ? "Sent to the review queue" : `Content ${a}`);
  };

  const accept = kind === "image" ? "image/*" : kind === "video" ? "video/*" : "audio/*";

  return (
    <AppShell title="Analyze content" subtitle="AI moderation for text, images, video and voice">
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-4 lg:col-span-2">
          <div className="glass grid grid-cols-4 gap-1 p-1">
            {TABS.map(({ k, l, I }) => (
              <button key={k} onClick={() => switchKind(k)} className={`flex items-center justify-center gap-1.5 rounded-md py-2 text-sm transition ${kind === k ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                <I className="size-4" />{l}
              </button>
            ))}
          </div>

          <div className="glass space-y-3 p-5">
            {kind !== "text" && (
              <div>
                {kind === "voice" && (
                  <button onClick={recording ? stopRec : startRec} className={`mb-3 inline-flex w-full items-center justify-center gap-2 rounded-lg border px-4 py-3 text-sm ${recording ? "border-critical/50 bg-critical/10 text-critical" : "border-border bg-secondary"}`}>
                    {recording ? <><Square className="size-4" />Stop recording</> : <><Mic className="size-4" />Record voice</>}
                  </button>
                )}
                <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-secondary/30 p-6 text-center text-sm text-muted-foreground hover:border-primary/40">
                  <Upload className="size-5 text-primary" />
                  {file ? file.name : `Upload ${kind === "voice" ? "an audio file" : `a ${kind}`}`}
                  <input type="file" accept={accept} className="hidden" onChange={(e) => pick(e.target.files?.[0] ?? null)} />
                </label>
                {preview && kind === "image" && <img src={preview} alt="Selected upload" className="mt-3 max-h-60 w-full rounded-lg object-contain" />}
                {preview && kind === "video" && <video src={preview} controls className="mt-3 max-h-60 w-full rounded-lg" />}
                {preview && kind === "voice" && <audio src={preview} controls className="mt-3 w-full" />}
              </div>
            )}
            <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder={kind === "text" ? "Paste a comment, post or message…" : "Optional caption or context…"} className={`${kind === "text" ? "min-h-48" : "min-h-16"} resize-none border-0 bg-transparent text-base focus-visible:ring-0`} maxLength={5000} />
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs text-muted-foreground">{text.length}/5000</span>
              <button onClick={run} disabled={!ready || busy} className="inline-flex items-center gap-2 rounded-lg bg-gradient-accent px-4 py-2 font-medium text-primary-foreground shadow-glow disabled:opacity-40">
                {busy ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />} {busy ? "Analyzing…" : "Analyze"}
              </button>
            </div>
          </div>
          {kind === "text" && (
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
          )}
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
