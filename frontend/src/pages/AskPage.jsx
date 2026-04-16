// AskPage.jsx — Main voice + chat interface (hero of the app)
import { useEffect, useRef, useState } from "react";
import api from "../hooks/useApi.js";
import { useSession } from "../context/SessionContext.jsx";
import { useToast } from "../hooks/useToast.js";
import ChatBubble from "../components/ChatBubble.jsx";
import VoiceOrb from "../components/VoiceOrb.jsx";
import Spinner from "../components/Spinner.jsx";

const SUGGESTIONS = [
  "What documents have been uploaded?",
  "Summarize the latest knowledge base",
  "Find information about the project",
  "What can you help me with?",
];

export default function AskPage() {
  const { sessionId, userId } = useSession();
  const toast = useToast();

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [orbState, setOrbState] = useState("idle"); // idle | listening | thinking | speaking
  const textareaRef = useRef(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  function autoResize() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
  }

  async function send(q) {
    const question = (q || input).trim();
    if (!question || loading) return;
    setMessages((m) => [...m, { role: "user", content: question }]);
    setInput("");
    setTimeout(autoResize, 0);
    setLoading(true);
    setOrbState("thinking");
    try {
      const res = await api.post("/ask", { question, session_id: sessionId, user_id: userId });
      setOrbState("speaking");
      setMessages((m) => [...m, { role: "assistant", content: res.answer || "(no answer)", sources: res.sources || [] }]);
      setTimeout(() => setOrbState("idle"), 1500);
    } catch (err) {
      toast.error(err.message || "Failed to get answer");
      setMessages((m) => [...m, { role: "assistant", content: err.message || "Request failed", sources: [] }]);
      setOrbState("idle");
    } finally {
      setLoading(false);
    }
  }

  function onKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  }

  const isEmpty = messages.length === 0;

  return (
    <div className="flex h-full flex-col bg-bg">

      {/* ── Two-panel Layout ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* LEFT — Chat + Orb */}
        <div className="flex flex-col flex-1 overflow-hidden">

          {/* Hero area (empty state) */}
          {isEmpty ? (
            <div className="flex flex-1 flex-col items-center justify-center px-6 text-center gap-8">

              {/* Voice Orb */}
              <VoiceOrb state={orbState} size={140} onClick={() => {}} />

              {/* Headline */}
              <div className="max-w-lg">
                <h1 className="text-3xl font-bold tracking-tight mb-3">
                  <span className="gradient-text">Talk. Get Answers.</span>
                  <br />
                  <span className="text-txt">Get Things Done.</span>
                </h1>
                <p className="text-txt-2 text-base leading-relaxed">
                  Your voice-powered AI that finds information, creates tasks,<br />
                  schedules meetings, and remembers everything.
                </p>
              </div>

              {/* Feature chips */}
              <div className="flex flex-wrap gap-2 justify-center max-w-md">
                {[
                  { icon: "🔍", text: "Smart Search" },
                  { icon: "✅", text: "Task Creation" },
                  { icon: "📅", text: "Meeting Scheduler" },
                  { icon: "👤", text: "People Lookup" },
                  { icon: "🧠", text: "Memory" },
                  { icon: "📄", text: "Doc Summaries" },
                ].map((f) => (
                  <span key={f.text} className="badge bg-white/5 border border-white/8 text-txt-2 text-xs px-3 py-1.5 rounded-full">
                    <span className="mr-1">{f.icon}</span>{f.text}
                  </span>
                ))}
              </div>

              {/* Suggestion pills */}
              <div className="flex flex-col gap-2 w-full max-w-md">
                <p className="text-xs text-txt-3 text-left font-medium uppercase tracking-wider mb-1">Try asking</p>
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="text-left px-4 py-3 rounded-xl bg-card border border-border text-sm text-txt-2 hover:text-txt hover:border-accent/40 hover:bg-card-2 transition-all duration-200 card-hover"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {/* Compact orb header when chatting */}
              <div className="flex items-center gap-3 px-6 py-4 border-b border-border shrink-0">
                <VoiceOrb state={orbState} size={44} onClick={() => {}} />
                <div>
                  <p className="text-sm font-semibold text-txt">Knowledge Agent</p>
                  <p className="text-xs text-txt-3">Session · {sessionId.slice(0, 8)}…</p>
                </div>
                <button
                  onClick={async () => {
                    try { await api.delete(`/memory/session/${encodeURIComponent(sessionId)}`); setMessages([]); toast.success("Session cleared"); }
                    catch (e) { toast.error(e.message); }
                  }}
                  className="ml-auto btn-ghost text-xs py-1.5 px-3"
                >
                  Clear
                </button>
              </div>

              {/* Messages */}
              <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-6">
                {messages.map((m, i) => (
                  <ChatBubble key={i} role={m.role} content={m.content} sources={m.sources} />
                ))}
                {loading && (
                  <div className="flex items-center gap-2 text-sm text-txt-2 ml-11">
                    <Spinner size={14} /> <span>Thinking...</span>
                  </div>
                )}
              </div>
            </>
          )}

          {/* ── Input Bar ── */}
          <div className="shrink-0 border-t border-border bg-surface/60 backdrop-blur-md px-4 md:px-6 py-4">
            <div className="flex items-end gap-3 max-w-3xl mx-auto">
              <div className="flex-1 relative">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => { setInput(e.target.value); autoResize(); }}
                  onKeyDown={onKeyDown}
                  rows={1}
                  placeholder="Ask anything… press Enter to send"
                  className="input resize-none pr-4 py-3 text-sm"
                  disabled={loading}
                />
              </div>
              <button
                onClick={() => send()}
                disabled={loading || !input.trim()}
                className="btn btn-primary h-[46px] w-[46px] p-0 rounded-xl shrink-0"
              >
                {loading ? <Spinner size={16} /> : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13"/>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
