// ActionCard.jsx — Reusable action result card
import { CheckCircle2, Search, FileText, Calendar, Zap } from "lucide-react";

const TYPE_CONFIG = {
  task:     { Icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-100" },
  search:   { Icon: Search,       color: "text-blue-600",    bg: "bg-blue-50",    border: "border-blue-100" },
  doc:      { Icon: FileText,     color: "text-violet-600",  bg: "bg-violet-50",  border: "border-violet-100" },
  calendar: { Icon: Calendar,     color: "text-orange-500",  bg: "bg-orange-50",  border: "border-orange-100" },
  default:  { Icon: Zap,          color: "text-indigo-600",  bg: "bg-indigo-50",  border: "border-indigo-100" },
};

export default function ActionCard({ title, description, time, type = "default" }) {
  const cfg = TYPE_CONFIG[type] ?? TYPE_CONFIG.default;
  const { Icon } = cfg;

  return (
    <div className="card card-hover p-5 flex flex-col gap-3 fade-in-up">
      <div className="flex items-start gap-3">
        {/* Icon badge */}
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${cfg.bg} border ${cfg.border}`}>
          <Icon size={17} strokeWidth={2} className={cfg.color} />
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-sm font-semibold text-gray-900 truncate">{title}</h4>
            {time && <span className="text-xs text-gray-400 font-medium shrink-0">{time}</span>}
          </div>
          {description && (
            <p className="text-sm text-gray-500 mt-1 leading-relaxed">{description}</p>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pl-12 pt-1 border-t border-gray-100">
        <button className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors py-0.5">
          Edit
        </button>
        <button className="text-xs font-semibold text-gray-400 hover:text-gray-600 transition-colors py-0.5">
          Dismiss
        </button>
      </div>
    </div>
  );
}
