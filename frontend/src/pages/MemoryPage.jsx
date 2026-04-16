// MemoryPage.jsx — View and manage conversation + user memory
import { useState } from "react";
import api from "../hooks/useApi.js";
import { useSession } from "../context/SessionContext.jsx";
import { useToast } from "../hooks/useToast.js";
import ChatBubble from "../components/ChatBubble.jsx";
import Spinner from "../components/Spinner.jsx";

const TABS = ["Conversation History", "User Memory"];

const CATEGORIES = ["identity", "preference", "context", "other"];

function FactCard({ fact }) {
  const pct = Math.round(Math.max(0, Math.min(1, Number(fact.confidence ?? 0))) * 100);
  return (
    <div className="card px-4 py-3 flex flex-col gap-2 card-hover">
      <p className="text-sm text-txt leading-relaxed">{fact.fact}</p>
      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-1.5">
          <span className="badge bg-accent/10 border border-accent/20 text-accent text-xs">{fact.category || "other"}</span>
          <span className="badge bg-white/5 border border-white/8 text-txt-3 text-xs">{fact.source || "explicit"}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-1 w-16 rounded-full bg-border overflow-hidden">
            <div className="h-full bg-gradient-to-r from-accent to-accent-3 transition-all" style={{ width: `${pct}%` }} />
          </div>
          <span className="text-xs text-txt-3">{pct}%</span>
        </div>
      </div>
    </div>
  );
}

export default function MemoryPage() {
  const { sessionId, userId } = useSession();
  const toast = useToast();
  const [tab, setTab] = useState(0);

  // Session
  const [sid, setSid] = useState(sessionId);
  const [turns, setTurns] = useState([]);
  const [sessionLoading, setSessionLoading] = useState(false);

  // User facts
  const [uid, setUid] = useState(userId);
  const [facts, setFacts] = useState([]);
  const [userLoading, setUserLoading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newFact, setNewFact] = useState("");
  const [newCategory, setNewCategory] = useState("other");
  const [newConfidence, setNewConfidence] = useState(1.0);

  async function loadSession() {
    setSessionLoading(true);
    try {
      const res = await api.get(`/memory/session/${encodeURIComponent(sid)}`);
      setTurns(res.turns || []);
    } catch (err) { toast.error(err.message || "Load session failed"); }
    finally { setSessionLoading(false); }
  }

  async function clearSession() {
    if (!confirm(`Clear all memory for session "${sid}"?`)) return;
    try {
      await api.delete(`/memory/session/${encodeURIComponent(sid)}`);
      setTurns([]);
      toast.success("Session cleared");
    } catch (err) { toast.error(err.message); }
  }

  async function loadUser() {
    setUserLoading(true);
    try {
      const res = await api.get(`/memory/user/${encodeURIComponent(uid)}`);
      setFacts(res.facts || []);
    } catch (err) { toast.error(err.message || "Load user failed"); }
    finally { setUserLoading(false); }
  }

  async function clearUser() {
    if (!confirm(`Delete all facts for user "${uid}"?`)) return;
    try {
      await api.delete(`/memory/user/${encodeURIComponent(uid)}`);
      setFacts([]);
      toast.success("User memory cleared");
    } catch (err) { toast.error(err.message); }
  }

  async function addFact() {
    if (!newFact.trim()) return toast.error("Fact is required");
    try {
      await api.post(`/memory/user/${encodeURIComponent(uid)}/facts`, {
        fact: newFact.trim(),
        category: newCategory,
        confidence: Number(newConfidence),
      });
      toast.success("Fact saved");
      setNewFact(""); setShowAdd(false);
      loadUser();
    } catch (err) { toast.error(err.message || "Add fact failed"); }
  }

  return (
    <div className="flex flex-col h-full bg-bg">
      {/* Header */}
      <div className="shrink-0 px-6 pt-8 pb-6 border-b border-border">
        <h1 className="text-xl font-bold text-txt mb-1">Memory</h1>
        <p className="text-sm text-txt-2">Review past conversations and what the agent knows about you.</p>
        <div className="flex gap-1 mt-5 bg-surface rounded-xl p-1 w-fit border border-border">
          {TABS.map((t, i) => (
            <button
              key={t} onClick={() => setTab(i)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150
                ${tab === i ? "bg-accent text-white shadow-sm" : "text-txt-2 hover:text-txt"}`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6">
        {/* Conversation History */}
        {tab === 0 && (
          <div className="max-w-2xl">
            <div className="flex gap-3 mb-5">
              <input value={sid} onChange={(e) => setSid(e.target.value)} placeholder="Session ID" className="input text-sm" />
              <button onClick={loadSession} disabled={sessionLoading} className="btn btn-primary shrink-0">
                {sessionLoading ? <Spinner size={14} /> : "Load"}
              </button>
              <button onClick={clearSession} className="btn-danger shrink-0">Clear</button>
            </div>

            {turns.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 rounded-2xl bg-card border border-border flex items-center justify-center mx-auto mb-4">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                </div>
                <p className="text-txt-2 font-medium">No conversation loaded</p>
                <p className="text-txt-3 text-sm mt-1">Enter a session ID and click Load to view history.</p>
              </div>
            ) : (
              <div className="space-y-1">
                <p className="text-xs text-txt-3 uppercase tracking-wider font-medium mb-4">{turns.length} turns</p>
                {turns.map((t, i) => (
                  <ChatBubble key={i} role={t.role} content={t.content} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* User Memory */}
        {tab === 1 && (
          <div className="max-w-2xl">
            <div className="flex gap-3 mb-5">
              <input value={uid} onChange={(e) => setUid(e.target.value)} placeholder="User ID" className="input text-sm" />
              <button onClick={loadUser} disabled={userLoading} className="btn btn-primary shrink-0">
                {userLoading ? <Spinner size={14} /> : "Load"}
              </button>
              <button onClick={clearUser} className="btn-danger shrink-0">Clear</button>
            </div>

            {/* Add fact */}
            <div className="mb-5">
              <button
                onClick={() => setShowAdd((s) => !s)}
                className="btn-ghost text-xs py-1.5"
              >
                {showAdd ? "Cancel" : "+ Add fact"}
              </button>

              {showAdd && (
                <div className="mt-3 card p-4 space-y-3 fade-in-up">
                  <input
                    value={newFact}
                    onChange={(e) => setNewFact(e.target.value)}
                    placeholder="e.g. Prefers concise answers"
                    className="input text-sm"
                  />
                  <div className="flex gap-3">
                    <select value={newCategory} onChange={(e) => setNewCategory(e.target.value)} className="input text-sm">
                      {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <div className="flex items-center gap-2 flex-1 text-xs text-txt-2">
                      <span className="shrink-0">Confidence: {Number(newConfidence).toFixed(2)}</span>
                      <input type="range" min={0} max={1} step={0.05} value={newConfidence}
                        onChange={(e) => setNewConfidence(e.target.value)} className="flex-1 accent-[#6c63ff]" />
                    </div>
                  </div>
                  <button onClick={addFact} className="btn btn-primary w-full text-sm">Save Fact</button>
                </div>
              )}
            </div>

            {facts.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 rounded-2xl bg-card border border-border flex items-center justify-center mx-auto mb-4">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="1.5"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>
                </div>
                <p className="text-txt-2 font-medium">No facts loaded</p>
                <p className="text-txt-3 text-sm mt-1">Enter a user ID and click Load to view stored facts.</p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-txt-3 uppercase tracking-wider font-medium mb-4">{facts.length} facts</p>
                {facts.map((f, i) => <FactCard key={i} fact={f} />)}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
