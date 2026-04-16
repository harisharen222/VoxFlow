// SearchPage.jsx — Knowledge search with result cards
import { useState } from "react";
import api from "../hooks/useApi.js";
import { useToast } from "../hooks/useToast.js";
import Spinner from "../components/Spinner.jsx";

const FILTERS = [
  { value: "", label: "All Sources" },
  { value: "pdf", label: "PDFs" },
  { value: "web", label: "Web" },
  { value: "manual", label: "Manual" },
];

export default function SearchPage() {
  const toast = useToast();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  async function search() {
    if (!query.trim() || loading) return;
    setLoading(true);
    setSearched(true);
    try {
      const data = await api.post("/search", { query: query.trim(), top_k: 8, filter_type: filter || undefined });
      setResults(data.results || []);
    } catch (err) {
      toast.error(err.message);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-full bg-bg">
      {/* Header */}
      <div className="shrink-0 px-6 pt-8 pb-6 border-b border-border">
        <h1 className="text-xl font-bold text-txt mb-1">Search Knowledge</h1>
        <p className="text-sm text-txt-2">Find answers from all your ingested documents instantly.</p>

        {/* Search bar */}
        <div className="mt-5 flex gap-3">
          <div className="relative flex-1">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-txt-3">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            </span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && search()}
              placeholder="Search your knowledge base…"
              className="input pl-10"
            />
          </div>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="input w-36 cursor-pointer"
          >
            {FILTERS.map((f) => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
          <button onClick={search} disabled={loading || !query.trim()} className="btn btn-primary px-6">
            {loading ? <Spinner size={15} /> : "Search"}
          </button>
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {loading && (
          <div className="flex items-center gap-3 text-txt-2 text-sm py-12 justify-center">
            <Spinner size={18} /> Searching…
          </div>
        )}

        {!loading && searched && results.length === 0 && (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-card border border-border flex items-center justify-center mx-auto mb-4">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-txt-3"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            </div>
            <p className="text-txt-2 font-medium">No results found</p>
            <p className="text-txt-3 text-sm mt-1">Try different keywords or ingest more documents.</p>
          </div>
        )}

        {!loading && results.length > 0 && (
          <>
            <p className="text-xs text-txt-3 font-medium uppercase tracking-wider mb-4">{results.length} results</p>
            <div className="space-y-3">
              {results.map((r, i) => (
                <div key={i} className="card card-hover p-5 cursor-pointer">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <p className="text-sm text-txt leading-relaxed flex-1">{r.text || r.content || "(no content)"}</p>
                    <span className="badge bg-accent/10 border border-accent/20 text-accent shrink-0">
                      {Math.round((r.score || 0) * 100)}%
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-3">
                    {r.source && (
                      <span className="badge bg-white/5 border border-white/8 text-txt-3 text-xs">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mr-1"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                        {r.source}
                      </span>
                    )}
                    {r.source_type && (
                      <span className="badge bg-white/5 border border-white/8 text-txt-3 text-xs">{r.source_type}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {!searched && (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent/20 to-accent-3/10 border border-accent/20 flex items-center justify-center mx-auto mb-4">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="1.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            </div>
            <p className="text-txt font-medium">Search your knowledge base</p>
            <p className="text-txt-3 text-sm mt-1">Type a query above to find relevant documents and answers.</p>
          </div>
        )}
      </div>
    </div>
  );
}
