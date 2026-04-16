// Toast.jsx — Sleek notification toasts
import { useEffect } from "react";

export default function Toast({ message, type = "info", onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);

  const styles = {
    success: { bg: "bg-success/10 border-success/30", icon: "text-success", dot: "bg-success" },
    error:   { bg: "bg-danger/10 border-danger/30",   icon: "text-danger",  dot: "bg-danger"  },
    info:    { bg: "bg-accent/10 border-accent/30",   icon: "text-accent",  dot: "bg-accent"  },
  };
  const s = styles[type] || styles.info;

  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl border ${s.bg} shadow-lg fade-in-up min-w-[260px] max-w-sm`}>
      <div className={`w-2 h-2 rounded-full shrink-0 ${s.dot}`} />
      <p className="text-sm text-txt flex-1">{message}</p>
      <button onClick={onClose} className="text-txt-3 hover:text-txt transition-colors ml-1">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>
  );
}
