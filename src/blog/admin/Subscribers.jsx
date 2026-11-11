import { useMemo, useState } from "react";
import { api, formatDate } from "../api";
import { useApi } from "../useApi";
import { ErrorState } from "../components/States";
import { DownloadIcon, MailIcon } from "../components/Icons";

const EMPTY_ITEMS = [];

export default function Subscribers() {
  const { data, loading, error, reload } = useApi(
    (signal) => api("/admin/subscribers", { signal }),
    []
  );
  const [query, setQuery] = useState("");

  const items = data?.items || EMPTY_ITEMS;
  const filtered = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) return items;
    return items.filter((item) => item.email.toLowerCase().includes(value));
  }, [items, query]);

  const active = items.filter((item) => item.status === "active").length;

  const exportCsv = () => {
    const rows = [
      ["email", "status", "subscribed_at"],
      ...filtered.map((item) => [item.email, item.status, item.created_at]),
    ];
    const csv = rows
      .map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `blog-subscribers-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (error) return <ErrorState error={error} onRetry={reload} title="Subscribers unavailable" />;

  return (
    <>
      <div className="admin-topbar">
        <div>
          <h1>Subscribers</h1>
          <p>{active} active subscriber{active === 1 ? "" : "s"} · {items.length} total</p>
        </div>
        <div className="admin-actions">
          <button type="button" className="blog-btn blog-btn-sm" onClick={exportCsv} disabled={!filtered.length}>
            <DownloadIcon size={14} /> Export CSV
          </button>
        </div>
      </div>

      <div className="admin-panel" style={{ marginTop: 0 }}>
        <div className="admin-panel-head">
          <input
            className="blog-input"
            style={{ width: 280 }}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filter by email…"
            aria-label="Filter subscribers"
          />
          <span className="admin-note">{filtered.length} shown</span>
        </div>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Status</th>
                <th>Subscribed</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id}>
                  <td className="title-cell">
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                      <MailIcon size={13} /> {item.email}
                    </span>
                  </td>
                  <td><span className={`admin-badge ${item.status === "active" ? "published" : "draft"}`}>{item.status}</span></td>
                  <td>{formatDate(item.created_at, { withTime: true })}</td>
                </tr>
              ))}
              {loading && !data && <tr><td colSpan={3} className="admin-empty">Loading subscribers…</td></tr>}
              {!loading && !filtered.length && (
                <tr><td colSpan={3} className="admin-empty">No subscribers match this filter.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
