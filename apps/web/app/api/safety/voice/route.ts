import { env } from "@/lib/env";
import { withRateLimit } from "@/lib/rateLimit";
import { VoiceAnswer, VoiceRequest, VOICE_SYSTEM_PROMPT, fallbackVoiceAnswer, redactSensitiveText } from "@/lib/safety/voiceAgent";

const LIMIT = { limit: 20, windowMs: 60_000 };

export const POST = withRateLimit(LIMIT)(async (request: Request) => {
  const parsed = VoiceRequest.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Say or type a short message and retry." }, { status: 400 });

  const safeMessage = redactSensitiveText(parsed.data.message);
  const fallback = () => Response.json({ ...fallbackVoiceAnswer(safeMessage), provider: "local_fallback" });
  if (!env.GROQ_API_KEY) return fallback();

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${env.GROQ_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: env.GROQ_CHAT_MODEL,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: VOICE_SYSTEM_PROMPT },
          ...parsed.data.history.map((turn) => ({ ...turn, content: redactSensitiveText(turn.content) })),
          { role: "user", content: `Language: ${parsed.data.lang}\nMessage: ${safeMessage}` },
        ],
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) return fallback();
    const payload = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
    const content = payload.choices?.[0]?.message?.content;
    const answer = VoiceAnswer.safeParse(content ? JSON.parse(content) : null);
    if (!answer.success) return fallback();
    return Response.json({ ...answer.data, provider: "groq" }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return fallback();
  }
});
