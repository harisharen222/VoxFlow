import { useEffect, useState } from "react";
import api from "../hooks/useApi.js";

export default function StatusBadge() {
  const [live, setLive] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function check() {
      try {
        await api.get("/health");
        if (!cancelled) setLive(true);
      } catch {
        if (!cancelled) setLive(false);
      }
    }
    check();
    const iv = setInterval(check, 5000);
    return () => {
      cancelled = true;
      clearInterval(iv);
    };
  }, []);

  const color = live === null ? "text-txt-2" : live ? "text-success" : "text-danger";
  const label = live === null ? "Checking..." : live ? "Live" : "Offline";

  return (
    <div className={`inline-flex items-center gap-2 text-xs ${color}`}>
      <span className={`h-2 w-2 rounded-full ${live ? "bg-success" : "bg-danger"} ${live ? "animate-pulse" : ""}`} />
      {label}
    </div>
  );
}
