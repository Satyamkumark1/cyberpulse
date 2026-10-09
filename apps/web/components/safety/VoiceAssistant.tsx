"use client";

import Link from "next/link";
import { FormEvent, useRef, useState } from "react";
import { withLang, type Lang } from "@/lib/safety/copy";
import type { VoiceAnswer } from "@/lib/safety/voiceAgent";

type Message = { role: "user" | "assistant"; content: string };
type AgentResponse = VoiceAnswer & { provider: "groq" | "local_fallback" };

const SPEECH_LOCALES: Partial<Record<Lang, string>> = {
  en: "en-IN", hi: "hi-IN", bn: "bn-IN", gu: "gu-IN", kn: "kn-IN", ml: "ml-IN", mr: "mr-IN", pa: "pa-IN", ta: "ta-IN", te: "te-IN", ur: "ur-IN",
};

const WELCOME = "Hello. Tell me what is happening, or ask me to check, verify, report, or track something. Never share an OTP, PIN, password, or CVV.";

export function VoiceAssistant({ lang }: { lang: Lang }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([{ role: "assistant", content: WELCOME }]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [action, setAction] = useState<Pick<VoiceAnswer, "route" | "intent" | "urgent"> | null>(null);
  const [provider, setProvider] = useState<AgentResponse["provider"] | null>(null);
  const [soundOn, setSoundOn] = useState(true);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const messagesRef = useRef(messages);

  function appendMessage(message: Message) {
    setMessages((current) => {
      const next = [...current, message];
      messagesRef.current = next;
      return next;
    });
  }

  function speak(text: string) {
    if (!soundOn || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = SPEECH_LOCALES[lang] ?? "en-IN";
    utterance.rate = 0.95;
    window.speechSynthesis.speak(utterance);
  }

  async function sendMessage(raw: string) {
    const message = raw.trim();
    if (!message || busy) return;
    const previous = messagesRef.current.slice(-8);
    appendMessage({ role: "user", content: message });
    setDraft(""); setBusy(true); setError(null); setAction(null);
    try {
      const response = await fetch("/api/safety/voice", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, lang, history: previous }),
      });
      const payload = await response.json() as AgentResponse | { error?: string };
      if (!response.ok || !("reply" in payload)) {
        const message = "error" in payload ? payload.error : undefined;
        throw new Error(message ?? "The assistant is unavailable.");
      }
      appendMessage({ role: "assistant", content: payload.reply });
      setAction({ route: payload.route, intent: payload.intent, urgent: payload.urgent });
      setProvider(payload.provider);
      speak(payload.reply);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The assistant is unavailable.");
    } finally { setBusy(false); }
  }

  async function startRecording() {
    setError(null);
    if (!navigator.mediaDevices?.getUserMedia || !("MediaRecorder" in window)) {
      setError("Voice recording is not supported here. Type your message instead."); return;
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
        const body = new FormData(); body.set("audio", audio); if (lang.length === 2) body.set("language", lang);
        try {
          const response = await fetch("/api/safety/transcribe", { method: "POST", body });
          const payload = await response.json() as { transcript?: string; error?: string };
          if (!response.ok || !payload.transcript) throw new Error(payload.error ?? "I could not understand the recording.");
          setBusy(false); await sendMessage(payload.transcript);
        } catch (caught) {
          setBusy(false); setError(caught instanceof Error ? caught.message : "I could not understand the recording.");
        }
      };
      recorder.start(); setRecording(true);
    } catch {
      setError("Microphone access was not allowed. You can type your message instead.");
    }
  }

  function stopRecording() { recorderRef.current?.stop(); }
  function close() {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.onstop = null;
      recorder.stop();
      recorderRef.current = null;
      chunksRef.current = [];
      setRecording(false);
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    window.speechSynthesis?.cancel(); setOpen(false);
  }
  function submit(event: FormEvent) { event.preventDefault(); void sendMessage(draft); }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="fixed bottom-[82px] right-4 z-20 inline-flex min-h-12 items-center gap-2 rounded-full bg-blue-700 px-4 text-sm font-bold text-white shadow-[0_12px_30px_rgba(29,78,216,.35)] hover:bg-blue-800 md:bottom-6 md:right-6" aria-label="Open Scam Shield voice assistant">
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5"><rect x="8" y="3" width="8" height="12" rx="4" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3M9 21h6" /></svg>
        <span>Ask AI</span>
      </button>

      {open ? <section role="dialog" aria-modal="true" aria-label="Scam Shield AI assistant" className="fixed inset-0 z-50 flex flex-col bg-[#f5f7fb] md:inset-y-4 md:left-auto md:right-4 md:w-[420px] md:rounded-[28px] md:border md:border-slate-200 md:shadow-2xl">
        <header className="flex min-h-16 items-center justify-between border-b border-slate-200 bg-white px-4 md:rounded-t-[28px]">
          <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 text-white"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5"><path d="M12 3 5 6v5c0 5 2.9 8.2 7 10 4.1-1.8 7-5 7-10V6Z" /><path d="M8 12h1m2 0h1m2 0h1" /></svg></span><div><h2 className="font-bold text-slate-950">Scam Shield AI</h2><p className="text-xs text-emerald-700">Safety assistant</p></div></div>
          <div className="flex gap-1"><button type="button" onClick={() => { setSoundOn((value) => !value); window.speechSynthesis?.cancel(); }} className="grid h-10 w-10 place-items-center rounded-full text-slate-600 hover:bg-slate-100" aria-label={soundOn ? "Mute spoken responses" : "Enable spoken responses"}><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5"><path d="M5 10v4h3l4 3V7l-4 3Z" />{soundOn ? <><path d="M16 9a4 4 0 0 1 0 6" /><path d="M18.5 6.5a8 8 0 0 1 0 11" /></> : <path d="m17 10 4 4m0-4-4 4" />}</svg></button><button type="button" onClick={close} className="grid h-10 w-10 place-items-center rounded-full text-2xl text-slate-600 hover:bg-slate-100" aria-label="Close assistant">×</button></div>
        </header>

        <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs leading-5 text-amber-950">Do not share an OTP, PIN, password, CVV, or full bank details.</div>
        <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4" aria-live="polite">
          {messages.map((message, index) => <div key={`${message.role}-${index}`} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}><p className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-6 ${message.role === "user" ? "rounded-br-md bg-blue-700 text-white" : "rounded-bl-md border border-slate-200 bg-white text-slate-700 shadow-sm"}`}>{message.content}</p></div>)}
          {busy ? <div className="flex justify-start"><div className="rounded-2xl rounded-bl-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">Thinking…</div></div> : null}
          {error ? <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div> : null}
          {action?.route ? <div className={`rounded-2xl border p-3 ${action.urgent ? "border-red-200 bg-red-50" : "border-blue-200 bg-blue-50"}`}><p className="text-xs font-bold uppercase tracking-wider text-slate-600">Suggested next step</p><Link href={withLang(action.route, lang)} onClick={close} className={`mt-2 flex min-h-11 items-center justify-center rounded-xl px-4 text-sm font-bold text-white ${action.urgent ? "bg-red-600" : "bg-blue-700"}`}>{action.intent === "REPORT" ? "Open urgent report steps" : action.intent === "STATUS" ? "Track my report" : action.intent === "VERIFY" ? "Open verification" : "Check for scam signs"}</Link></div> : null}
          {provider === "local_fallback" ? <p className="text-center text-[11px] text-slate-500">Preview guidance · Connect Groq for conversational responses</p> : null}
        </div>

        <footer className="border-t border-slate-200 bg-white p-3 pb-[calc(.75rem+env(safe-area-inset-bottom))] md:rounded-b-[28px]">
          <div className="mb-2 flex justify-center"><button type="button" onClick={recording ? stopRecording : startRecording} disabled={busy} className={`inline-flex min-h-12 items-center gap-2 rounded-full px-5 text-sm font-bold text-white disabled:opacity-50 ${recording ? "bg-red-600" : "bg-blue-700"}`}><span className={`h-2.5 w-2.5 rounded-full ${recording ? "animate-pulse bg-white" : "bg-cyan-300"}`} />{recording ? "Stop recording" : "Tap to speak"}</button></div>
          <form onSubmit={submit} className="flex gap-2"><label htmlFor="voice-message" className="sr-only">Type your message</label><input id="voice-message" value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={1_000} placeholder="Or type what happened…" className="min-h-12 min-w-0 flex-1 rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-blue-500" /><button type="submit" disabled={busy || !draft.trim()} className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-slate-950 text-white disabled:bg-slate-300" aria-label="Send message">➜</button></form>
          <p className="mt-2 text-center text-[10px] text-slate-500">AI can make mistakes. Confirm important actions yourself.</p>
        </footer>
      </section> : null}
    </>
  );
}
