import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const GATEWAY = "https://ai.gateway.lovable.dev";
const CATS = ["toxicity", "harassment", "hate_speech", "threat", "violence", "spam", "misinformation", "sexual_content", "self_harm"];

const Input = z.object({
  text: z.string().max(5000).optional(),
  images: z.array(z.string()).max(12).optional(),
  audio: z.object({ base64: z.string(), mime: z.string(), name: z.string() }).optional(),
  kind: z.enum(["text", "image", "video", "voice"]),
});

export type ModInput = z.infer<typeof Input>;
export type AiResult = {
  scores: Record<string, number>;
  hits: string[];
  explanation: string;
  transcript?: string | undefined;
  confidence: number;
};

async function transcribe(apiKey: string, a: { base64: string; mime: string; name: string }) {
  const bytes = Uint8Array.from(atob(a.base64), (c) => c.charCodeAt(0));
  if (bytes.length > 24 * 1024 * 1024) throw new Error("Audio is too large (max 24 MB).");
  const form = new FormData();
  form.append("model", "openai/gpt-transcribe");
  form.append("file", new File([bytes], a.name, { type: a.mime }), a.name);
  form.append("response_format", "json");
  const r = await fetch(`${GATEWAY}/v1/audio/transcriptions`, { method: "POST", headers: { Authorization: `Bearer ${apiKey}` }, body: form });
  if (!r.ok) throw new Error(`Transcription failed (${r.status}): ${(await r.text()).slice(0, 200)}`);
  const j = (await r.json()) as { text?: string };
  return j.text ?? "";
}

const SYSTEM = `You are a precise trust & safety classifier. Score content 0-100 for each category: ${CATS.join(", ")}.
Calibration rules (from labelled dataset review):
- Polite, neutral or informative content scores 0-8 everywhere, even if it mentions topics like violence in a news/educational way.
- Respectful disagreement is NOT harassment or toxicity.
- Idioms ("killer feature", "kill time", "this joke killed me") are NOT violence or threats.
- Direct threats to a person ("I'll find you and hurt you") score threat >= 85.
- Prize/click/buy-now bait or suspicious links score spam >= 80.
- Content attacking a protected group scores hate_speech >= 80.
- Expressions of wanting to die or self-injury score self_harm >= 85.
- Images/frames: judge visible weapons, gore, nudity, hateful symbols, text in image, and context. A kitchen knife while cooking is not violence.
Be decisive: avoid mid-range scores unless genuinely ambiguous.
Respond ONLY with JSON: {"scores":{<category>:number},"hits":[exact harmful phrases or short visual descriptions],"explanation":"2-3 sentences on why","confidence":0-100}`;

export const aiModerate = createServerFn({ method: "POST" })
  .inputValidator((d) => Input.parse(d))
  .handler(async ({ data }): Promise<AiResult> => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("AI is not configured.");
    let transcript: string | undefined;
    if (data.audio) transcript = await transcribe(apiKey, data.audio);

    const content: Record<string, unknown>[] = [];
    const parts = [`Content type: ${data.kind}.`];
    if (data.text) parts.push(`Text:\n"""${data.text}"""`);
    if (transcript !== undefined) parts.push(`Speech transcript:\n"""${transcript || "(no speech detected)"}"""`);
    if (data.images?.length) parts.push(`${data.images.length} image(s)${data.kind === "video" ? " sampled evenly from a video" : ""} attached.`);
    content.push({ type: "input_text", text: parts.join("\n\n") });
    for (const img of data.images ?? []) content.push({ type: "input_image", image_url: img });

    const r = await fetch(`${GATEWAY}/v1/responses`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "fetch" },
      body: JSON.stringify({
        model: "openai/gpt-6-astra",
        stream: true,
        store: false,
        reasoning: { effort: "low", summary: "auto" },
        include: ["reasoning.encrypted_content"],
        input: [
          { role: "system", content: [{ type: "input_text", text: SYSTEM }] },
          { role: "user", content },
        ],
      }),
    });
    if (!r.ok || !r.body) {
      const msg = await r.text();
      if (r.status === 402) throw new Error("AI credits are used up. Add credits in workspace billing.");
      if (r.status === 429) throw new Error("Too many requests — wait a moment and try again.");
      throw new Error(`AI analysis failed (${r.status}): ${msg.slice(0, 200)}`);
    }
    const reader = r.body.getReader();
    const dec = new TextDecoder();
    let buf = "", out = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop() ?? "";
      for (const l of lines) {
        if (!l.startsWith("data:")) continue;
        try {
          const ev = JSON.parse(l.slice(5).trim());
          if (ev.type === "response.output_text.delta") out += ev.delta;
          if (ev.type === "error" || ev.type === "response.failed") throw new Error(ev.error?.message ?? ev.response?.error?.message ?? "AI error");
        } catch (e) { if (e instanceof Error && !(e instanceof SyntaxError)) throw e; }
      }
    }
    const m = out.match(/\{[\s\S]*\}/);
    if (!m) throw new Error("The AI declined or returned no result.");
    const j = JSON.parse(m[0]);
    const scores: Record<string, number> = {};
    for (const c of CATS) scores[c] = Math.max(0, Math.min(100, Math.round(Number(j.scores?.[c]) || 0)));
    return {
      scores,
      hits: Array.isArray(j.hits) ? j.hits.map(String).slice(0, 12) : [],
      explanation: String(j.explanation ?? ""),
      confidence: Math.max(0, Math.min(100, Math.round(Number(j.confidence) || 80))),
      transcript,
    };
  });
