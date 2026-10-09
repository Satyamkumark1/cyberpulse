import { env } from "@/lib/env";
import { groqConfigured, groqFetch } from "@/lib/groq";
import { withRateLimit } from "@/lib/rateLimit";
import { REPLY_LANGUAGES, VoiceAnswer, VoiceRequest, VOICE_SYSTEM_PROMPT, fallbackVoiceAnswer, redactSensitiveText, inReplyScript, replyLanguage, usesProhibitedTerm } from "@/lib/safety/voiceAgent";

const LIMIT = { limit: 20, windowMs: 60_000 };

export const POST = withRateLimit(LIMIT)(async (request: Request) => {
  const parsed = VoiceRequest.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Say or type a short message and retry." }, { status: 400 });

  const safeMessage = redactSensitiveText(parsed.data.message);
  // The canned fallback is English only, so it says so via replyLang.
  const fallback = () => Response.json({ ...fallbackVoiceAnswer(safeMessage), provider: "local_fallback", replyLang: "en" });
  const replyLang = replyLanguage(parsed.data.lang);
  const { name, script } = REPLY_LANGUAGES[replyLang];
  if (!groqConfigured) return fallback();

  const ask = async (reminder?: string): Promise<VoiceAnswer | null> => {
    const response = await groqFetch("chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: env.GROQ_CHAT_MODEL,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: VOICE_SYSTEM_PROMPT },
          ...parsed.data.history.map((turn) => ({ ...turn, content: redactSensitiveText(turn.content) })),
          { role: "user", content: `Reply language: ${name} (${script} script)\nMessage: ${safeMessage}` },
          ...(reminder ? [{ role: "system", content: reminder }] : []),
        ],
      }),
    });
    if (!response.ok) return null;
    const payload = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
    const content = payload.choices?.[0]?.message?.content;
    const answer = VoiceAnswer.safeParse(content ? JSON.parse(content) : null);
    return answer.success && !usesProhibitedTerm(answer.data) ? answer.data : null;
  };

  try {
    let answer = await ask();
    if (!answer) return fallback();
    // The model sometimes ignores the reply language; one firmer retry, then
    // keep whatever is valid — a safe answer in English beats no answer.
    // A retry that throws (timeout, bad JSON) counts as no retry result.
    if (!inReplyScript(answer, replyLang)) answer = (await ask(`Your last reply was not in ${name}. Write "verdict" and "steps" in ${name}, ${script} script.`).catch(() => null)) ?? answer;
    return Response.json({ ...answer, provider: "groq", replyLang }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return fallback();
  }
});
