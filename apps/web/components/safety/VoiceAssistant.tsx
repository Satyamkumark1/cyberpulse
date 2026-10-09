"use client";

import Link from "next/link";
import { FormEvent, KeyboardEvent, useCallback, useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { HELPLINE_LABEL, withLang, type Lang } from "@/lib/safety/copy";
import { localeDirection } from "@/lib/safety/locales";
import type { ReplyLanguage, VoiceAnswer, VoiceReference } from "@/lib/safety/voiceAgent";
import { VOICE_COPY, type VoiceCopy } from "@/lib/safety/voiceCopy";
import { useFocusTrap } from "@/components/common/useFocusTrap";
import { AgentIcon, ArrowIcon, ArrowUpIcon, CheckIcon, CloseIcon, CopyIcon, GlobeIcon, MicrophoneIcon, PhoneIcon, ReportIcon, StopIcon, VerifyIcon, VolumeIcon } from "./SafetyIcons";

type Message = { role: "user"; content: string } | { role: "assistant"; content: string; answer?: VoiceAnswer; replyLang?: ReplyLanguage };
type AgentResponse = VoiceAnswer & { provider: "groq" | "local_fallback"; replyLang: ReplyLanguage };

// Replies only ever come in these 11 languages (voiceAgent.ts replyLanguage).
const SPEECH_LOCALES: Record<ReplyLanguage, string> = {
  en: "en-IN", hi: "hi-IN", bn: "bn-IN", gu: "gu-IN", kn: "kn-IN", ml: "ml-IN", mr: "mr-IN", pa: "pa-IN", ta: "ta-IN", te: "te-IN", ur: "ur-IN",
};

// Seeded into history in English (what the model sees); rendered in the current language.
const WELCOME = VOICE_COPY.en.welcome;

// Neutral ink scale (ChatGPT-like). Every text pairing below clears WCAG AA on white:
// INK #0d0d0d 19.4:1 · MUTED #5d5d5d 6.6:1 · SUBTLE #6b6b6b 5.3:1.
const FOCUS = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0d0d0d]";
const ICON_BUTTON = `grid h-9 w-9 place-items-center rounded-full text-[#5d5d5d] hover:bg-[#f0f0f0] hover:text-[#0d0d0d] ${FOCUS}`;

// Every label, number and URL a reference can show lives here — the model only
// picks a code (voiceAgent.ts VoiceReference), so it cannot invent a helpline.
// The helpline keeps its fixed English label (CLAUDE.md fixed strings).
function references(t: VoiceCopy): Record<VoiceReference, { label: string; href?: string; Icon: typeof PhoneIcon }> {
  return {
    HELPLINE_1930: { label: HELPLINE_LABEL, href: "tel:1930", Icon: PhoneIcon },
    CYBERCRIME_PORTAL: { label: "cybercrime.gov.in", href: "https://cybercrime.gov.in", Icon: GlobeIcon },
    SANCHAR_SAATHI: { label: `${t.refSanchar}: sancharsaathi.gov.in`, href: "https://sancharsaathi.gov.in", Icon: GlobeIcon },
    BANK: { label: t.refBank, Icon: VerifyIcon },
  };
}

function plainText(answer: VoiceAnswer, t: VoiceCopy): string {
  const refs = references(t);
  return [answer.verdict, ...answer.steps.map((step) => `- ${step}`), ...answer.references.map((ref) => refs[ref].label)].join("\n");
}

const prefersReducedMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Word-by-word reveal of a reply that has already fully arrived and been validated. */
function useWordReveal(total: number, animate: boolean): number {
  const [shown, setShown] = useState(() => (animate && !prefersReducedMotion() ? 0 : total));
  useEffect(() => {
    if (shown >= total) return;
    const id = setTimeout(() => setShown((n) => n + 1), 35);
    return () => clearTimeout(id);
  }, [shown, total]);
  return shown;
}

function take(text: string, budget: number): string {
  return text.split(" ").slice(0, Math.max(budget, 0)).join(" ");
}

function AssistantAnswer({ answer, replyLang, animate, lang, t, note, onTick, onNavigate, onCopy, onSpeak, copied }: {
  answer: VoiceAnswer; replyLang: ReplyLanguage; animate: boolean; lang: Lang; t: VoiceCopy; note: string | null; copied: boolean;
  onTick: () => void; onNavigate: () => void; onCopy: () => void; onSpeak: () => void;
}) {
  const verdictWords = answer.verdict.split(" ").length;
  const total = verdictWords + answer.steps.reduce((sum, step) => sum + step.split(" ").length, 0);
  const shown = useWordReveal(total, animate);
  const done = shown >= total;
  useEffect(onTick, [shown, onTick]);

  let budget = shown - verdictWords;
  const refs = references(t);
  return (
    <div className="text-base leading-7 text-[#0d0d0d]">
      {/* Direction from the reply's language, not dir="auto": an Urdu step that
          starts with "OTP" would otherwise be laid out left-to-right. */}
      {note ? <p className="mb-1.5 text-xs leading-5 text-[#5d5d5d]">{note}</p> : null}
      {answer.urgent ? (
        <p className="mb-1.5 inline-flex items-center gap-1.5 rounded-md bg-[#fdecec] px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-[#a4161a]"><ReportIcon className="h-3.5 w-3.5" />{t.urgent}</p>
      ) : null}
      <p dir={replyLang === "ur" ? "rtl" : "ltr"} className="font-semibold">{take(answer.verdict, shown)}</p>
      {answer.steps.length && budget > 0 ? (
        <ul dir={replyLang === "ur" ? "rtl" : "ltr"} className="mt-1.5 list-disc space-y-1 ps-5 marker:text-[#8f8f8f]">
          {answer.steps.map((step, i) => {
            const text = take(step, budget);
            budget -= step.split(" ").length;
            return text ? <li key={i}>{text}</li> : null;
          })}
        </ul>
      ) : null}
      {done ? (
        <>
          {answer.references.length ? (
            <div className="mt-4">
              <p className="mb-2 text-xs font-medium text-[#5d5d5d]">{t.whereToGo}</p>
              <div className="flex flex-wrap gap-2">
                {answer.references.map((ref) => {
                  const { label, href, Icon } = refs[ref];
                  const helpline = ref === "HELPLINE_1930";
                  const pill = `inline-flex min-h-9 items-center gap-2 rounded-full border px-3 text-sm font-medium ${helpline ? "border-[#f3c4c4] bg-[#fdecec] text-[#a4161a]" : "border-[#e3e3e3] bg-white text-[#0d0d0d]"}`;
                  return href ? (
                    <a key={ref} href={href} {...(href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})} className={`${pill} hover:bg-[#f7f7f7] ${FOCUS}`}><Icon className="h-4 w-4 shrink-0" />{label}</a>
                  ) : (
                    <span key={ref} className={pill}><Icon className="h-4 w-4 shrink-0 text-[#5d5d5d]" />{label}</span>
                  );
                })}
              </div>
            </div>
          ) : null}
          {answer.route ? (
            <Link href={withLang(answer.route, lang)} onClick={onNavigate} className={`mt-3 flex min-h-11 items-center justify-between rounded-xl px-4 text-sm font-semibold ${answer.urgent ? "bg-[#c1121f] text-white hover:bg-[#a4161a]" : "border border-[#e3e3e3] text-[#0d0d0d] hover:bg-[#f7f7f7]"} ${FOCUS}`}>{t.next[answer.intent === "GENERAL" ? "CHECK" : answer.intent]}<ArrowIcon className="h-4 w-4 rtl:-scale-x-100" /></Link>
          ) : null}
          <div className="-ms-2 mt-2 flex">
            <button type="button" onClick={onCopy} className={ICON_BUTTON} aria-label={copied ? t.copied : t.copy}>{copied ? <CheckIcon className="h-4 w-4" /> : <CopyIcon className="h-4 w-4" />}</button>
            <button type="button" onClick={onSpeak} className={ICON_BUTTON} aria-label={t.readAloud}><VolumeIcon className="h-4 w-4" /></button>
          </div>
        </>
      ) : null}
    </div>
  );
}

/** In-place "Thinking for 3s" row (ChatGPT-style). Mounts per request, so the timer resets itself. */
function ReplyProgress({ label, english }: { label: string; english: boolean }) {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <div role="status" className="flex items-center gap-2.5 border-b border-[#ececec] pb-3 text-[15px] text-[#5d5d5d]">
      <span className="relative grid h-7 w-7 place-items-center" aria-hidden="true">
        <span className="absolute inset-0 animate-spin rounded-full border-2 border-[#e3e3e3] border-t-[#0d0d0d] motion-reduce:animate-none" />
        <AgentIcon className="h-3.5 w-3.5 text-[#0d0d0d]" />
      </span>
      <span>{seconds < 1 ? `${label}…` : english ? `${label} for ${seconds}s` : `${label} · ${seconds}s`}</span>
    </div>
  );
}

export function VoiceAssistant({ lang }: { lang: Lang }) {
  const t = VOICE_COPY[lang];
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([{ role: "assistant", content: WELCOME }]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [provider, setProvider] = useState<AgentResponse["provider"] | null>(null);
  const [soundOn, setSoundOn] = useState(true);
  const [revealIndex, setRevealIndex] = useState<number | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const messagesRef = useRef(messages);
  const dialogRef = useRef<HTMLElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  // Mutations (not bare fetches) so the global request indicator sees them.
  // inlineProgress: the chat shows its own in-place progress row, so the
  // page-level GlobalRequestIndicator skips these two.
  const voice = useMutation({
    meta: { inlineProgress: true },
    mutationFn: (body: { message: string; lang: Lang; history: Array<{ role: Message["role"]; content: string }> }) =>
      fetch("/api/safety/voice", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }),
  });
  const transcribe = useMutation({
    meta: { inlineProgress: true },
    mutationFn: (body: FormData) => fetch("/api/safety/transcribe", { method: "POST", body }),
  });

  const scrollToEnd = useCallback(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, []);
  useEffect(scrollToEnd, [messages.length, busy, error, scrollToEnd]);

  function appendMessage(message: Message) {
    const next = [...messagesRef.current, message];
    messagesRef.current = next;
    setMessages(next);
    if (message.role === "assistant") setRevealIndex(next.length - 1);
  }

  /** Speaks only with a voice for the reply's language; a default voice reading
   *  another script is gibberish. `explicit` (the read-aloud button) explains why not. */
  function speakNow(text: string, replyLang: ReplyLanguage, explicit = false) {
    if (!("speechSynthesis" in window)) return;
    const synth = window.speechSynthesis;
    const voices = synth.getVoices();
    const voice = voices.find((v) => v.lang.toLowerCase().replace("_", "-").startsWith(replyLang));
    if (voices.length > 0 && !voice) { if (explicit) setError(t.noVoice); return; }
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = SPEECH_LOCALES[replyLang];
    if (voice) utterance.voice = voice;
    utterance.rate = 0.95;
    synth.speak(utterance);
  }

  async function copy(text: string, index: number) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex((current) => (current === index ? null : current)), 1500);
    } catch { /* clipboard blocked: the text is still on screen */ }
  }

  async function sendMessage(raw: string) {
    const message = raw.trim();
    if (!message || busy) return;
    const previous = messagesRef.current.slice(-8).map(({ role, content }) => ({ role, content }));
    appendMessage({ role: "user", content: message });
    setDraft(""); setBusy(true); setError(null);
    try {
      const response = await voice.mutateAsync({ message, lang, history: previous });
      const payload = await response.json() as AgentResponse | { error?: string };
      if (!response.ok || !("verdict" in payload)) {
        const message = "error" in payload ? payload.error : undefined;
        throw new Error(message ?? t.unavailable);
      }
      const text = plainText(payload, t);
      appendMessage({ role: "assistant", content: text, answer: payload, replyLang: payload.replyLang });
      setProvider(payload.provider);
      setAnnouncement(text);
      if (soundOn) speakNow([payload.verdict, ...payload.steps].join(" "), payload.replyLang);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t.unavailable);
    } finally { setBusy(false); }
  }

  async function startRecording() {
    setError(null);
    if (!navigator.mediaDevices?.getUserMedia || !("MediaRecorder" in window)) {
      setError(t.micUnsupported); return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream; chunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => { if (event.data.size) chunksRef.current.push(event.data); };
      recorder.onstop = async () => {
        recorderRef.current = null;
        stream.getTracks().forEach((track) => track.stop());
        setRecording(false); setBusy(true);
        const audio = new File(chunksRef.current, "voice.webm", { type: recorder.mimeType || "audio/webm" });
        // The server passes the language on to Whisper only when Whisper supports it.
        const body = new FormData(); body.set("audio", audio); body.set("language", lang);
        try {
          const response = await transcribe.mutateAsync(body);
          const payload = await response.json() as { transcript?: string; error?: string };
          if (!response.ok || !payload.transcript) throw new Error(payload.error ?? t.transcribeFailed);
          setBusy(false); await sendMessage(payload.transcript);
        } catch (caught) {
          setBusy(false); setError(caught instanceof Error ? caught.message : t.transcribeFailed);
        }
      };
      recorder.start(); setRecording(true);
    } catch {
      setError(t.micDenied);
    }
  }

  function stopRecording() { recorderRef.current?.stop(); }
  // Stable identity: useFocusTrap re-runs (and refocuses) whenever onClose changes.
  const close = useCallback(() => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.onstop = null;
      recorder.stop();
      recorderRef.current = null;
      chunksRef.current = [];
      setRecording(false);
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    window.speechSynthesis?.cancel(); setRevealIndex(null); setOpen(false);
  }, []);
  useFocusTrap(dialogRef, open, close);
  function submit(event: FormEvent) { event.preventDefault(); void sendMessage(draft); }
  function onComposerKey(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); void sendMessage(draft); }
  }

  const last = messages[messages.length - 1];
  const urgentNow = last?.role === "assistant" && last.answer?.urgent === true;

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="mx-4 mt-3 flex min-h-14 w-[calc(100%-2rem)] items-center gap-3 rounded-xl border border-[#B7D4D5] bg-white px-4 text-start text-[#092B4C] shadow-[0_2px_0_#D5E1E2] transition hover:border-[#0E6B73] md:fixed md:bottom-20 md:right-6 md:z-30 md:m-0 md:min-h-12 md:w-auto md:bg-[#092B4C] md:text-white md:shadow-[0_4px_0_#061B30]" aria-label={t.open}>
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#E7F4F4] text-[#0E6B73] md:h-auto md:w-auto md:bg-transparent md:text-[#BDEBF0]"><AgentIcon className="h-5 w-5" /></span>
        <span className="min-w-0"><span className="block text-sm font-extrabold">{t.launcherTitle}</span><span className="block text-[11px] font-medium text-slate-500 md:hidden">{t.launcherHint}</span></span>
      </button>

      {open ? <section ref={dialogRef} role="dialog" aria-modal="true" aria-label={t.dialogLabel} lang={lang} dir={localeDirection(lang)} className="fixed inset-0 z-50 flex flex-col bg-white text-[#0d0d0d] md:inset-y-4 md:left-auto md:right-4 md:w-[440px] md:overflow-hidden md:rounded-2xl md:border md:border-[#e3e3e3] md:shadow-[0_16px_48px_rgba(0,0,0,.12)]">
        <header className="flex h-14 shrink-0 items-center justify-between px-2">
          <button type="button" onClick={close} className={ICON_BUTTON} aria-label={t.close}><CloseIcon /></button>
          <div className="text-center leading-tight"><h2 className="text-[15px] font-semibold">Scam Shield AI</h2><p className="text-xs text-[#5d5d5d]">{t.subtitle}</p></div>
          <button type="button" onClick={() => { setSoundOn((value) => !value); window.speechSynthesis?.cancel(); }} className={ICON_BUTTON} aria-label={soundOn ? t.mute : t.unmute} aria-pressed={!soundOn}><VolumeIcon muted={!soundOn} /></button>
        </header>
        {/* Translations are unreviewed (voiceCopy.ts), so this safety line also shows in reviewed English. */}
        <div className="mx-4 flex shrink-0 items-start gap-2 rounded-lg bg-[#fff7e0] px-3 py-1.5 text-xs leading-5 text-[#6b4500]"><VerifyIcon className="mt-0.5 h-4 w-4 shrink-0" /><p>{t.notice}{lang !== "en" ? <span lang="en" dir="ltr" className="block">{VOICE_COPY.en.notice}</span> : null}</p></div>

        <p className="sr-only" aria-live="polite">{announcement}</p>
        <div ref={listRef} className="flex-1 overflow-y-auto px-4 pb-4 pt-5">
          {messages.length === 1 && !busy ? (
            <div className="flex min-h-full flex-col justify-end gap-6 pb-2">
              <div className="px-1">
                <span className="mb-3 grid h-10 w-10 place-items-center rounded-full border border-[#e3e3e3]"><AgentIcon className="h-5 w-5" /></span>
                <h3 className="text-2xl font-semibold tracking-tight">{t.emptyTitle}</h3>
                <p className="mt-1 text-[15px] leading-6 text-[#5d5d5d]">{t.emptyBody}</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {t.starters.map(([title, detail]) => (
                  <button key={title} type="button" onClick={() => void sendMessage(`${title} ${detail}`)} aria-label={`${title} ${detail}`} className={`rounded-2xl border border-[#e3e3e3] px-3.5 py-3 text-start hover:bg-[#f7f7f7] ${FOCUS}`}>
                    <span className="block text-sm font-medium">{title}</span>
                    <span className="block text-sm text-[#6b6b6b]">{detail}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {messages.map((message, index) => message.role === "user" ? (
                <div key={index} className="flex justify-end"><p dir="auto" className="max-w-[80%] whitespace-pre-wrap break-words rounded-[22px] bg-[#f0f0f0] px-4 py-2.5 text-base leading-6">{message.content}</p></div>
              ) : message.answer ? (
                <AssistantAnswer
                  key={index} answer={message.answer} replyLang={message.replyLang ?? "en"} animate={index === revealIndex} lang={lang} t={t} copied={copiedIndex === index}
                  note={message.replyLang && message.replyLang !== lang && provider !== "local_fallback" ? t.note ?? null : null}
                  onTick={scrollToEnd} onNavigate={close}
                  onCopy={() => void copy(message.content, index)}
                  onSpeak={() => speakNow([message.answer!.verdict, ...message.answer!.steps].join(" "), message.replyLang ?? "en", true)}
                />
              ) : <p key={index} className="text-base leading-7">{index === 0 ? t.welcome : message.content}</p>)}
              {busy ? <ReplyProgress label={transcribe.isPending ? t.transcribing : t.thinking} english={lang === "en"} /> : null}
              {error ? <p role="alert" className="flex gap-2 rounded-xl border border-[#f3c4c4] bg-[#fdecec] px-3 py-2.5 text-sm text-[#a4161a]"><ReportIcon className="mt-0.5 h-4 w-4 shrink-0" />{error}</p> : null}
              {provider === "local_fallback" ? <p className="text-center text-xs text-[#6b6b6b]">Preview guidance · Connect Groq for conversational responses</p> : null}
            </div>
          )}
        </div>

        <footer className="shrink-0 px-3 pb-[calc(.5rem+env(safe-area-inset-bottom))]">
          {urgentNow ? <a href="tel:1930" className={`mb-2 flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#c1121f] px-4 text-sm font-semibold text-white hover:bg-[#a4161a] ${FOCUS}`}><PhoneIcon className="h-4 w-4" />Call {HELPLINE_LABEL}</a> : null}
          <form onSubmit={submit} className="rounded-[26px] border border-[#e3e3e3] bg-[#f7f7f7] p-2 focus-within:border-[#b4b4b4]">
            <label htmlFor="voice-message" className="sr-only">{t.typeLabel}</label>
            <textarea id="voice-message" rows={1} value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={onComposerKey} maxLength={1_000} dir="auto" placeholder={recording ? t.listening : t.placeholder} className="block max-h-32 min-h-10 w-full resize-none bg-transparent px-2 py-2 text-base leading-6 text-[#0d0d0d] placeholder:text-[#6b6b6b] [field-sizing:content] focus:outline-none" />
            <div className="flex items-center justify-end gap-1.5">
              <button type="button" onClick={recording ? stopRecording : startRecording} disabled={busy} className={`grid h-9 w-9 place-items-center rounded-full disabled:opacity-40 ${recording ? "bg-[#c1121f] text-white" : "text-[#0d0d0d] hover:bg-[#e8e8e8]"} ${FOCUS}`} aria-label={recording ? t.stop : t.speak}>{recording ? <StopIcon /> : <MicrophoneIcon className="h-5 w-5" />}</button>
              <button type="submit" disabled={busy || !draft.trim()} className={`grid h-9 w-9 place-items-center rounded-full bg-[#0d0d0d] text-white disabled:bg-[#d9d9d9] disabled:text-[#8f8f8f] ${FOCUS}`} aria-label={t.send}><ArrowUpIcon className="h-5 w-5" /></button>
            </div>
          </form>
          <p className="mt-1.5 text-center text-xs text-[#6b6b6b]">{t.disclaimer}</p>
        </footer>
      </section> : null}
    </>
  );
}
