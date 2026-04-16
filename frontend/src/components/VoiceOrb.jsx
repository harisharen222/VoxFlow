// VoiceOrb.jsx — Animated voice orb with 4 states: idle | listening | thinking | speaking
export default function VoiceOrb({ state = "idle", onClick, size = 120 }) {
  const stateConfig = {
    idle: {
      label: "Tap to speak",
      className: "orb-idle",
      gradient: "from-[#2a2060] via-[#1a1840] to-[#0f0f20]",
      ring: "border-[#6c63ff]/30",
      icon: (
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-[#a78bfa]">
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
          <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
          <line x1="12" y1="19" x2="12" y2="23"/>
          <line x1="8" y1="23" x2="16" y2="23"/>
        </svg>
      ),
    },
    listening: {
      label: "Listening...",
      className: "orb-listening",
      gradient: "from-[#064e1f] via-[#052a10] to-[#021408]",
      ring: "border-green-500/50",
      icon: (
        <div className="flex items-end gap-[3px] h-9">
          {[5,9,14,10,16,8,5].map((h, i) => (
            <div key={i} className="wave-bar bg-green-400 rounded-full w-[3px]" style={{ height: `${h * 2}px`, animationDelay: `${i * 0.1}s` }} />
          ))}
        </div>
      ),
    },
    thinking: {
      label: "Thinking...",
      className: "",
      gradient: "from-[#1a1060] via-[#12083a] to-[#080520]",
      ring: "border-[#6c63ff]/60",
      icon: (
        <div className="spin" style={{ width: 36, height: 36 }}>
          <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
            <circle cx="18" cy="18" r="15" stroke="#2a2060" strokeWidth="3"/>
            <path d="M18 3 A15 15 0 0 1 33 18" stroke="url(#tg)" strokeWidth="3" strokeLinecap="round"/>
            <defs>
              <linearGradient id="tg" x1="18" y1="3" x2="33" y2="18" gradientUnits="userSpaceOnUse">
                <stop stopColor="#a78bfa"/>
                <stop offset="1" stopColor="#38bdf8"/>
              </linearGradient>
            </defs>
          </svg>
        </div>
      ),
    },
    speaking: {
      label: "Speaking...",
      className: "orb-speaking",
      gradient: "from-[#0c2a50] via-[#071630] to-[#040e1e]",
      ring: "border-sky-400/50",
      icon: (
        <div className="flex items-end gap-[3px] h-9">
          {[8,13,18,14,10,15,9].map((h, i) => (
            <div key={i} className="wave-bar bg-sky-400 rounded-full w-[3px]" style={{ height: `${h * 2}px`, animationDelay: `${i * 0.08}s` }} />
          ))}
        </div>
      ),
    },
  };

  const cfg = stateConfig[state] || stateConfig.idle;

  return (
    <div className="flex flex-col items-center gap-4 select-none">
      <button
        onClick={onClick}
        style={{ width: size, height: size }}
        className={`
          relative rounded-full flex items-center justify-center cursor-pointer
          bg-gradient-to-br ${cfg.gradient}
          border-2 ${cfg.ring}
          transition-all duration-300
          ${cfg.className}
          hover:scale-105 active:scale-95
        `}
      >
        {/* Inner glow */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/5 to-transparent" />
        {cfg.icon}
      </button>
      <span className="text-sm font-medium text-txt-2">{cfg.label}</span>
    </div>
  );
}
