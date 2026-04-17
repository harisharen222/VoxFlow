// AskPage.jsx — Talk page: VoiceOrb + Chat + Context Panel
import { useState, useEffect, useRef } from "react";
import {
  Mic, Search, Zap, CheckCircle2, BookOpen, Brain,
  Send, ChevronRight,
} from "lucide-react";
import VoiceOrb from "../components/VoiceOrb.jsx";
import ChatBubble from "../components/ChatBubble.jsx";
import ActionCard from "../components/ActionCard.jsx";

// ── Static mock data for right panel ─────────────────────────────────────────
const MOCK_KNOWLEDGE = [
  { title: "Q3 Planning Document", excerpt: "Key initiatives include expanding the AI assistant capabilities…", source: "Drive" },
  { title: "Design Guidelines v2", excerpt: "All primary actions should use rounded-2xl with 48px touch targets…", source: "Notion" },
  { title: "Team Meeting Notes", excerpt: "Action items from last week: finalize roadmap, schedule review…", source: "Drive" },
];

const MOCK_MEMORIES = [
  { text: "User prefers concise summaries over long answers.", time: "3 days ago" },
  { text: "Last task created was for Priya at 10 AM.", time: "1 day ago" },
  { text: "Frequently asks about Q3 metrics and roadmap.", time: "2 hrs ago" },
];

// ── Agent status steps ─────────────────────────────────────────────────────
const STEPS = [
  { label: "Awaiting input",      Icon: Mic },
  { label: "Thinking",            Icon: Brain },
  { label: "Searching knowledge", Icon: Search },
  { label: "Executing action",    Icon: Zap },
  { label: "Done",                Icon: CheckCircle2 },
];

// ── Demo response sequence ─────────────────────────────────────────────────
function useDemoFlow(chatLength, setOrbState, setAiStep, setChat) {
  useEffect(() => {
    if (chatLength === 0) return;
    setOrbState("thinking");
    setAiStep(1);

    const t1 = setTimeout(() => setAiStep(2), 1200);
    const t2 = setTimeout(() => setAiStep(3), 2400);
    const t3 = setTimeout(() => {
      setAiStep(4);
      setOrbState("speaking");
      setChat((prev) => [
        ...prev,
        {
          role: "ai",
          text: "Done — I've created the task 'Follow up with Priya' and added it to your queue. Is there anything else you'd like me to do?",
        },
      ]);
    }, 3800);
    const t4 = setTimeout(() => setOrbState("idle"), 6500);

    return () => [t1, t2, t3, t4].forEach(clearTimeout);
  }, [chatLength]);
}

export default function AskPage() {
  const [orbState, setOrbState] = useState("idle");
  const [chat, setChat] = useState([]);
  const [activeTab, setActiveTab] = useState("actions");
  const [aiStep, setAiStep] = useState(0);
  const [inputText, setInputText] = useState("");
  const chatEndRef = useRef(null);

  useDemoFlow(chat.length, setOrbState, setAiStep, setChat);

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat]);

  function startDemo() {
    if (chat.length > 0 || orbState !== "idle") return;
    setOrbState("listening");
    setTimeout(() => {
      setChat([{ role: "user", text: "Create a task for Priya" }]);
    }, 800);
  }

  function handleSend(e) {
    e.preventDefault();
    const text = inputText.trim();
    if (!text) return;
    setInputText("");
    setChat((prev) => [...prev, { role: "user", text }]);
  }

  const TABS = ["actions", "knowledge", "memory"];

  return (
    <div className="flex w-full h-full overflow-hidden">

      {/* ── LEFT: Chat Area (60%) ──────────────────────────── */}
      <div className="w-[60%] flex flex-col h-full bg-[#F8F9FB] border-r border-gray-200">

        {/* Orb Section */}
        <div
          className="shrink-0 flex flex-col items-center justify-center gap-2 py-10 border-b border-gray-200 bg-white cursor-pointer select-none"
          onClick={startDemo}
          title="Click to start demo"
        >
          <VoiceOrb state={orbState} />
          {chat.length === 0 && orbState === "idle" && (
            <p className="text-xs text-gray-400 mt-2 flex items-center gap-1.5">
              Click the orb to begin a demo <ChevronRight size={12} />
            </p>
          )}
        </div>

        {/* Chat messages */}
        <div className="flex-1 overflow-y-auto px-8 py-6 space-y-4">
          {chat.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-4 opacity-60">
              <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center">
                <Mic size={22} className="text-gray-400" strokeWidth={1.5} />
              </div>
              <div>
                <p className="font-semibold text-gray-700 text-sm">Start by speaking to your assistant</p>
                <ul className="mt-3 space-y-1.5 text-sm text-gray-500 text-left">
                  {[
                    "\"Create a task for Priya\"",
                    "\"Summarize my documents\"",
                    "\"What did I ask earlier?\"",
                  ].map((s) => (
                    <li key={s} className="flex items-center gap-2">
                      <span className="w-1 h-1 rounded-full bg-indigo-400 shrink-0" />
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <>
              {chat.map((msg, i) => (
                <ChatBubble key={i} role={msg.role} text={msg.text} />
              ))}
              <div ref={chatEndRef} />
            </>
          )}
        </div>

        {/* Text input bar */}
        <div className="shrink-0 border-t border-gray-200 bg-white px-6 py-4">
          <form onSubmit={handleSend} className="relative">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Type a message or command…"
              className="
                w-full rounded-xl bg-gray-50 border border-gray-200
                pl-4 pr-12 py-3 text-sm text-gray-900 placeholder:text-gray-400
                focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400
                transition-all duration-200
              "
            />
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="
                absolute right-2 top-1/2 -translate-y-1/2
                w-8 h-8 rounded-lg flex items-center justify-center
                bg-indigo-600 text-white
                hover:bg-indigo-700 disabled:opacity-30 disabled:cursor-not-allowed
                transition-all duration-150
              "
            >
              <Send size={14} strokeWidth={2.2} />
            </button>
          </form>
        </div>
      </div>

      {/* ── RIGHT: Context Panel (40%) ─────────────────────── */}
      <div className="w-[40%] flex flex-col h-full bg-white">

        {/* Tabs */}
        <div className="flex border-b border-gray-200 px-6 pt-5 shrink-0 gap-1">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`
                px-4 py-2.5 text-sm font-semibold capitalize border-b-2
                transition-all duration-150
                ${activeTab === tab
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-gray-400 hover:text-gray-700"
                }
              `}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Panel content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50/50">

          {/* ── ACTIONS TAB ── */}
          {activeTab === "actions" && (
            <>
              {/* Agent Status */}
              {chat.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm fade-in-up">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                    <h3 className="text-sm font-semibold text-gray-800">Agent Status</h3>
                  </div>

                  <div className="space-y-3">
                    {STEPS.map(({ label, Icon }, idx) => {
                      const done = idx < aiStep;
                      const active = idx === aiStep;
                      const pending = idx > aiStep;
                      return (
                        <div
                          key={idx}
                          className={`flex items-center gap-3 transition-opacity duration-300 ${pending ? "opacity-30" : "opacity-100"}`}
                        >
                          <div
                            className={`
                              w-6 h-6 rounded-full flex items-center justify-center shrink-0
                              transition-all duration-300
                              ${done   ? "bg-emerald-500 text-white"
                              : active ? "bg-indigo-600 text-white"
                              :          "bg-gray-100 text-gray-400"}
                            `}
                          >
                            {done
                              ? <CheckCircle2 size={13} strokeWidth={2.5} />
                              : <Icon size={12} strokeWidth={active ? 2.5 : 1.8} />
                            }
                          </div>
                          <span
                            className={`text-sm font-medium ${
                              active ? "text-indigo-600" : done ? "text-gray-600" : "text-gray-400"
                            }`}
                          >
                            {label}
                            {active && "…"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Action result */}
              {aiStep === 4 && (
                <div className="space-y-2 fade-in-up">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-1">Output</p>
                  <ActionCard
                    title="Task Created"
                    description="Follow up with Priya at 10 AM to review the design files."
                    time="Just now"
                    type="task"
                  />
                </div>
              )}

              {/* Empty state */}
              {chat.length === 0 && (
                <div className="flex flex-col items-center justify-center h-48 text-center">
                  <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center mb-3">
                    <Zap size={18} className="text-gray-400" strokeWidth={1.5} />
                  </div>
                  <p className="text-sm font-medium text-gray-500">Actions will appear here</p>
                  <p className="text-xs text-gray-400 mt-1">Start a conversation to see results</p>
                </div>
              )}
            </>
          )}

          {/* ── KNOWLEDGE TAB ── */}
          {activeTab === "knowledge" && (
            <div className="space-y-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-1">
                Relevant Sources
              </p>
              {MOCK_KNOWLEDGE.map((k, i) => (
                <div
                  key={i}
                  className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-sm transition-all duration-150 fade-in-up"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                      <BookOpen size={15} className="text-blue-600" strokeWidth={1.8} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-semibold text-gray-800 truncate">{k.title}</p>
                        <span className="shrink-0 text-[10px] font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-md">
                          {k.source}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">{k.excerpt}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── MEMORY TAB ── */}
          {activeTab === "memory" && (
            <div className="space-y-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-1">
                Stored Memories
              </p>
              {MOCK_MEMORIES.map((m, i) => (
                <div
                  key={i}
                  className="bg-white rounded-xl border border-gray-200 p-4 fade-in-up hover:shadow-sm transition-all duration-150"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center shrink-0">
                      <Brain size={15} className="text-violet-600" strokeWidth={1.8} />
                    </div>
                    <div>
                      <p className="text-sm text-gray-700 leading-relaxed">{m.text}</p>
                      <p className="text-xs text-gray-400 mt-1.5 font-medium">{m.time}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
