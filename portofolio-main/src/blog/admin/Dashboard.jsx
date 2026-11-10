import { api, formatDate, formatNumber } from "../api";
import { API_BASE } from "../base";
import { Link } from "../router";
import { useApi } from "../useApi";
import { ErrorState } from "../components/States";
import { EyeIcon, PlusIcon, StarIcon } from "../components/Icons";

export default function Dashboard() {
  const { data, loading, error, reload } = useApi((signal) => api("/admin/stats", { signal }), []);

  if (error) return <ErrorState error={error} onRetry={reload} title="Dashboard unavailable" />;

  const totals = data?.totals;

  return (
    <>
      <div className="admin-topbar">
        <div>
          <h1>Dashboard</h1>
          <p>Publishing overview for the research blog.</p>
        </div>
        <div className="admin-actions">
          <a className="blog-btn blog-btn-sm" href={`${API_BASE}/admin/posts/export`}>
            Export JSON
          </a>
          <Link className="blog-btn blog-btn-primary blog-btn-sm" to="/admin/blog/new">
            <PlusIcon size={14} /> New article
          </Link>
        </div>
      </div>

      <div className="admin-stats">
        <div className="admin-stat">
          <span>Total articles</span>
          <strong>{loading ? "—" : totals?.total ?? 0}</strong>
        </div>
        <div className="admin-stat">
          <span>Published</span>
          <strong>{loading ? "—" : totals?.published ?? 0}</strong>
          <em>{totals?.draft ?? 0} drafts · {totals?.scheduled ?? 0} scheduled</em>
        </div>
        <div className="admin-stat">
          <span>Total reads</span>
          <strong>{loading ? "—" : formatNumber(totals?.views ?? 0)}</strong>
        </div>
        <div className="admin-stat">
          <span>Subscribers</span>
          <strong>{loading ? "—" : totals?.subscribers ?? 0}</strong>
          <em>{totals?.categories ?? 0} categories</em>
        </div>
      </div>

      <div className="admin-panel">
        <div className="admin-panel-head">
          <h2>Most read</h2>
          <Link to="/admin/blog/posts" className="blog-btn blog-btn-sm">Manage articles</Link>
        </div>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Article</th>
                <th>Status</th>
                <th>Reads</th>
                <th>Published</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {(data?.popular || []).map((post) => (
                <tr key={post.id}>
                  <td className="title-cell">
                    <Link to={`/admin/blog/edit/${post.id}`}>{post.title}</Link>
                    <div style={{ fontSize: "0.72rem", color: "#71717a", marginTop: 2 }}>
                      {post.category_name || "Uncategorised"} · {post.author_name || "No author"}
                    </div>
                  </td>
                  <td>
                    <span className={`admin-badge ${post.status}`}>{post.status}</span>
                    {post.is_featured && <span className="admin-badge featured" style={{ marginLeft: 4 }}>featured</span>}
                  </td>
                  <td><span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><EyeIcon size={13} /> {formatNumber(post.view_count)}</span></td>
                  <td>{formatDate(post.published_at)}</td>
                  <td>
                    <Link to={`/blog/${post.slug}`} className="blog-btn blog-btn-sm">View</Link>
                  </td>
                </tr>
              ))}
              {!loading && !data?.popular?.length && (
                <tr><td colSpan={5} className="admin-empty">No articles yet. Create the first one.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="admin-panel">
        <div className="admin-panel-head">
          <h2>Recently updated</h2>
        </div>
        <div className="admin-list">
          {(data?.recent || []).map((post) => (
            <div className="admin-list-item" key={post.id}>
              <div>
                <strong>{post.title}</strong>
                <div style={{ marginTop: 2 }}>{post.category_name || "Uncategorised"} · updated {formatDate(post.updated_at, { withTime: true })}</div>
              </div>
              <div className="admin-actions">
                {post.is_featured && <span className="admin-badge featured"><StarIcon size={11} /> featured</span>}
                <span className={`admin-badge ${post.status}`}>{post.status}</span>
                <Link to={`/admin/blog/edit/${post.id}`} className="blog-btn blog-btn-sm">Edit</Link>
              </div>
            </div>
          ))}
          {!loading && !data?.recent?.length && <div className="admin-empty">Nothing updated yet.</div>}
        </div>
      </div>
    </>
  );
}
