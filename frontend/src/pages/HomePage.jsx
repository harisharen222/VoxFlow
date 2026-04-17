// HomePage.jsx — Production-grade landing / home screen
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CheckSquare, Search, FileText, Calendar,
  Mic, Send, CheckCircle2, ArrowRight,
} from "lucide-react";
import { getGreeting, getRecentAction } from "../lib/mockData.js";

// ── Feature cards data ─────────────────────────────────────────────────────
const FEATURE_CARDS = [
  {
    Icon: CheckSquare,
    title: "Create Task",
    desc: "Add and track tasks instantly with voice",
    iconBg: "bg-indigo-50",
    iconColor: "text-indigo-600",
  },
  {
    Icon: Search,
    title: "Search Knowledge",
    desc: "Find answers across all your documents",
    iconBg: "bg-blue-50",
    iconColor: "text-blue-600",
  },
  {
    Icon: FileText,
    title: "Summarize Content",
    desc: "Get concise summaries from any file",
    iconBg: "bg-violet-50",
    iconColor: "text-violet-600",
  },
  {
    Icon: Calendar,
    title: "Schedule Meeting",
    desc: "Plan and manage meetings effortlessly",
    iconBg: "bg-orange-50",
    iconColor: "text-orange-500",
  },
];

const SUGGESTIONS = [
  "Summarize my documents",
  "Find meeting notes",
  "Create a task for Priya",
  "What did I ask earlier?",
];

// ── Component ──────────────────────────────────────────────────────────────
export default function HomePage() {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  // Stable values — only computed once
  const [greeting] = useState(() => getGreeting());
  const [recentAction] = useState(() => getRecentAction());

  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim()) navigate("/talk");
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-[#F8F9FB]">
      {/* ── Scrollable content ── */}
      <div className="flex-1 w-full max-w-5xl mx-auto px-10 pt-14 pb-8 space-y-10">

        {/* ── Hero ─────────────────────────────────────────── */}
        <div className="space-y-3">
          <p className="text-sm font-medium text-gray-400 tracking-wide">
            {greeting}, Varun
          </p>
          <h1 className="text-4xl font-bold text-gray-900 tracking-tight leading-tight">
            Talk. Get Answers.<br />
            <span className="text-indigo-600">Get Things Done.</span>
          </h1>
          <p className="text-base text-gray-500 max-w-xl leading-relaxed">
            Your AI assistant that finds information, creates tasks, and automates your work — all through voice.
          </p>
        </div>

        {/* ── Feature cards ────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {FEATURE_CARDS.map(({ Icon, title, desc, iconBg, iconColor }) => (
            <button
              key={title}
              onClick={() => navigate("/talk")}
              className="
                group relative flex flex-col gap-4 bg-white rounded-2xl p-5 text-left
                border border-gray-200 h-44
                shadow-sm hover:shadow-md
                hover:-translate-y-1
                transition-all duration-200
                focus:outline-none focus:ring-2 focus:ring-indigo-200
              "
            >
              {/* Icon */}
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${iconBg}`}>
                <Icon size={18} strokeWidth={1.8} className={iconColor} />
              </div>

              {/* Text */}
              <div>
                <h3 className="font-semibold text-gray-900 text-sm leading-snug mb-1">{title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
              </div>

              {/* Arrow — appears on hover */}
              <ArrowRight
                size={14}
                className="absolute bottom-4 right-4 text-gray-300 group-hover:text-indigo-500 transition-colors duration-200"
              />
            </button>
          ))}
        </div>

        {/* ── Recent Action ─────────────────────────────────── */}
        <div
          className="
            flex items-center gap-4 bg-white rounded-2xl px-5 py-4
            border border-gray-100 shadow-sm
            fade-in-up
          "
        >
          <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
            <CheckCircle2 size={16} className="text-emerald-600" strokeWidth={2} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Last action</p>
            <p className="text-sm font-medium text-gray-800 truncate">{recentAction.text}</p>
          </div>
          <span className="text-xs text-gray-400 font-medium shrink-0">{recentAction.time}</span>
        </div>

      </div>

      {/* ── Sticky Input Section ──────────────────────────────── */}
      <div className="sticky bottom-0 w-full border-t border-gray-200 bg-[#F8F9FB] px-10 py-5">
        <div className="max-w-5xl mx-auto space-y-3">

          {/* Suggestion pills */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-gray-400 font-medium">Try:</span>
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => setQuery(s)}
                className="
                  text-xs font-medium text-gray-600 bg-white border border-gray-200
                  px-3 py-1.5 rounded-full
                  hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50
                  transition-all duration-150
                "
              >
                {s}
              </button>
            ))}
          </div>

          {/* Input bar */}
          <form onSubmit={handleSubmit} className="relative">
            <Search
              size={17}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
            />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask anything or give a command…"
              className="
                w-full rounded-2xl bg-white border border-gray-200
                pl-11 pr-28 py-3.5
                text-sm text-gray-900 placeholder:text-gray-400
                focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400
                shadow-sm transition-all duration-200
              "
            />

            {/* Right buttons */}
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <button
                type="button"
                onClick={() => navigate("/talk")}
                className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all duration-150"
                title="Voice input"
              >
                <Mic size={17} strokeWidth={2} />
              </button>
              <button
                type="submit"
                className="w-9 h-9 rounded-xl flex items-center justify-center bg-gray-900 text-white hover:bg-indigo-600 transition-all duration-150"
                title="Send"
              >
                <Send size={15} strokeWidth={2.2} />
              </button>
            </div>
          </form>

          <p className="text-center text-xs text-gray-400">
            Or{" "}
            <button
              onClick={() => navigate("/talk")}
              className="text-indigo-600 font-semibold hover:underline"
            >
              speak to your assistant
            </button>
            {" "}· Responses are grounded in your uploaded knowledge.
          </p>
        </div>
      </div>
    </div>
  );
}
