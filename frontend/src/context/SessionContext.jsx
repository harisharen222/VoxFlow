import { createContext, useContext, useState, useMemo } from "react";

const SessionContext = createContext(null);

function makeId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return "sess-" + Math.random().toString(36).slice(2, 12);
}

export function SessionProvider({ children }) {
  const [sessionId, setSessionId] = useState(() => makeId());
  const [userId, setUserId] = useState("anonymous");

  const value = useMemo(
    () => ({ sessionId, setSessionId, userId, setUserId }),
    [sessionId, userId]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used inside SessionProvider");
  return ctx;
}
