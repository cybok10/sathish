import { useMemo, useRef, useState } from "react";
import { api, formatDate, submissionErrorMessage } from "../api";
import { useApi } from "../useApi";
import { ErrorState } from "../components/States";
import {
  CheckIcon,
  PlusIcon,
  ShieldIcon,
  UsersIcon,
  XIcon,
} from "../components/Icons";

const STATUS_LABEL = {
  active: "Active",
  invited: "Invited",
  disabled: "Disabled",
};

/**
 * A readable temporary password.
 *
 * The writer has to type it once and change it, so it needs to be long
 * enough to be worth something and short enough to retype.
 */
function generatePassword() {
  const words = [
    "ember",
    "quartz",
    "harbour",
    "lantern",
    "meridian",
    "copper",
    "vellum",
    "thicket",
  ];
  const pick = () => words[Math.floor(Math.random() * words.length)];
  const number = String(Math.floor(10 + Math.random() * 89));
  const symbol = "!@#$%&*+-?".charAt(Math.floor(Math.random() * 9));
  return `${pick()}-${pick()}-${number}${symbol}`;
}

function CopyButton({ value, label = "Copy" }) {
  const [copied, setCopied] = useState(false);
  if (!value) return null;
  return (
    <button
      type="button"
      className="blog-btn blog-btn-sm"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1600);
        } catch {
          setCopied(false);
        }
      }}
      aria-label={`${label} to clipboard`}
    >
      {copied ? <CheckIcon size={13} /> : null}
      {copied ? "Copied" : label}
    </button>
  );
}

function RoleBadge({ role }) {
  return (
    <span className={`admin-badge ${role === "admin" ? "published" : "scheduled"}`}>
      {role === "admin" ? "Administrator" : "Writer"}
    </span>
  );
}

function StatusBadge({ status }) {
  return (
    <span className={`admin-badge ${status === "active" ? "published" : status === "invited" ? "scheduled" : "draft"}`}>
      {STATUS_LABEL[status] || status}
    </span>
  );
}

function WriterRow({ writer, authors, onChange, busy }) {
  const [resetting, setResetting] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");

  const act = async (action) => {
    setError("");
    try {
      await onChange(writer, action);
    } catch (actionError) {
      setError(submissionErrorMessage(actionError));
    }
  };

  const submitReset = async (event) => {
    event.preventDefault();
    if (newPassword.trim().length < 10) {
      setError("Use at least 10 characters.");
      return;
    }
    await act({ type: "reset", password: newPassword.trim() });
    setResetting(false);
    setNewPassword("");
  };

  return (
    <>
      <tr>
        <td className="title-cell">
          <strong style={{ color: "#fafafa" }}>{writer.name || "Unnamed"}</strong>
          <div style={{ fontSize: "0.72rem", color: "#71717a", marginTop: 2 }}>{writer.email}</div>
        </td>
        <td><RoleBadge role={writer.role} /></td>
        <td>
          <select
            className="blog-select"
            style={{ width: "100%", minWidth: 140 }}
            value={writer.author_id ?? ""}
            disabled={busy}
            onChange={(event) =>
              act({
                type: "byline",
                authorId: event.target.value === "" ? null : Number(event.target.value),
              })
            }
            aria-label={`Byline for ${writer.name || writer.email}`}
          >
            <option value="">No byline</option>
            {authors.map((author) => (
              <option key={author.id} value={author.id}>
                {author.name}
              </option>
            ))}
          </select>
        </td>
        <td>{writer.post_count ?? 0}</td>
        <td>{writer.last_login_at ? formatDate(writer.last_login_at, { withTime: true }) : <span style={{ color: "#52525b" }}>Never</span>}</td>
        <td><StatusBadge status={writer.status || "active"} /></td>
        <td>
          <div className="admin-row-actions">
            <button
              type="button"
              className="blog-btn blog-btn-sm"
              disabled={busy}
              onClick={() => act({ type: "role", role: writer.role === "admin" ? "editor" : "admin" })}
            >
              {writer.role === "admin" ? "Make writer" : "Make admin"}
            </button>
            <button type="button" className="blog-btn blog-btn-sm" disabled={busy} onClick={() => setResetting((value) => !value)}>
              Reset password
            </button>
            <button
              type="button"
              className={`blog-btn blog-btn-sm${writer.status === "disabled" ? "" : " blog-btn-danger"}`}
              disabled={busy}
              onClick={() => act({ type: "status", status: writer.status === "disabled" ? "active" : "disabled" })}
            >
              {writer.status === "disabled" ? "Enable" : "Disable"}
            </button>
          </div>
        </td>
      </tr>
      {resetting && (
        <tr>
          <td colSpan={7} className="admin-expanded-row">
            <form onSubmit={submitReset} className="admin-inline-form">
              <label className="blog-field" style={{ flex: 1, minWidth: 220 }}>
                <span>New temporary password</span>
                <input
                  className="blog-input"
                  type="text"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  placeholder="At least 10 characters"
                  autoComplete="off"
                />
              </label>
              <button type="button" className="blog-btn blog-btn-sm" onClick={() => setNewPassword(generatePassword())}>
                Generate
              </button>
              <button type="submit" className="blog-btn blog-btn-primary blog-btn-sm" disabled={busy}>
                Set password
              </button>
              <button type="button" className="blog-btn blog-btn-sm" onClick={() => setResetting(false)}>
                Cancel
              </button>
              {error && <span className="blog-error" role="alert">{error}</span>}
            </form>
          </td>
        </tr>
      )}
    </>
  );
}

function CreateWriterForm({ authors, onCreated, onCancel }) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    role: "editor",
    author_id: "",
    password: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const update = (key, value) => setForm((previous) => ({ ...previous, [key]: value }));

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const result = await api("/admin/writers", {
        method: "POST",
        body: {
          name: form.name.trim(),
          email: form.email.trim(),
          role: form.role,
          author_id: form.author_id === "" ? null : Number(form.author_id),
          password: form.password,
        },
      });
      onCreated(result.writer, form.password);
    } catch (submitError) {
      setError(submissionErrorMessage(submitError));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="admin-writer-form" onSubmit={submit}>
      <div className="admin-panel-head">
        <h2>New writer account</h2>
        <button type="button" className="blog-btn blog-btn-sm" onClick={onCancel} aria-label="Close">
          <XIcon size={13} />
        </button>
      </div>

      <div className="admin-writer-form-grid">
        <label className="blog-field">
          <span>Display name</span>
          <input
            className="blog-input"
            value={form.name}
            onChange={(event) => update("name", event.target.value)}
            placeholder="How their name appears in the console"
            required
          />
        </label>

        <label className="blog-field">
          <span>Email</span>
          <input
            className="blog-input"
            type="email"
            value={form.email}
            onChange={(event) => update("email", event.target.value)}
            placeholder="writer@example.com"
            required
          />
        </label>

        <label className="blog-field">
          <span>Role</span>
          <select className="blog-select" value={form.role} onChange={(event) => update("role", event.target.value)}>
            <option value="editor">Writer — drafts only</option>
            <option value="admin">Administrator — full control</option>
          </select>
        </label>

        <label className="blog-field">
          <span>Public byline</span>
          <select className="blog-select" value={form.author_id} onChange={(event) => update("author_id", event.target.value)}>
            <option value="">Create one from their name</option>
            {authors.map((author) => (
              <option key={author.id} value={author.id}>
                {author.name}
              </option>
            ))}
          </select>
        </label>

        <label className="blog-field" style={{ gridColumn: "1 / -1" }}>
          <span>Temporary password</span>
          <div className="admin-inline-form">
            <input
              className="blog-input"
              type="text"
              value={form.password}
              onChange={(event) => update("password", event.target.value)}
              placeholder="At least 10 characters"
              autoComplete="off"
              required
              minLength={10}
            />
            <button type="button" className="blog-btn blog-btn-sm" onClick={() => update("password", generatePassword())}>
              Generate
            </button>
          </div>
          <em className="admin-note">
            Share it over a channel you trust. The writer signs in with it and then asks you to reset it.
          </em>
        </label>
      </div>

      {error && <div className="blog-error" role="alert">{error}</div>}

      <div className="admin-actions" style={{ justifyContent: "flex-end" }}>
        <button type="button" className="blog-btn blog-btn-sm" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="blog-btn blog-btn-primary blog-btn-sm" disabled={busy}>
          {busy ? "Creating…" : "Create account"}
        </button>
      </div>
    </form>
  );
}

function ActivityTable() {
  const { data, loading, error, reload } = useApi((signal) => api("/admin/audit", { signal }), []);

  if (error) return <ErrorState error={error} onRetry={reload} title="Activity unavailable" />;

  const items = data?.items || [];

  return (
    <div className="admin-panel" style={{ marginTop: 0 }}>
      <div className="admin-panel-head">
        <h2>Recent activity</h2>
        <span className="admin-note">Who changed what, and when.</span>
      </div>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>When</th>
              <th>Who</th>
              <th>Action</th>
              <th>Detail</th>
            </tr>
          </thead>
          <tbody>
            {items.map((entry) => (
              <tr key={entry.id}>
                <td style={{ whiteSpace: "nowrap" }}>{formatDate(entry.created_at, { withTime: true })}</td>
                <td>{entry.admin_email || "—"}</td>
                <td><span className="admin-badge scheduled">{entry.action}</span></td>
                <td style={{ color: "#a1a1aa" }}>
                  {entry.detail || "—"}
                  {entry.target_type ? (
                    <span style={{ color: "#52525b" }}> · {entry.target_type}#{entry.target_id}</span>
                  ) : null}
                </td>
              </tr>
            ))}
            {loading && <tr><td colSpan={4} className="admin-empty">Loading activity…</td></tr>}
            {!loading && !items.length && (
              <tr><td colSpan={4} className="admin-empty">Nothing recorded yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function Writers() {
  const { data, loading, error: loadError, reload } = useApi((signal) => api("/admin/writers", { signal }), []);
  const authorsQuery = useApi((signal) => api("/admin/authors", { signal }), []);
  const [tab, setTab] = useState("writers");
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");
  const [created, setCreated] = useState(null);
  const noticeRef = useRef(null);

  const writers = useMemo(() => data?.items || [], [data]);

  const change = async (writer, action) => {
    setBusyId(writer.id);
    setError("");
    try {
      if (action.type === "role") {
        await api(`/admin/writers/${writer.id}`, { method: "PATCH", body: { role: action.role } });
      } else if (action.type === "status") {
        await api(`/admin/writers/${writer.id}`, { method: "PATCH", body: { status: action.status } });
      } else if (action.type === "reset") {
        await api(`/admin/writers/${writer.id}`, { method: "PATCH", body: { password: action.password } });
      } else if (action.type === "byline") {
        await api(`/admin/writers/${writer.id}`, { method: "PATCH", body: { author_id: action.authorId } });
      }
      reload();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <div className="admin-topbar">
        <div>
          <h1>Writers</h1>
          <p>Give other people a way to write on this blog — without giving them the keys.</p>
        </div>
        <div className="admin-actions">
          <button
            type="button"
            className="blog-btn blog-btn-sm"
            onClick={() => setTab(tab === "writers" ? "activity" : "writers")}
          >
            {tab === "writers" ? "Activity log" : "Back to writers"}
          </button>
          <button
            type="button"
            className="blog-btn blog-btn-primary blog-btn-sm"
            onClick={() => {
              setCreating((value) => !value);
              setCreated(null);
            }}
          >
            <PlusIcon size={14} /> Add writer
          </button>
        </div>
      </div>

      {created && (
        <div className="blog-success admin-created-note" role="status">
          <div>
            <strong>{created.name}</strong> can now sign in at <code>/admin/blog</code>.
          </div>
          <div className="admin-inline-form">
            <code className="admin-credential">{created.email}</code>
            <code className="admin-credential">{created.password}</code>
            <CopyButton value={`${created.email} / ${created.password}`} label="Copy credentials" />
          </div>
          <em className="admin-note">
            This password is shown once. Send it over a channel you trust, then reset it from the table.
          </em>
        </div>
      )}

      {error && <div className="blog-error" style={{ marginBottom: "1rem" }} role="alert">{error}</div>}

      {tab === "activity" ? (
        <ActivityTable />
      ) : (
        <>
          {creating && (
            <CreateWriterForm
              authors={authorsQuery.data?.items || []}
              onCreated={(writer, password) => {
                setCreated({ ...writer, password });
                setCreating(false);
                reload();
                window.setTimeout(() => noticeRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 50);
              }}
              onCancel={() => setCreating(false)}
            />
          )}

          <div className="admin-panel" style={{ marginTop: creating ? "1rem" : 0 }}>
            <div className="admin-panel-head">
              <h2>Accounts</h2>
              <span className="admin-note">
                <UsersIcon size={12} /> {writers.length} account{writers.length === 1 ? "" : "s"}
              </span>
            </div>

            {loadError ? (
              <div style={{ padding: "1rem" }}>
                <ErrorState error={loadError} onRetry={reload} />
              </div>
            ) : (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Writer</th>
                      <th>Role</th>
                      <th>Byline</th>
                      <th>Articles</th>
                      <th>Last seen</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {writers.map((writer) => (
                      <WriterRow
                        key={writer.id}
                        writer={writer}
                        authors={authorsQuery.data?.items || []}
                        busy={busyId === writer.id}
                        onChange={change}
                      />
                    ))}
                    {loading && !writers.length && (
                      <tr><td colSpan={7} className="admin-empty">Loading accounts…</td></tr>
                    )}
                    {!loading && !writers.length && (
                      <tr><td colSpan={7} className="admin-empty">No accounts yet.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="admin-panel">
            <div className="admin-panel-head">
              <h2>How the roles work</h2>
            </div>
            <div className="admin-role-guide">
              <div>
                <ShieldIcon size={16} />
                <strong>Writer</strong>
                <p>
                  Writes and edits their own drafts, uploads images, and submits for review.
                  Cannot publish, delete, or change categories, tags or bylines.
                </p>
              </div>
              <div>
                <ShieldIcon size={16} />
                <strong>Administrator</strong>
                <p>
                  Everything a writer can do, plus publishing, scheduling, featuring, deleting,
                  taxonomy, subscribers and writer accounts.
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
