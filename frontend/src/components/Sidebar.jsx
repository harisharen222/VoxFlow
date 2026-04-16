// Sidebar.jsx — Minimal, icon-forward left nav
import { NavLink, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import api from "../hooks/useApi.js";

const navItems = [
  {
    to: "/",
    label: "Ask",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
        <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
        <line x1="12" y1="19" x2="12" y2="23"/>
        <line x1="8" y1="23" x2="16" y2="23"/>
      </svg>
    ),
  },
  {
    to: "/search",
    label: "Search",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>
    ),
  },
  {
    to: "/ingest",
    label: "Ingest",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="17 8 12 3 7 8"/>
        <line x1="12" y1="3" x2="12" y2="15"/>
      </svg>
    ),
  },
  {
    to: "/connectors",
    label: "Connectors",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
      </svg>
    ),
  },
  {
    to: "/memory",
    label: "Memory",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
        <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
      </svg>
    ),
  },
];

export default function Sidebar() {
  const [online, setOnline] = useState(null);

  useEffect(() => {
    api.get("/health")
      .then(() => setOnline(true))
      .catch(() => setOnline(false));
  }, []);

  return (
    <aside className="hidden md:flex flex-col w-[220px] min-h-full bg-surface border-r border-border shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 h-16 border-b border-border shrink-0">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent to-accent-3 flex items-center justify-center shrink-0">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </div>
        <span className="font-semibold text-sm text-txt">Knowledge Agent</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group
               ${isActive
                 ? "bg-accent/15 text-accent border border-accent/20"
                 : "text-txt-2 hover:bg-white/5 hover:text-txt"
               }`
            }
          >
            {({ isActive }) => (
              <>
                <span className={`transition-colors ${isActive ? "text-accent" : "text-txt-3 group-hover:text-txt-2"}`}>
                  {item.icon}
                </span>
                {item.label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Status */}
      <div className="px-5 py-4 border-t border-border shrink-0">
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full shrink-0 ${
              online === null ? "bg-txt-3 pulse-dot" :
              online ? "bg-success pulse-dot" : "bg-danger"
            }`}
          />
          <span className="text-xs text-txt-3">
            {online === null ? "Connecting..." : online ? "Backend live" : "Backend offline"}
          </span>
        </div>
        <p className="text-[10px] text-txt-4 mt-1">Powered by Gemini · Qdrant · Vapi</p>
      </div>
    </aside>
  );
}
