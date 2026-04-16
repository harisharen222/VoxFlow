// ConnectorsPage.jsx — Sync Google Drive and Notion
import { useEffect, useState } from "react";
import api from "../hooks/useApi.js";
import { useToast } from "../hooks/useToast.js";
import Spinner from "../components/Spinner.jsx";

function ConnectorCard({ title, description, icon, configured, envVar, idLabel, idPlaceholder, onSync, items, resultSummary, loading, synced }) {
  const [id, setId] = useState("");
  return (
    <div className={`card card-hover p-6 flex flex-col gap-4 transition-all duration-200 ${configured ? "" : "opacity-70"}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/5 border border-border flex items-center justify-center text-xl">
            {icon}
          </div>
          <div>
            <h3 className="font-semibold text-txt text-sm">{title}</h3>
            <p className="text-xs text-txt-3">{description}</p>
          </div>
        </div>
        <span className={`badge shrink-0 ${configured
          ? "bg-success/10 border border-success/30 text-success"
          : "bg-danger/10 border border-danger/30 text-danger"}`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${configured ? "bg-success" : "bg-danger"}`} />
          {configured ? "Configured" : "Not set"}
        </span>
      </div>

      {/* Config hint */}
      {!configured && (
        <div className="rounded-xl bg-white/3 border border-border px-4 py-3 text-xs text-txt-3">
          Set <code className="text-accent font-mono">{envVar}</code> in your backend <code className="text-txt-2">.env</code> file to enable sync.
        </div>
      )}

      {/* Optional ID input */}
      <div>
        <label className="block text-xs font-medium text-txt-2 mb-1.5">{idLabel}</label>
        <input
          value={id}
          onChange={(e) => setId(e.target.value)}
          placeholder={idPlaceholder}
          className="input text-sm"
          disabled={!configured || loading}
        />
      </div>

      {/* Sync button */}
      <button
        onClick={() => onSync(id.trim() || undefined)}
        disabled={!configured || loading}
        className="btn btn-primary"
      >
        {loading ? <><Spinner size={15} /> Syncing…</> : "Sync Now"}
      </button>

      {/* Result */}
      {resultSummary && (
        <div className="rounded-xl bg-white/3 border border-border px-4 py-3">
          <p className="text-sm font-medium text-txt mb-2">{resultSummary}</p>
          {items && items.length > 0 && (
            <ul className="max-h-32 overflow-y-auto space-y-1">
              {items.map((it, i) => (
                <li key={i} className="text-xs text-txt-3 flex items-center gap-1.5 truncate">
                  <span className="w-1 h-1 rounded-full bg-txt-3 shrink-0" />{it}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export default function ConnectorsPage() {
  const toast = useToast();
  const [status, setStatus] = useState({ gdrive: {}, notion: {} });
  const [statusLoading, setStatusLoading] = useState(true);
  const [gdriveRes, setGdriveRes] = useState(null);
  const [gdriveLoading, setGdriveLoading] = useState(false);
  const [notionRes, setNotionRes] = useState(null);
  const [notionLoading, setNotionLoading] = useState(false);

  async function loadStatus() {
    setStatusLoading(true);
    try {
      const res = await api.get("/connectors/status");
      setStatus(res);
    } catch (err) {
      toast.error(err.message || "Status check failed");
    } finally { setStatusLoading(false); }
  }

  useEffect(() => { loadStatus(); }, []);

  async function syncGDrive(folderId) {
    setGdriveLoading(true); setGdriveRes(null);
    try {
      const res = await api.post("/connectors/gdrive/sync", folderId ? { folder_id: folderId } : {});
      setGdriveRes(res);
      toast.success(`Drive: ${res.synced} synced, ${res.failed} failed`);
    } catch (err) {
      toast.error(err.message || "Drive sync failed");
    } finally { setGdriveLoading(false); }
  }

  async function syncNotion(dbId) {
    setNotionLoading(true); setNotionRes(null);
    try {
      const res = await api.post("/connectors/notion/sync", dbId ? { database_id: dbId } : {});
      setNotionRes(res);
      toast.success(`Notion: ${res.synced} synced, ${res.failed} failed`);
    } catch (err) {
      toast.error(err.message || "Notion sync failed");
    } finally { setNotionLoading(false); }
  }

  return (
    <div className="flex flex-col h-full bg-bg">
      <div className="shrink-0 px-6 pt-8 pb-6 border-b border-border">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-txt mb-1">Connectors</h1>
            <p className="text-sm text-txt-2">Sync your external data sources into the knowledge base.</p>
          </div>
          <button onClick={loadStatus} disabled={statusLoading} className="btn-ghost text-xs py-2">
            {statusLoading ? <Spinner size={13} /> : (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
            )}
            Refresh
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-3xl">
          <ConnectorCard
            title="Google Drive"
            description="Sync files and folders from your Drive"
            icon={<svg width="20" height="20" viewBox="0 0 87.3 78" xmlns="http://www.w3.org/2000/svg"><path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/><path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z" fill="#00ac47"/><path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335"/><path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d"/><path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc"/><path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 27h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/></svg>}
            configured={!!status.gdrive?.configured}
            envVar={status.gdrive?.env_var || "GOOGLE_SERVICE_ACCOUNT_JSON"}
            idLabel="Folder ID (optional)"
            idPlaceholder="1a2b3c… leave blank for all accessible files"
            onSync={syncGDrive}
            loading={gdriveLoading}
            items={gdriveRes?.files}
            resultSummary={gdriveRes ? `${gdriveRes.synced} synced · ${gdriveRes.failed} failed` : ""}
          />
          <ConnectorCard
            title="Notion"
            description="Import pages and databases from Notion"
            icon={<svg width="20" height="20" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path d="M6 6.5c0-.8.5-1.5 1.3-1.7l59.3-4.4c1-.1 2 .2 2.7.9L94 17.7c.7.7 1 1.6 1 2.5v70c0 1-.6 1.8-1.5 2L22 99.8c-.5.1-1 0-1.4-.3L7.4 90.8c-.8-.6-1.4-1.5-1.4-2.5z" fill="#fff"/><path d="M69.3 1l-62 4.6c-1.7.1-3 1.6-3 3.2v82.4c0 1.7.8 3.2 2.2 4l19.2 12.6c.5.3 1 .4 1.5.2l73.8-16.8c1.2-.3 2-1.3 2-2.5V20c0-1.3-.8-2.4-2-2.9z" fill="#fff" stroke="#f0f0f0" strokeWidth="2"/><path d="M9 92V9l60-4.4v82.6zm2-81.5v79l56-12.7V7z" fill="#000"/><text x="20" y="68" fontSize="48" fontWeight="900" fontFamily="Arial" fill="#000">N</text></svg>}
            configured={!!status.notion?.configured}
            envVar={status.notion?.env_var || "NOTION_TOKEN"}
            idLabel="Database ID (optional)"
            idPlaceholder="abc123… leave blank to sync all pages"
            onSync={syncNotion}
            loading={notionLoading}
            items={notionRes?.pages}
            resultSummary={notionRes ? `${notionRes.synced} synced · ${notionRes.failed} failed` : ""}
          />
        </div>
      </div>
    </div>
  );
}
