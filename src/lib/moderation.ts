import { useEffect, useState } from "react";

export const CATEGORIES = [
  "toxicity", "harassment", "hate_speech", "threat", "violence",
  "spam", "misinformation", "sexual_content", "self_harm",
] as const;
export type Category = (typeof CATEGORIES)[number];

export const label = (c: string) =>
  c.toLowerCase().split("_").map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");

const LEXICON: Record<Category, string[]> = {
  toxicity: ["stupid", "idiot", "dumb", "trash", "shut up", "loser", "pathetic", "garbage", "moron", "hate you"],
  harassment: ["nobody likes you", "you're worthless", "ugly", "go away", "stop bothering", "pathetic", "loser", "everyone hates"],
  hate_speech: ["those people", "go back to", "inferior", "subhuman", "hateful", "targeting a group", "vermin"],
  threat: ["kill you", "hurt you", "find you", "watch your back", "you'll regret", "threatening", "destroy you", "beat you"],
  violence: ["kill", "shoot", "stab", "attack", "blood", "bomb", "beat", "fight", "weapon"],
  spam: ["click here", "free money", "buy now", "limited offer", "subscribe", "win a", "http", "www.", "discount", "dm me"],
  misinformation: ["cure", "hoax", "they don't want you to know", "fake news", "100% proven", "miracle", "secret truth"],
  sexual_content: ["nude", "nsfw", "explicit", "sexy", "porn", "xxx"],
  self_harm: ["kill myself", "end it all", "want to die", "self harm", "cut myself", "no reason to live"],
};

export const DEFAULT_SETTINGS = {
  weights: Object.fromEntries(CATEGORIES.map((c) => [c, ["threat", "self_harm", "hate_speech"].includes(c) ? 1.3 : c === "spam" ? 0.7 : 1])) as Record<Category, number>,
  approveBelow: 30,
  reviewAt: 60,
  rejectAt: 80,
  blocked: ["slur1", "slur2"],
  allowed: ["kill time", "killer feature"],
  model: "RoBERTa v1.0",
};
export type Settings = typeof DEFAULT_SETTINGS;

export function useSettings() {
  const [s, setS] = useState<Settings>(DEFAULT_SETTINGS);
  useEffect(() => {
    const raw = localStorage.getItem("mod-settings");
    if (raw) setS({ ...DEFAULT_SETTINGS, ...JSON.parse(raw) });
  }, []);
  const save = (n: Settings) => { setS(n); localStorage.setItem("mod-settings", JSON.stringify(n)); };
  return [s, save] as const;
}

export type RiskLevel = "Safe" | "Low Risk" | "Medium Risk" | "High Risk" | "Critical";
export const riskLevel = (r: number): RiskLevel =>
  r <= 20 ? "Safe" : r <= 40 ? "Low Risk" : r <= 60 ? "Medium Risk" : r <= 80 ? "High Risk" : "Critical";
export const riskToken = (r: number) =>
  r <= 20 ? "safe" : r <= 40 ? "low" : r <= 60 ? "medium" : r <= 80 ? "high" : "critical";

export type Decision = "APPROVED" | "FLAGGED" | "HUMAN REVIEW" | "REJECTED";

export interface Result {
  scores: Record<Category, number>;
  risk: number;
  confidence: number;
  level: RiskLevel;
  decision: Decision;
  hits: string[];
  explanation: string;
  top: Category[];
}

export function analyze(text: string, s: Settings): Result {
  let lower = " " + text.toLowerCase() + " ";
  for (const a of s.allowed) lower = lower.split(a.toLowerCase()).join(" ");
  const hits = new Set<string>();
  const scores = {} as Record<Category, number>;
  for (const c of CATEGORIES) {
    let n = 0;
    for (const w of LEXICON[c]) if (lower.includes(w)) { n++; hits.add(w); }
    scores[c] = Math.min(98, n === 0 ? 2 + (text.length % 7) : 45 + n * 22);
  }
  const caps = text.replace(/[^A-Z]/g, "").length / Math.max(1, text.replace(/[^a-zA-Z]/g, "").length);
  if (caps > 0.6 && text.length > 10) scores.toxicity = Math.min(98, scores.toxicity + 20);
  const excl = (text.match(/!/g) || []).length;
  if (excl > 2) scores.toxicity = Math.min(98, scores.toxicity + excl * 3);
  let blocked = false;
  for (const b of s.blocked) if (b && lower.includes(b.toLowerCase())) { blocked = true; hits.add(b); }

  const sorted = [...CATEGORIES].sort((a, b) => scores[b] * s.weights[b] - scores[a] * s.weights[a]);
  const maxW = Math.max(...CATEGORIES.map((c) => scores[c] * s.weights[c]));
  const second = scores[sorted[1]] * s.weights[sorted[1]];
  let risk = Math.round(Math.min(100, maxW * 0.85 + second * 0.15));
  if (blocked) risk = Math.max(risk, 90);
  const confidence = Math.round(Math.min(99, 70 + Math.abs(risk - 50) / 2 + hits.size * 2));
  const decision: Decision =
    risk >= s.rejectAt ? "REJECTED" : risk >= s.reviewAt ? "HUMAN REVIEW" : risk >= s.approveBelow ? "FLAGGED" : "APPROVED";
  const top = sorted.filter((c) => scores[c] >= 40).slice(0, 3);
  const explanation = top.length
    ? `The content contains language strongly associated with ${top.map((t) => label(t).toLowerCase()).join(" and ")}. ${hits.size} signal phrase${hits.size === 1 ? "" : "s"} matched the ${s.model} policy lexicon${blocked ? ", including a blocked term" : ""}.`
    : "No harmful patterns were detected. Language, tone and intent fall within community guidelines.";
  return { scores, risk, confidence, level: riskLevel(risk), decision, hits: [...hits], explanation, top };
}

export function highlight(text: string, hits: string[]) {
  if (!hits.length) return [{ t: text, hit: false }];
  const re = new RegExp(`(${hits.map((h) => h.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "gi");
  return text.split(re).filter(Boolean).map((t) => ({ t, hit: hits.some((h) => h.toLowerCase() === t.toLowerCase()) }));
}
