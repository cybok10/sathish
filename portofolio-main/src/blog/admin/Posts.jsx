import { useState } from "react";
import { api, formatDate, formatNumber, queryString, submissionErrorMessage } from "../api";
import { Link, useRouter } from "../router";
import { useApi } from "../useApi";
import { useAdmin } from "./AdminApp";
import { ErrorState } from "../components/States";
import { EditIcon, ExternalIcon, PlusIcon, StarIcon, TrashIcon } from "../components/Icons";

export default function Posts() {
  const { navigate } = useRouter();
  const { setNotice } = useAdmin();
  const [status, setStatus] = useState("");
  const [query, setQuery] = useState("");
  const [appliedQuery, setAppliedQuery] = useState("");
  const [page, setPage] = useState(1);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");

  const { data, loading, error: loadError, reload } = useApi(
    (signal) => api(`/admin/posts${queryString({ status, q: appliedQuery, page, limit: 20 })}`, { signal }),
    [status, appliedQuery, page]
  );

  const runAction = async (post, action, body) => {
    setBusyId(post.id);
    setError("");
    try {
      await api(`/admin/posts/${post.id}/${action}`, { method: "POST", body });
      setNotice(`Article “${post.title}” ${action === "publish" ? "published" : action === "unpublish" ? "moved to draft" : action === "feature" ? "featured" : "updated"}.`);
      reload();
    } catch (actionError) {
      setError(submissionErrorMessage(actionError));
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (post) => {
    if (!window.confirm(`Delete “${post.title}” permanently? This cannot be undone.`)) return;
    setBusyId(post.id);
    setError("");
    try {
      await api(`/admin/posts/${post.id}`, { method: "DELETE" });
      setNotice(`Article “${post.title}” deleted.`);
      reload();
    } catch (actionError) {
      setError(submissionErrorMessage(actionError));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <div className="admin-topbar">
        <div>
          <h1>Articles</h1>
          <p>Create, edit, publish, schedule, and feature posts.</p>
        </div>
        <div className="admin-actions">
          <Link className="blog-btn blog-btn-primary blog-btn-sm" to="/admin/blog/new">
            <PlusIcon size={14} /> New article
          </Link>
        </div>
      </div>

      <div className="admin-panel" style={{ marginTop: 0 }}>
        <div className="admin-panel-head">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              setPage(1);
              setAppliedQuery(query.trim());
            }}
            style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}
          >
            <input
              className="blog-input"
              style={{ width: 260 }}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search title or slug…"
              aria-label="Search articles"
            />
            <select
              className="blog-select"
              style={{ width: 150 }}
              value={status}
              onChange={(event) => {
                setStatus(event.target.value);
                setPage(1);
              }}
              aria-label="Filter by status"
            >
              <option value="">All statuses</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
              <option value="scheduled">Scheduled</option>
            </select>
            <button type="submit" className="blog-btn blog-btn-sm">Filter</button>
          </form>
          <span className="admin-note">
            {data?.pagination?.total ?? 0} article{(data?.pagination?.total ?? 0) === 1 ? "" : "s"}
          </span>
        </div>

        {error && <div className="blog-error" style={{ margin: "1rem" }} role="alert">{error}</div>}

        {loadError ? (
          <div style={{ padding: "1rem" }}><ErrorState error={loadError} onRetry={reload} /></div>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Article</th>
                  <th>Category</th>
                  <th>Author</th>
                  <th>Status</th>
                  <th>Published</th>
                  <th>Reads</th>
                  <th>Updated</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {(data?.items || []).map((post) => (
                  <tr key={post.id}>
                    <td className="title-cell">
                      <Link to={`/admin/blog/edit/${post.id}`}>{post.title}</Link>
                      <div style={{ fontSize: "0.7rem", color: "#71717a", marginTop: 2 }}>/{post.slug}</div>
                    </td>
                    <td>{post.category_name || "—"}</td>
                    <td>{post.author_name || "—"}</td>
                    <td>
                      <span className={`admin-badge ${post.status}`}>{post.status}</span>
                      {post.is_featured && (
                        <span className="admin-badge featured" style={{ marginLeft: 4 }}>
                          <StarIcon size={10} /> featured
                        </span>
                      )}
                    </td>
                    <td>{formatDate(post.published_at)}</td>
                    <td>{formatNumber(post.view_count)}</td>
                    <td>{formatDate(post.updated_at)}</td>
                    <td>
                      <div className="admin-row-actions">
                        <button
                          type="button"
                          className="blog-btn blog-btn-sm"
                          onClick={() => navigate(`/admin/blog/edit/${post.id}`)}
                          aria-label={`Edit ${post.title}`}
                        >
                          <EditIcon size={13} />
                        </button>
                        <a
                          className="blog-btn blog-btn-sm"
                          href={`${import.meta.env.BASE_URL.replace(/\/$/, "")}/blog/${post.slug}`}
                          aria-label={`View ${post.title}`}
                        >
                          <ExternalIcon size={13} />
                        </a>
                        {post.status === "published" ? (
                          <button type="button" className="blog-btn blog-btn-sm" disabled={busyId === post.id} onClick={() => runAction(post, "unpublish")}>
                            Unpublish
                          </button>
                        ) : (
                          <button type="button" className="blog-btn blog-btn-sm" disabled={busyId === post.id} onClick={() => runAction(post, "publish")}>
                            Publish
                          </button>
                        )}
                        <button
                          type="button"
                          className="blog-btn blog-btn-sm"
                          disabled={busyId === post.id}
                          onClick={() => runAction(post, post.is_featured ? "unfeature" : "feature")}
                          aria-label={post.is_featured ? "Unfeature" : "Feature"}
                        >
                          <StarIcon size={13} />
                        </button>
                        <button
                          type="button"
                          className="blog-btn blog-btn-sm blog-btn-danger"
                          disabled={busyId === post.id}
                          onClick={() => remove(post)}
                          aria-label={`Delete ${post.title}`}
                        >
                          <TrashIcon size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {loading && !data && (
                  <tr><td colSpan={8} className="admin-empty">Loading articles…</td></tr>
                )}
                {!loading && !data?.items?.length && (
                  <tr><td colSpan={8} className="admin-empty">No articles match this filter.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {data?.pagination && data.pagination.totalPages > 1 && (
          <div style={{ display: "flex", justifyContent: "space-between", padding: "0.9rem 1.1rem", borderTop: "1px solid #27272a" }}>
            <button type="button" className="blog-btn blog-btn-sm" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>
              Previous
            </button>
            <span className="admin-note">Page {data.pagination.page} of {data.pagination.totalPages}</span>
            <button type="button" className="blog-btn blog-btn-sm" disabled={page >= data.pagination.totalPages} onClick={() => setPage((value) => value + 1)}>
              Next
            </button>
          </div>
        )}
      </div>
    </>
  );
}
