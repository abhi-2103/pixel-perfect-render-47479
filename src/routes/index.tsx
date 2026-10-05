import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowRight, FileText, Image, Video, Mic, MessageSquare, Brain, Scale, Eye, Lock, KeyRound, ScrollText, Gauge } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { TopNav, Logo } from "@/components/AppShell";
import history from "@/data/history.json";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SentinelAI — AI Intelligent Content Moderation System" },
      { name: "description", content: "Detect, score and manage harmful content across text, images, video and audio with explainable AI and human review." },
      { property: "og:title", content: "SentinelAI — AI Content Moderation" },
      { property: "og:description", content: "Explainable AI moderation with risk scoring, policy rules and human-in-the-loop review." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const fade = { initial: { opacity: 0, y: 16 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true }, transition: { duration: 0.5 } };

const spark = Array.from({ length: 24 }, (_, i) => ({ v: history.slice(i * 20, i * 20 + 20).reduce((a, h) => a + h.risk_score, 0) / 20 }));

function Landing() {
  return (
    <div>
      <TopNav />
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="grid-lines absolute inset-0 opacity-40 [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 py-20 lg:grid-cols-2 lg:py-28">
          <motion.div {...fade}>
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 font-mono text-xs text-primary">
              <span className="size-1.5 animate-pulse rounded-full bg-primary" /> AI Intelligent Content Moderation System
            </span>
            <h1 className="mt-6 text-5xl font-semibold leading-[1.05] md:text-6xl">
              Stop harmful content <span className="text-gradient">before it spreads.</span>
            </h1>
            <p className="mt-6 max-w-lg text-lg text-muted-foreground">
              Detect hate, harassment, threats, spam and more across every format. Every decision is scored, explained and auditable.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/moderate" className="inline-flex items-center gap-2 rounded-lg bg-gradient-accent px-5 py-3 font-medium text-primary-foreground shadow-glow transition hover:opacity-90">
                Analyze Content <ArrowRight className="size-4" />
              </Link>
              <Link to="/dashboard" className="glass inline-flex items-center gap-2 px-5 py-3 font-medium transition hover:bg-secondary">
                View Dashboard
              </Link>
            </div>
          </motion.div>
          <motion.div {...fade} transition={{ delay: 0.15, duration: 0.6 }} className="glass p-6 shadow-glow">
            <div className="flex items-center justify-between font-mono text-xs text-muted-foreground">
              <span>MODERATION RESULT</span><span className="text-high">● HIGH RISK</span>
            </div>
            <p className="mt-4 rounded-lg bg-secondary/60 p-4 text-sm">
              You're so <mark className="rounded bg-critical/25 px-1 text-foreground">pathetic</mark>, <mark className="rounded bg-critical/25 px-1 text-foreground">nobody likes you</mark>. Just go away.
            </p>
            <div className="mt-5 grid grid-cols-2 gap-4">
              <div><div className="text-xs text-muted-foreground">Risk score</div><div className="font-display text-4xl font-semibold text-high">82<span className="text-lg text-muted-foreground">/100</span></div></div>
              <div><div className="text-xs text-muted-foreground">Confidence</div><div className="font-display text-4xl font-semibold">94%</div></div>
            </div>
            <div className="mt-5 space-y-2">
              {[["Toxicity", 94, "bg-critical"], ["Harassment", 87, "bg-high"], ["Spam", 8, "bg-safe"]].map(([n, v, c]) => (
                <div key={n as string} className="flex items-center gap-3 text-sm">
                  <span className="w-24 text-muted-foreground">{n}</span>
                  <div className="h-1.5 flex-1 rounded-full bg-secondary"><motion.div initial={{ width: 0 }} whileInView={{ width: `${v}%` }} transition={{ duration: 1 }} className={`h-full rounded-full ${c}`} /></div>
                  <span className="w-10 text-right font-mono text-xs">{v}%</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats */}
      <section className="mx-auto max-w-7xl px-4">
        <div className="glass grid grid-cols-2 gap-6 p-6 md:grid-cols-4">
          {[["500+", "Items in demo history"], ["9", "Harm categories"], ["94%", "Avg. model accuracy"], ["<200ms", "Text decision time"]].map(([v, l]) => (
            <div key={l}><div className="font-display text-3xl font-semibold text-gradient">{v}</div><div className="text-sm text-muted-foreground">{l}</div></div>
          ))}
        </div>
      </section>

      {/* Workflow */}
      <Section eyebrow="Workflow" title="From submission to decision in five steps">
        <div className="grid gap-4 md:grid-cols-5">
          {["Ingest", "Route by type", "AI classify", "Policy engine", "Approve · Flag · Reject"].map((s, i) => (
            <motion.div key={s} {...fade} transition={{ delay: i * 0.08 }} className="glass p-5">
              <div className="font-mono text-xs text-primary">0{i + 1}</div>
              <div className="mt-2 font-display font-medium">{s}</div>
            </motion.div>
          ))}
        </div>
      </Section>

      {/* Content types */}
      <Section eyebrow="Coverage" title="Every format your users post">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {[[FileText, "Text", "Posts, reviews, bios"], [MessageSquare, "Comments", "Threads & chats"], [Image, "Images", "Objects, symbols, nudity"], [Video, "Video", "Sampled frames + audio"], [Mic, "Audio", "Speech-to-text then NLP"]].map(([I, t, d]) => {
            const Icon = I as typeof FileText;
            return (
              <div key={t as string} className="glass p-5 transition hover:-translate-y-1 hover:border-primary/40">
                <Icon className="size-5 text-primary" />
                <div className="mt-3 font-display font-medium">{t as string}</div>
                <div className="text-sm text-muted-foreground">{d as string}</div>
              </div>
            );
          })}
        </div>
      </Section>

      {/* Capabilities + tech */}
      <Section eyebrow="Capabilities" title="AI you can audit">
        <div className="grid gap-4 md:grid-cols-3">
          {[[Brain, "Multi-label classification", "Transformer models score nine harm categories at once."], [Gauge, "Weighted risk scoring", "Category scores combine into one 0–100 risk with tunable weights."], [Scale, "Rule-based policy", "Deterministic thresholds decide approve, flag, review or reject."], [Eye, "Explainable decisions", "Highlighted phrases and a plain-language 'why' for every flag."], [ScrollText, "Human review", "Moderators confirm, overturn or escalate — all logged."], [Lock, "Secure by design", "Role-based access, audit logs and encrypted storage."]].map(([I, t, d]) => {
            const Icon = I as typeof Brain;
            return (
              <div key={t as string} className="glass p-6">
                <Icon className="size-5 text-accent" />
                <h3 className="mt-4 text-lg font-medium">{t as string}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{d as string}</p>
              </div>
            );
          })}
        </div>
      </Section>

      <Section eyebrow="Technology" title="The models under the hood">
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="glass p-6 lg:col-span-2">
            <div className="grid gap-3 font-mono text-sm sm:grid-cols-2">
              {["RoBERTa / DeBERTa — text toxicity", "Vision Transformer — image classes", "CLIP — zero-shot unsafe imagery", "YOLO — weapon & object detection", "Whisper — speech-to-text", "Gradient boosting — risk calibration"].map((t) => (
                <div key={t} className="rounded-lg border border-border bg-secondary/40 px-3 py-2">{t}</div>
              ))}
            </div>
          </div>
          <div className="glass p-6">
            <div className="text-sm text-muted-foreground">Average risk, rolling</div>
            <div className="h-32"><ResponsiveContainer><AreaChart data={spark}><Area dataKey="v" stroke="var(--primary)" fill="var(--primary)" fillOpacity={0.15} strokeWidth={2} /></AreaChart></ResponsiveContainer></div>
          </div>
        </div>
      </Section>

      <Section eyebrow="Security" title="Built for trust & safety teams">
        <div className="grid gap-4 md:grid-cols-4">
          {[[KeyRound, "Role-based access", "Admin, Moderator, Reviewer, User"], [ScrollText, "Full audit trail", "Every AI and human action"], [Lock, "Secrets server-side", "No keys in the browser"], [Gauge, "Rate limiting", "Abuse-resistant APIs"]].map(([I, t, d]) => {
            const Icon = I as typeof Lock;
            return <div key={t as string} className="glass p-5"><Icon className="size-5 text-safe" /><div className="mt-3 font-medium">{t as string}</div><div className="text-sm text-muted-foreground">{d as string}</div></div>;
          })}
        </div>
      </Section>

      <Section eyebrow="FAQ" title="Questions, answered">
        <Accordion type="single" collapsible className="glass px-6">
          {[["How is the risk score calculated?", "Each category gets a 0–100 score. Weighted scores combine into one normalized risk: 0–20 Safe, 21–40 Low, 41–60 Medium, 61–80 High, 81–100 Critical."], ["Can I change the thresholds?", "Yes. Admins tune approval, review and rejection thresholds, category weights and blocked/allowed words in Settings."], ["Do humans stay in control?", "Borderline content goes to the Review Queue, where moderators approve, reject, escalate or mark false positives."], ["Which formats are supported?", "Text, comments, images, video (sampled frames plus transcribed audio) and audio."]].map(([q, a]) => (
            <AccordionItem key={q} value={q}><AccordionTrigger>{q}</AccordionTrigger><AccordionContent className="text-muted-foreground">{a}</AccordionContent></AccordionItem>
          ))}
        </Accordion>
      </Section>

      <footer className="mt-24 border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-8 text-sm text-muted-foreground">
          <Logo />
          <span>© 2026 SentinelAI · AI Intelligent Content Moderation System</span>
        </div>
      </footer>
    </div>
  );
}

function Section({ eyebrow, title, children }: { eyebrow: string; title: string; children: React.ReactNode }) {
  return (
    <section className="mx-auto max-w-7xl px-4 pt-24">
      <motion.div {...fade} className="mb-8">
        <div className="font-mono text-xs uppercase tracking-widest text-primary">{eyebrow}</div>
        <h2 className="mt-2 text-3xl font-semibold md:text-4xl">{title}</h2>
      </motion.div>
      {children}
    </section>
  );
}
