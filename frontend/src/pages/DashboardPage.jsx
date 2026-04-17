// DashboardPage.jsx — Production-grade analytics dashboard
import { useState, useEffect, useRef } from "react";
import {
  CheckSquare, Search, FileText, Upload,
  Link, Mail, Clipboard, BarChart2, Brain,
  Calendar, TrendingUp,
} from "lucide-react";
import StatCard from "../components/StatCard.jsx";
import {
  generateStats,
  generateActivities,
  generateHeatmap,
  generateAgentScore,
} from "../lib/mockData.js";

// ── Icon map for activity feed ─────────────────────────────────────────────
const ACTIVITY_ICONS = {
  CheckSquare, Search, FileText, Upload,
  Link, Mail, Clipboard, BarChart2, Brain, Calendar,
};

// ── Heatmap color scale (0–4) ──────────────────────────────────────────────
const HEATMAP_COLORS = [
  "bg-gray-100",
  "bg-indigo-100",
  "bg-indigo-200",
  "bg-indigo-400",
  "bg-indigo-600",
];

const HEATMAP_LABELS = ["Less", "", "", "", "More"];

// ── Day labels (Mon→Sun, 5 weeks = 35 cells, col-per-day) ─────────────────
const DAY_LABELS = ["Mon", "Wed", "Fri"];

// ── Animated Arc Gauge ─────────────────────────────────────────────────────
function ArcGauge({ value }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const timeout = setTimeout(() => setProgress(value), 120);
    return () => clearTimeout(timeout);
  }, [value]);

  // Arc: center (50,54), radius 40, half-circle from left to right
  const pct = progress / 100;
  // Total arc length of half circle = π * r = ~125.66
  const total = Math.PI * 40;
  const dash = pct * total;

  return (
    <div className="relative flex items-center justify-center w-44 h-24 mt-2">
      <svg viewBox="0 0 100 54" className="w-full h-full overflow-visible">
        {/* Track */}
        <path
          d="M 10 54 A 40 40 0 0 1 90 54"
          fill="none"
          stroke="#E5E7EB"
          strokeWidth="10"
          strokeLinecap="round"
        />
        {/* Fill — animated via strokeDashoffset */}
        <path
          d="M 10 54 A 40 40 0 0 1 90 54"
          fill="none"
          stroke="#4F46E5"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${total}`}
          strokeDashoffset={`${total - dash}`}
          style={{ transition: "stroke-dashoffset 1s cubic-bezier(0.4,0,0.2,1)" }}
        />
      </svg>
      {/* Value overlay */}
      <div className="absolute bottom-0 left-0 right-0 flex flex-col items-center">
        <span className="text-3xl font-bold text-gray-900 leading-none">{progress}</span>
        <span className="text-xs text-gray-400 font-medium mt-0.5">out of 100</span>
      </div>
    </div>
  );
}

// ── Component ──────────────────────────────────────────────────────────────
export default function DashboardPage() {
  // All dynamic values — stable per render
  const [stats]      = useState(() => generateStats());
  const [activities] = useState(() => generateActivities(6));
  const [heatmap]    = useState(() => generateHeatmap());
  const [score]      = useState(() => generateAgentScore());

  // Tooltip for heatmap hover
  const [tooltip, setTooltip] = useState(null); // { index, value, x, y }

  return (
    <div className="flex w-full h-full overflow-hidden">

      {/* ── LEFT: Main Board (70%) ────────────────────────── */}
      <div className="w-[70%] flex flex-col h-full border-r border-gray-200 overflow-y-auto bg-[#F8F9FB]">
        <div className="px-8 py-8 space-y-8">

          {/* Page header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Dashboard</h1>
              <p className="text-sm text-gray-400 mt-0.5">Your AI usage at a glance</p>
            </div>
            <div className="flex items-center gap-2 text-xs font-medium text-gray-400 bg-white border border-gray-200 rounded-lg px-3 py-2">
              <TrendingUp size={14} className="text-indigo-500" />
              Last 30 days
            </div>
          </div>

          {/* ── Stat cards ───────────────────────── */}
          <div className="grid grid-cols-4 gap-4">
            {stats.map((s, i) => (
              <StatCard key={i} {...s} />
            ))}
          </div>

          {/* ── Bottom row: Heatmap + Gauge ─────── */}
          <div className="grid grid-cols-2 gap-6">

            {/* Heatmap */}
            <div className="card p-6 flex flex-col gap-5">
              <div>
                <h3 className="font-semibold text-gray-900 text-sm">Activity Heatmap</h3>
                <p className="text-xs text-gray-400 mt-0.5">Daily voice & action sessions</p>
              </div>

              {/* Day labels */}
              <div className="flex gap-1 pl-7">
                {Array.from({ length: 7 }).map((_, i) => (
                  <div key={i} className="flex-1 text-[9px] text-gray-400 font-medium text-center">
                    {["M", "T", "W", "T", "F", "S", "S"][i]}
                  </div>
                ))}
              </div>

              {/* Grid: 5 rows × 7 cols */}
              <div className="relative grid grid-rows-5 gap-1">
                {Array.from({ length: 5 }).map((_, row) => (
                  <div key={row} className="flex gap-1 items-center">
                    {/* Week label */}
                    <span className="text-[9px] text-gray-300 font-medium w-6 text-right shrink-0">
                      W{row + 1}
                    </span>
                    {Array.from({ length: 7 }).map((_, col) => {
                      const idx = row * 7 + col;
                      const val = heatmap[idx] ?? 0;
                      const count = val === 0 ? 0 : val * 3 + Math.floor(Math.random() * 2);
                      return (
                        <div
                          key={col}
                          className={`
                            flex-1 aspect-square rounded-sm cursor-default
                            transition-transform duration-100 hover:scale-110
                            ${HEATMAP_COLORS[val]}
                          `}
                          title={`${count} session${count !== 1 ? "s" : ""}`}
                          onMouseEnter={(e) => {
                            const rect = e.target.getBoundingClientRect();
                            setTooltip({ idx, val, count });
                          }}
                          onMouseLeave={() => setTooltip(null)}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>

              {/* Legend */}
              <div className="flex items-center gap-1.5 justify-end text-[10px] font-medium text-gray-400">
                <span>Less</span>
                {HEATMAP_COLORS.map((c, i) => (
                  <div key={i} className={`w-3 h-3 rounded-sm ${c}`} />
                ))}
                <span>More</span>
              </div>
            </div>

            {/* Agent Intelligence */}
            <div className="card p-6 flex flex-col relative overflow-hidden">
              {/* Decorative top bar */}
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500" />

              <div>
                <h3 className="font-semibold text-gray-900 text-sm">Agent Intelligence</h3>
                <p className="text-xs text-gray-400 mt-0.5">Resolution rate without fallback</p>
              </div>

              {/* Arc gauge */}
              <div className="flex flex-col items-center justify-center flex-1 gap-4 mt-4">
                <ArcGauge value={score} />

                <div className="text-center space-y-3 w-full">
                  {/* Progress breakdown */}
                  {[
                    { label: "Direct answers",    pct: Math.round(score * 0.55) },
                    { label: "With retrieval",    pct: Math.round(score * 0.30) },
                    { label: "Action execution",  pct: Math.round(score * 0.15) },
                  ].map(({ label, pct }) => (
                    <div key={label}>
                      <div className="flex justify-between text-xs font-medium text-gray-500 mb-1">
                        <span>{label}</span>
                        <span className="text-gray-700">{pct}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-indigo-500 rounded-full transition-all duration-1000 ease-out"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* ── RIGHT: Activity Feed (30%) ────────────────────── */}
      <div className="w-[30%] flex flex-col h-full bg-white">
        <div className="px-5 py-6 border-b border-gray-200 shrink-0">
          <h2 className="text-sm font-semibold text-gray-900">Recent Activity</h2>
          <p className="text-xs text-gray-400 mt-0.5">{activities.length} events today</p>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-1 bg-gray-50/40">
          {activities.map((act, i) => {
            const Icon = ACTIVITY_ICONS[act.icon] ?? Clipboard;
            const isLast = i === activities.length - 1;

            return (
              <div key={act.id} className="relative flex gap-3 group">
                {/* Timeline line */}
                {!isLast && (
                  <div className="absolute left-[15px] top-[36px] bottom-0 w-px bg-gray-200" />
                )}

                {/* Icon */}
                <div className="w-8 h-8 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center shrink-0 z-10">
                  <Icon size={14} className="text-gray-500" strokeWidth={1.8} />
                </div>

                {/* Text */}
                <div className="flex-1 pb-5 pt-1">
                  <p className="text-sm text-gray-700 leading-snug font-medium group-hover:text-gray-900 transition-colors">
                    {act.text}
                  </p>
                  <span className="text-xs text-gray-400 font-medium mt-1 block">{act.time}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
