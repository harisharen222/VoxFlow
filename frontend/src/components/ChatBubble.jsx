// ChatBubble.jsx — Clean, production-grade message bubbles
import { FileText } from "lucide-react";

export default function ChatBubble({ role, text, content, sources = [] }) {
  const isUser = role === "user";
  // Accept both `text` and `content` prop
  const message = content ?? text ?? "";

  return (
    <div className={`flex gap-3 fade-in-up ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      {/* Avatar */}
      <div
        className={`
          w-7 h-7 rounded-full shrink-0 flex items-center justify-center
          text-[11px] font-bold tracking-wide select-none
          ${isUser
            ? "bg-indigo-100 text-indigo-700 border border-indigo-200"
            : "bg-gradient-to-br from-indigo-500 to-violet-500 text-white"
          }
        `}
      >
        {isUser ? "U" : "AI"}
      </div>

      {/* Bubble */}
      <div className={`flex flex-col gap-1.5 max-w-[72%] ${isUser ? "items-end" : "items-start"}`}>
        <div
          className={`
            px-4 py-3 rounded-2xl text-sm leading-relaxed
            ${isUser
              ? "bg-indigo-600 text-white rounded-tr-sm"
              : "bg-white border border-gray-200 text-gray-800 rounded-tl-sm shadow-sm"
            }
          `}
        >
          <p className="whitespace-pre-wrap">{message}</p>
        </div>

        {/* Sources */}
        {sources.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-1">
            {sources.map((s, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1.5 text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-full px-2.5 py-1"
              >
                <FileText size={10} strokeWidth={2} />
                {s.source ?? s}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
