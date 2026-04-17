// StatCard.jsx — Reusable stat card with trend indicator
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Mic2,
  MessageSquare,
  CheckCircle2,
  Database,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

const ICON_MAP = {
  Mic2,
  MessageSquare,
  CheckCircle2,
  Database,
};

// Animate number counting up from 0 → value
function useCountUp(target, duration = 900) {
  const [count, setCount] = useState(0);
  const frame = useRef(null);

  useEffect(() => {
    const start = performance.now();
    const step = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setCount(Math.floor(eased * target));
      if (progress < 1) frame.current = requestAnimationFrame(step);
    };
    frame.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame.current);
  }, [target, duration]);

  return count;
}

export default function StatCard({ label, value, trend, positive, icon: iconName }) {
  const animated = useCountUp(value);
  const Icon = ICON_MAP[iconName] ?? Mic2;

  const TrendIcon =
    positive === true ? TrendingUp : positive === false ? TrendingDown : Minus;

  const trendColor =
    positive === true
      ? "text-emerald-600"
      : positive === false
      ? "text-red-500"
      : "text-gray-400";

  const trendBg =
    positive === true
      ? "bg-emerald-50"
      : positive === false
      ? "bg-red-50"
      : "bg-gray-100";

  const trendSign = positive === true ? "+" : positive === false ? "-" : "±";

  return (
    <div className="card card-hover p-6 flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-indigo-50 text-accent`}>
          <Icon size={20} strokeWidth={1.8} />
        </div>
        <span
          className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${trendColor} ${trendBg}`}
        >
          <TrendIcon size={12} strokeWidth={2.5} />
          {trendSign}{Math.abs(trend)}%
        </span>
      </div>

      <div>
        <p className="text-3xl font-bold text-txt tracking-tight">{animated}</p>
        <p className="text-sm text-txt-3 mt-1 font-medium">{label}</p>
      </div>
    </div>
  );
}
