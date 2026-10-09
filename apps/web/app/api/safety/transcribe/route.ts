import { env } from "@/lib/env";
import { withRateLimit } from "@/lib/rateLimit";

const LIMIT = { limit: 12, windowMs: 60_000 };
const MAX_AUDIO_BYTES = 8 * 1024 * 1024;

export const POST = withRateLimit(LIMIT)(async (request: Request) => {
  if (!env.GROQ_API_KEY) return Response.json({ error: "Voice transcription is not configured yet. You can still type a message." }, { status: 503 });
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("multipart/form-data")) {
    return Response.json({ error: "Send the recording as multipart form data." }, { status: 400 });
  }
  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_AUDIO_BYTES + 1_000_000) {
    return Response.json({ error: "The recording is too large." }, { status: 413 });
  }
  let incoming: FormData;
  try {
    incoming = await request.formData();
  } catch {
    return Response.json({ error: "The recording upload is malformed." }, { status: 400 });
  }
  const audio = incoming.get("audio");
  const language = incoming.get("language");
  if (!(audio instanceof File) || audio.size === 0) {
    return Response.json({ error: "Record a shorter message and retry." }, { status: 400 });
  }
  if (audio.size > MAX_AUDIO_BYTES) return Response.json({ error: "The recording is too large." }, { status: 413 });

  const body = new FormData();
  body.set("file", audio, audio.name || "voice.webm");
  body.set("model", env.GROQ_TRANSCRIPTION_MODEL);
  body.set("response_format", "json");
  if (typeof language === "string" && /^[a-z]{2}$/.test(language)) body.set("language", language);

  let response: Response;
  try {
    response = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
      method: "POST", headers: { Authorization: `Bearer ${env.GROQ_API_KEY}` }, body, cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    return Response.json({ error: "Voice transcription is temporarily unavailable. Type your message instead." }, { status: 503 });
  }
  if (!response.ok) return Response.json({ error: "I could not understand that recording. Try again or type instead." }, { status: 503 });
  let payload: { text?: string };
  try {
    payload = await response.json() as { text?: string };
  } catch {
    return Response.json({ error: "Voice transcription returned an invalid response. Type your message instead." }, { status: 503 });
  }
  if (!payload.text?.trim()) return Response.json({ error: "No speech was detected." }, { status: 422 });
  return Response.json({ transcript: payload.text.trim() }, { headers: { "Cache-Control": "no-store" } });
});
