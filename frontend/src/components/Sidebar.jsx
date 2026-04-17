// Sidebar.jsx — Clean, minimal left nav with lucide-react icons
import { NavLink } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  Home,
  Mic,
  Search,
  Brain,
  BarChart2,
  Upload,
  Link2,
  Activity,
} from "lucide-react";
import api from "../hooks/useApi.js";

const navItems = [
  { to: "/",           label: "Home",       Icon: Home,     end: true },
  { to: "/talk",       label: "Talk",       Icon: Mic,      end: false },
  { to: "/search",     label: "Knowledge",  Icon: Search,   end: false },
  { to: "/memory",     label: "Memory",     Icon: Brain,    end: false },
  { to: "/dashboard",  label: "Dashboard",  Icon: BarChart2, end: false },
  { to: "/ingest",     label: "Add Data",   Icon: Upload,   end: false },
  { to: "/connectors", label: "Connectors", Icon: Link2,    end: false },
];

export default function Sidebar() {
  const [online, setOnline] = useState(null);

  useEffect(() => {
    api.get("/health")
      .then(() => setOnline(true))
      .catch(() => setOnline(false));
  }, []);

  return (
    <aside className="hidden md:flex flex-col w-[220px] min-h-full bg-white border-r border-gray-100 shrink-0 z-10">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 h-16 shrink-0 border-b border-gray-100">
        <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shrink-0">
          <Activity size={16} stroke="white" strokeWidth={2.5} />
        </div>
        <span className="font-bold text-[15px] text-gray-900 tracking-tight">
          VoxFlow<span className="text-indigo-600">.</span>
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(({ to, label, Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium
               transition-all duration-150 group
               ${isActive
                 ? "bg-indigo-50 text-indigo-700"
                 : "text-gray-500 hover:bg-gray-50 hover:text-gray-800"
               }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon
                  size={17}
                  strokeWidth={isActive ? 2.2 : 1.8}
                  className={`transition-colors ${isActive ? "text-indigo-600" : "text-gray-400 group-hover:text-gray-600"}`}
                />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Profile & Status */}
      <div className="px-3 py-4 border-t border-gray-100">
        {/* User */}
        <div className="flex items-center gap-2.5 px-2 mb-3">
          <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs shrink-0">
            VK
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate leading-tight">Varun K.</p>
            <p className="text-xs text-gray-400 truncate">Product Team</p>
          </div>
        </div>

        {/* Backend status */}
        <div className="flex items-center gap-2 px-2">
          <span
            className={`w-1.5 h-1.5 rounded-full shrink-0 ${
              online === null ? "bg-gray-300" :
              online ? "bg-emerald-500" : "bg-red-400"
            }`}
          />
          <span className="text-xs text-gray-400 font-medium">
            {online === null ? "Connecting…" : online ? "Backend live" : "Offline"}
          </span>
        </div>
      </div>
    </aside>
  );
}
