import { useState } from "react";
import { api, formatDate, formatNumber, submissionErrorMessage } from "../api";
import { apiUrl } from "../base";
import { Link } from "../router";
import { useApi } from "../useApi";
import { useAdmin } from "./AdminApp";
import { canPublish, isAdmin } from "./permissions";
import { ErrorState } from "../components/States";
import { CheckIcon, EyeIcon, PlusIcon, StarIcon } from "../components/Icons";

function StatCard({ label, value, note }) {
  return (
    <div className="admin-stat">
      <span>{label}</span>
      <strong>{value}</strong>
      {note ? <em>{note}</em> : null}
    </div>
  );
}

export default function Dashboard() {
  const { admin } = useAdmin();
  const publisher = canPublish(admin);
  const { data, loading, error, reload } = useApi((signal) => api("/admin/stats", { signal }), []);

  // Administrators get a review queue: drafts waiting for a publish decision.
  const draftsQuery = useApi(
    (signal) =>
      publisher
        ? api("/admin/posts?status=draft&limit=8", { signal })
        : Promise.resolve({ items: [], pagination: { total: 0 } }),
    [publisher]
  );

  const [busyId, setBusyId] = useState(null);
  const [actionError, setActionError] = useState("");

  if (error) return <ErrorState error={error} onRetry={reload} title="Dashboard unavailable" />;

  const totals = data?.totals;
  const drafts = draftsQuery.data?.items || [];

  const publish = async (post) => {
    setBusyId(post.id);
    setActionError("");
    try {
      await api(`/admin/posts/${post.id}/publish`, { method: "POST", body: {} });
      draftsQuery.reload();
      reload();
    } catch (publishError) {
      setActionError(submissionErrorMessage(publishError));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <div className="admin-topbar">
        <div>
          <h1>{publisher ? "Dashboard" : "Your desk"}</h1>
          <p>
            {publisher
              ? "Publishing overview for the research blog."
              : "What you have written, and what is waiting for review."}
          </p>
        </div>
        <div className="admin-actions">
          {publisher && (
            <a className="blog-btn blog-btn-sm" href={apiUrl("/admin/posts/export")}>
              Export JSON
            </a>
          )}
          <Link className="blog-btn blog-btn-primary blog-btn-sm" to="/admin/blog/new">
            <PlusIcon size={14} /> New article
          </Link>
        </div>
      </div>

      <div className="admin-stats">
        <StatCard
          label={publisher ? "Total articles" : "Your articles"}
          value={loading ? "—" : totals?.total ?? 0}
          note={publisher ? "across the whole blog" : "you have written"}
        />
        <StatCard
          label="Published"
          value={loading ? "—" : totals?.published ?? 0}
          note={`${totals?.draft ?? 0} drafts · ${totals?.scheduled ?? 0} scheduled`}
        />
        <StatCard
          label="Total reads"
          value={loading ? "—" : formatNumber(totals?.views ?? 0)}
        />
        {publisher ? (
          <StatCard
            label="Subscribers"
            value={loading ? "—" : totals?.subscribers ?? 0}
            note={`${totals?.categories ?? 0} categories`}
          />
        ) : (
          <StatCard
            label="Waiting for review"
            value={loading ? "—" : totals?.draft ?? 0}
            note="an administrator publishes these"
          />
        )}
      </div>

      {actionError && <div className="blog-error" style={{ marginTop: "1rem" }} role="alert">{actionError}</div>}

      {publisher && (
        <div className="admin-panel">
          <div className="admin-panel-head">
            <h2>Waiting for review</h2>
            <Link to="/admin/blog/posts?status=draft" className="blog-btn blog-btn-sm">
              See all drafts
            </Link>
          </div>
          <div className="admin-list">
            {drafts.map((post) => (
              <div className="admin-list-item" key={post.id}>
                <div>
                  <strong>{post.title}</strong>
                  <div style={{ marginTop: 2 }}>
                    {post.author_name || "No byline"} · updated {formatDate(post.updated_at, { withTime: true })}
                  </div>
                </div>
                <div className="admin-actions">
                  <Link to={`/admin/blog/edit/${post.id}`} className="blog-btn blog-btn-sm">
                    Review
                  </Link>
                  <button
                    type="button"
                    className="blog-btn blog-btn-primary blog-btn-sm"
                    disabled={busyId === post.id}
                    onClick={() => publish(post)}
                  >
                    <CheckIcon size={13} /> Publish
                  </button>
                </div>
              </div>
            ))}
            {draftsQuery.loading && !drafts.length && <div className="admin-empty">Loading drafts…</div>}
            {!draftsQuery.loading && !drafts.length && (
              <div className="admin-empty">Nothing waiting. Every draft has been published.</div>
            )}
          </div>
        </div>
      )}

      <div className="admin-panel">
        <div className="admin-panel-head">
          <h2>{publisher ? "Most read" : "Your most read"}</h2>
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
                    {post.status === "published" ? (
                      <Link to={`/blog/${post.slug}`} className="blog-btn blog-btn-sm">View</Link>
                    ) : (
                      <Link to={`/admin/blog/edit/${post.id}`} className="blog-btn blog-btn-sm">Open</Link>
                    )}
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

      {isAdmin(admin) && (
        <div className="admin-panel">
          <div className="admin-panel-head">
            <h2>Bringing in another writer</h2>
            <Link to="/admin/blog/writers" className="blog-btn blog-btn-sm">Manage writers</Link>
          </div>
          <div className="admin-role-guide">
            <div>
              <strong>They write, you publish.</strong>
              <p>
                A writer account can create drafts and upload images. Publishing, deleting, taxonomy and
                subscribers stay with administrators.
              </p>
            </div>
            <div>
              <strong>Each writer gets a byline.</strong>
              <p>
                Link a writer to an author profile so their articles carry their own name, photo and bio.
              </p>
            </div>
            <div>
              <strong>Everything is logged.</strong>
              <p>
                The activity log records who published, deleted or changed anything — useful once more
                than one person writes.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
