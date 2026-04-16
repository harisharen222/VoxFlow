// ChatBubble.jsx — Clean chat message bubbles
export default function ChatBubble({ role, content, sources = [] }) {
  const isUser = role === "user";
  return (
    <div className={`flex gap-3 mb-5 fade-in-up ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      {/* Avatar */}
      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-semibold
        ${isUser
          ? "bg-accent/20 text-accent border border-accent/30"
          : "bg-gradient-to-br from-accent to-accent-3 text-white"
        }`}
      >
        {isUser ? "U" : "AI"}
      </div>

      {/* Bubble */}
      <div className={`max-w-[78%] ${isUser ? "items-end" : "items-start"} flex flex-col gap-2`}>
        <div
          className={`px-4 py-3 rounded-2xl text-sm leading-relaxed
            ${isUser
              ? "bg-accent/15 border border-accent/25 text-txt rounded-tr-sm"
              : "bg-card border border-border text-txt rounded-tl-sm"
            }`}
        >
          <p className="whitespace-pre-wrap">{content}</p>
        </div>

        {/* Sources */}
        {sources && sources.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {sources.map((s, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 badge bg-white/5 border border-white/8 text-txt-3"
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                {s.source || s}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
