import { useState } from "react";
import { api, formatDate, submissionErrorMessage } from "../api";
import { useApi } from "../useApi";
import { useAdmin } from "./AdminApp";
import { ErrorState } from "../components/States";
import { PlusIcon, TrashIcon } from "../components/Icons";

function Section({ title, description, children }) {
  return (
    <div className="admin-panel" style={{ marginTop: "1rem" }}>
      <div className="admin-panel-head">
        <div>
          <h2>{title}</h2>
          {description && <p className="admin-note" style={{ marginTop: 3 }}>{description}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

export default function Taxonomy({ kind }) {
  const { setNotice } = useAdmin();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [categoryForm, setCategoryForm] = useState({ name: "", description: "" });
  const [tagForm, setTagForm] = useState({ name: "" });
  const [authorForm, setAuthorForm] = useState({
    name: "",
    role: "",
    bio: "",
    avatar_url: "",
    email: "",
    github: "",
    linkedin: "",
  });

  const categories = useApi((signal) => api("/admin/categories", { signal }), []);
  const tags = useApi((signal) => api("/admin/tags", { signal }), []);
  const authors = useApi((signal) => api("/admin/authors", { signal }), []);

  const reloadAll = () => {
    categories.reload();
    tags.reload();
    authors.reload();
  };

  const create = async (path, body, reset, success) => {
    setBusy(true);
    setError("");
    try {
      await api(path, { method: "POST", body });
      reset();
      setNotice(success);
      reloadAll();
    } catch (createError) {
      setError(submissionErrorMessage(createError));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (path, label) => {
    if (!window.confirm(`Delete ${label}? Articles using it will keep their content.`)) return;
    setBusy(true);
    setError("");
    try {
      await api(path, { method: "DELETE" });
      setNotice(`${label} deleted.`);
      reloadAll();
    } catch (deleteError) {
      setError(submissionErrorMessage(deleteError));
    } finally {
      setBusy(false);
    }
  };

  if (kind === "authors") {
    if (authors.error) return <ErrorState error={authors.error} onRetry={authors.reload} />;
    return (
      <>
        <div className="admin-topbar">
          <div>
            <h1>Authors</h1>
            <p>Profiles attached to published research.</p>
          </div>
        </div>
        {error && <div className="blog-error" role="alert">{error}</div>}

        <Section title="Add author" description="Only name is required. URLs are validated server-side.">
          <form
            className="admin-form"
            style={{ padding: "1rem" }}
            onSubmit={(event) => {
              event.preventDefault();
              create("/admin/authors", authorForm, () => setAuthorForm({ name: "", role: "", bio: "", avatar_url: "", email: "", github: "", linkedin: "" }), "Author added.");
            }}
          >
            <div className="admin-form-grid">
              <label className="blog-field"><span>Name</span><input className="blog-input" required minLength={2} value={authorForm.name} onChange={(e) => setAuthorForm({ ...authorForm, name: e.target.value })} /></label>
              <label className="blog-field"><span>Role</span><input className="blog-input" value={authorForm.role} onChange={(e) => setAuthorForm({ ...authorForm, role: e.target.value })} placeholder="Security researcher" /></label>
              <label className="blog-field"><span>Avatar URL</span><input className="blog-input" value={authorForm.avatar_url} onChange={(e) => setAuthorForm({ ...authorForm, avatar_url: e.target.value })} placeholder="/assets/sathish/sathish1.png" /></label>
              <label className="blog-field"><span>Email</span><input className="blog-input" type="email" value={authorForm.email} onChange={(e) => setAuthorForm({ ...authorForm, email: e.target.value })} /></label>
              <label className="blog-field"><span>GitHub</span><input className="blog-input" value={authorForm.github} onChange={(e) => setAuthorForm({ ...authorForm, github: e.target.value })} placeholder="https://github.com/…" /></label>
              <label className="blog-field"><span>LinkedIn</span><input className="blog-input" value={authorForm.linkedin} onChange={(e) => setAuthorForm({ ...authorForm, linkedin: e.target.value })} placeholder="https://linkedin.com/in/…" /></label>
            </div>
            <label className="blog-field"><span>Bio</span><textarea className="blog-textarea" rows={3} value={authorForm.bio} onChange={(e) => setAuthorForm({ ...authorForm, bio: e.target.value })} /></label>
            <div><button className="blog-btn blog-btn-primary blog-btn-sm" disabled={busy} type="submit"><PlusIcon size={13} /> Add author</button></div>
          </form>
        </Section>

        <Section title="Existing authors">
          <div className="admin-list">
            {(authors.data?.items || []).map((author) => (
              <div className="admin-list-item" key={author.id}>
                <div>
                  <strong>{author.name}</strong>
                  <div>{author.role || "No role"} · {author.post_count} article{author.post_count === 1 ? "" : "s"} · added {formatDate(author.created_at)}</div>
                </div>
                <button type="button" className="blog-btn blog-btn-sm blog-btn-danger" disabled={busy} onClick={() => remove(`/admin/authors/${author.id}`, `author “${author.name}”`)}>
                  <TrashIcon size={13} /> Delete
                </button>
              </div>
            ))}
            {!authors.loading && !authors.data?.items?.length && <div className="admin-empty">No authors yet.</div>}
          </div>
        </Section>
      </>
    );
  }

  if (categories.error || tags.error) {
    return <ErrorState error={categories.error || tags.error} onRetry={reloadAll} />;
  }

  return (
    <>
      <div className="admin-topbar">
        <div>
          <h1>Categories &amp; tags</h1>
          <p>Organise the archive. Slugs are generated and checked for duplicates.</p>
        </div>
      </div>
      {error && <div className="blog-error" role="alert">{error}</div>}

      <Section title="Categories" description="Categories drive navigation, related articles, and sitemap entries.">
        <form
          style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap", padding: "1rem", borderBottom: "1px solid #27272a" }}
          onSubmit={(event) => {
            event.preventDefault();
            create("/admin/categories", categoryForm, () => setCategoryForm({ name: "", description: "" }), "Category created.");
          }}
        >
          <input className="blog-input" style={{ flex: "0 1 220px" }} required minLength={2} placeholder="Category name" value={categoryForm.name} onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })} aria-label="Category name" />
          <input className="blog-input" style={{ flex: "1 1 280px" }} placeholder="Short description" value={categoryForm.description} onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })} aria-label="Category description" />
          <button className="blog-btn blog-btn-primary blog-btn-sm" disabled={busy} type="submit"><PlusIcon size={13} /> Add</button>
        </form>
        <div className="admin-list">
          {(categories.data?.items || []).map((category) => (
            <div className="admin-list-item" key={category.id}>
              <div>
                <strong>{category.name}</strong>
                <div>/{category.slug} · {category.post_count} article{category.post_count === 1 ? "" : "s"}</div>
              </div>
              <button type="button" className="blog-btn blog-btn-sm blog-btn-danger" disabled={busy} onClick={() => remove(`/admin/categories/${category.id}`, `category “${category.name}”`)}>
                <TrashIcon size={13} /> Delete
              </button>
            </div>
          ))}
          {!categories.loading && !categories.data?.items?.length && <div className="admin-empty">No categories yet.</div>}
        </div>
      </Section>

      <Section title="Tags" description="Free-form topics used by search and related articles.">
        <form
          style={{ display: "flex", gap: "0.6rem", padding: "1rem", borderBottom: "1px solid #27272a" }}
          onSubmit={(event) => {
            event.preventDefault();
            create("/admin/tags", tagForm, () => setTagForm({ name: "" }), "Tag created.");
          }}
        >
          <input className="blog-input" required minLength={2} placeholder="Tag name" value={tagForm.name} onChange={(e) => setTagForm({ name: e.target.value })} aria-label="Tag name" />
          <button className="blog-btn blog-btn-primary blog-btn-sm" disabled={busy} type="submit"><PlusIcon size={13} /> Add</button>
        </form>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.45rem", padding: "1rem" }}>
          {(tags.data?.items || []).map((tag) => (
            <span key={tag.id} className="admin-chip">
              #{tag.name}
              <span style={{ color: "#71717a" }}>{tag.post_count}</span>
              <button type="button" onClick={() => remove(`/admin/tags/${tag.id}`, `tag “${tag.name}”`)} aria-label={`Delete ${tag.name}`}>×</button>
            </span>
          ))}
          {!tags.loading && !tags.data?.items?.length && <span className="admin-note">No tags yet.</span>}
        </div>
      </Section>
    </>
  );
}
