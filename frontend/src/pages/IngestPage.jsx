// IngestPage.jsx — Document ingestion with drag-and-drop, URL, and text
import { useRef, useState } from "react";
import api from "../hooks/useApi.js";
import { useToast } from "../hooks/useToast.js";
import Spinner from "../components/Spinner.jsx";

const TABS = ["PDF Upload", "Web URL", "Raw Text"];

function useIngestLog() {
  const [log, setLog] = useState([]);
  function add(entry) {
    setLog((l) => [{ ...entry, ts: new Date().toLocaleTimeString() }, ...l].slice(0, 10));
  }
  return [log, add];
}

export default function IngestPage() {
  const toast = useToast();
  const [tab, setTab] = useState(0);
  const [log, addLog] = useIngestLog();

  // PDF
  const [file, setFile] = useState(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef(null);

  // URL
  const [url, setUrl] = useState("");
  const [urlLoading, setUrlLoading] = useState(false);

  // Text
  const [sourceName, setSourceName] = useState("");
  const [text, setText] = useState("");
  const [textLoading, setTextLoading] = useState(false);

  async function submitPdf() {
    if (!file) return toast.error("Pick a PDF file first");
    setPdfLoading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await api.post("/ingest/pdf", fd, { headers: { "Content-Type": "multipart/form-data" } });
      toast.success(`PDF ingested: ${res.chunks_stored} chunks`);
      addLog({ type: "PDF", name: file.name, chunks: res.chunks_stored, ok: true });
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
    } catch (err) {
      toast.error(err.message || "PDF ingestion failed");
      addLog({ type: "PDF", name: file.name, chunks: 0, ok: false });
    } finally { setPdfLoading(false); }
  }

  async function submitUrl() {
    if (!url.trim()) return toast.error("Enter a URL");
    setUrlLoading(true);
    try {
      const res = await api.post("/ingest/url", { url: url.trim() });
      toast.success(`URL ingested: ${res.chunks_stored} chunks`);
      addLog({ type: "URL", name: url.trim(), chunks: res.chunks_stored, ok: true });
      setUrl("");
    } catch (err) {
      toast.error(err.message || "URL ingestion failed");
    } finally { setUrlLoading(false); }
  }

  async function submitText() {
    if (!text.trim() || !sourceName.trim()) return toast.error("Source name and text are both required");
    setTextLoading(true);
    try {
      const res = await api.post("/ingest/text", { text: text.trim(), source_name: sourceName.trim() });
      toast.success(`Text ingested: ${res.chunks_stored} chunks`);
      addLog({ type: "Text", name: sourceName.trim(), chunks: res.chunks_stored, ok: true });
      setText(""); setSourceName("");
    } catch (err) {
      toast.error(err.message || "Text ingestion failed");
    } finally { setTextLoading(false); }
  }

  const onDrop = (e) => {
    e.preventDefault(); setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f && f.type === "application/pdf") setFile(f);
    else toast.error("Only PDF files are accepted");
  };

  return (
    <div className="flex flex-col h-full bg-bg">
      {/* Header */}
      <div className="shrink-0 px-6 pt-8 pb-6 border-b border-border">
        <h1 className="text-xl font-bold text-txt mb-1">Add Knowledge</h1>
        <p className="text-sm text-txt-2">Upload documents, paste URLs, or add raw text to your knowledge base.</p>

        {/* Tabs */}
        <div className="flex gap-1 mt-5 bg-surface rounded-xl p-1 w-fit border border-border">
          {TABS.map((t, i) => (
            <button
              key={t}
              onClick={() => setTab(i)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150
                ${tab === i ? "bg-accent text-white shadow-sm" : "text-txt-2 hover:text-txt"}`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="max-w-xl">
          {/* PDF Tab */}
          {tab === 0 && (
            <div className="space-y-4">
              <div
                onDrop={onDrop}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onClick={() => fileRef.current?.click()}
                className={`cursor-pointer rounded-2xl border-2 border-dashed p-10 text-center transition-all duration-200
                  ${dragOver ? "border-accent bg-accent/5" : file ? "border-success/40 bg-success/5" : "border-border hover:border-accent/40 hover:bg-white/2"}`}
              >
                {file ? (
                  <div>
                    <div className="w-12 h-12 rounded-xl bg-success/10 border border-success/20 flex items-center justify-center mx-auto mb-3">
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                    </div>
                    <p className="font-semibold text-txt">{file.name}</p>
                    <p className="text-xs text-txt-3 mt-1">{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                ) : (
                  <div>
                    <div className="w-12 h-12 rounded-xl bg-white/5 border border-border flex items-center justify-center mx-auto mb-3">
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                    </div>
                    <p className="text-txt-2 font-medium">Drop a PDF here</p>
                    <p className="text-xs text-txt-3 mt-1">or click to browse your files</p>
                  </div>
                )}
                <input ref={fileRef} type="file" accept=".pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} className="hidden" />
              </div>
              <button onClick={submitPdf} disabled={pdfLoading || !file} className="btn btn-primary w-full">
                {pdfLoading ? <><Spinner size={15} /> Uploading…</> : "Upload & Ingest PDF"}
              </button>
            </div>
          )}

          {/* URL Tab */}
          {tab === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-txt-2 mb-2">Website or article URL</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-txt-3">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                  </span>
                  <input
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && submitUrl()}
                    placeholder="https://example.com/article"
                    className="input pl-10"
                  />
                </div>
              </div>
              <button onClick={submitUrl} disabled={urlLoading || !url.trim()} className="btn btn-primary w-full">
                {urlLoading ? <><Spinner size={15} /> Fetching…</> : "Fetch & Ingest URL"}
              </button>
            </div>
          )}

          {/* Text Tab */}
          {tab === 2 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-txt-2 mb-2">Source name</label>
                <input
                  value={sourceName}
                  onChange={(e) => setSourceName(e.target.value)}
                  placeholder="e.g. Q4 Policy Document"
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-txt-2 mb-2">Content</label>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={8}
                  placeholder="Paste or type the content you want to add to the knowledge base…"
                  className="input resize-none"
                />
              </div>
              <button onClick={submitText} disabled={textLoading || !text.trim() || !sourceName.trim()} className="btn btn-primary w-full">
                {textLoading ? <><Spinner size={15} /> Ingesting…</> : "Save to Knowledge Base"}
              </button>
            </div>
          )}
        </div>

        {/* Activity Log */}
        {log.length > 0 && (
          <div className="mt-8 max-w-xl">
            <p className="text-xs text-txt-3 font-medium uppercase tracking-wider mb-3">Recent Activity</p>
            <div className="space-y-2">
              {log.map((e, i) => (
                <div key={i} className="card flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className={`w-2 h-2 rounded-full ${e.ok ? "bg-success" : "bg-danger"}`} />
                    <span className="badge bg-white/5 border border-white/8 text-txt-3 text-xs">{e.type}</span>
                    <span className="text-sm text-txt truncate max-w-[180px]">{e.name}</span>
                  </div>
                  <span className="text-xs text-txt-3 shrink-0">{e.chunks} chunks · {e.ts}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
