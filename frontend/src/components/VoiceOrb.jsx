// VoiceOrb.jsx — Production-grade orb with proper states and animations
import { Mic, Loader2 } from "lucide-react";

const STATE_CONFIG = {
  idle: {
    outer: "orb-idle bg-white border border-gray-200 shadow-sm",
    inner: "bg-indigo-600",
    label: "Tap to speak",
    labelColor: "text-gray-400",
  },
  listening: {
    outer: "orb-listening bg-white border border-indigo-200 shadow-glow",
    inner: "bg-indigo-600",
    label: "Listening…",
    labelColor: "text-indigo-500",
  },
  thinking: {
    outer: "bg-white border border-indigo-100 shadow-soft",
    inner: "bg-indigo-50",
    label: "Thinking…",
    labelColor: "text-indigo-400",
  },
  speaking: {
    outer: "bg-white border-2 border-indigo-500 shadow-glow",
    inner: "bg-indigo-600",
    label: "Speaking…",
    labelColor: "text-indigo-500",
  },
};

function WaveBars({ large = false }) {
  const h = large ? ["h-3", "h-6", "h-4", "h-7", "h-3"] : ["h-2", "h-4", "h-3", "h-5", "h-2"];
  return (
    <div className="flex gap-1.5 items-end justify-center" style={{ height: large ? 28 : 20 }}>
      {h.map((cls, i) => (
        <div
          key={i}
          className={`w-1.5 bg-white rounded-full ${cls} wave-bar`}
          style={{ animationDelay: `${i * 0.1}s` }}
        />
      ))}
    </div>
  );
}

export default function VoiceOrb({ state = "idle", onClick }) {
  const cfg = STATE_CONFIG[state] ?? STATE_CONFIG.idle;

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Orb */}
      <button
        onClick={onClick}
        className={`
          relative flex items-center justify-center
          w-32 h-32 rounded-full
          transition-all duration-500 cursor-pointer
          focus:outline-none focus:ring-4 focus:ring-indigo-200
          active:scale-95
          ${cfg.outer}
        `}
        aria-label={cfg.label}
      >
        {/* Inner disc */}
        <div
          className={`
            absolute flex items-center justify-center
            w-20 h-20 rounded-full
            transition-all duration-500
            ${cfg.inner}
          `}
        >
          {state === "idle" && <Mic size={26} stroke="white" strokeWidth={2} />}

          {state === "listening" && <WaveBars />}

          {state === "thinking" && (
            <Loader2
              size={26}
              stroke="rgba(79,70,229,0.6)"
              strokeWidth={2.5}
              className="animate-spin"
            />
          )}

          {state === "speaking" && <WaveBars large />}
        </div>
      </button>

      {/* State label */}
      <p className={`text-sm font-medium tracking-wide transition-colors duration-300 ${cfg.labelColor}`}>
        {cfg.label}
      </p>
    </div>
  );
}
