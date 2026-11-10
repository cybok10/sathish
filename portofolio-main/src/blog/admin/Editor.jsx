import { useEffect, useMemo, useRef, useState } from "react";
import { api, formatDate, submissionErrorMessage } from "../api";
import { useRouter } from "../router";
import { useAdmin } from "./AdminApp";
import { Markdown } from "../markdown";
import { assetUrl } from "../base";
import { ErrorState } from "../components/States";
import {
  ArrowLeft,
  CheckIcon,
  TrashIcon,
  UploadIcon,
} from "../components/Icons";

const EMPTY = {
  title: "",
  slug: "",
  excerpt: "",
  content: "",
  cover_image: "",
  category_id: "",
  author_id: "",
  meta_title: "",
  meta_description: "",
  status: "draft",
  is_featured: false,
  published_at: "",
};

function toLocalInput(iso) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function readFileBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] || "");
    reader.onerror = () => reject(new Error("Could not read the selected file"));
    reader.readAsDataURL(file);
  });
}

const TOOLBAR = [
  { label: "H2", title: "Heading", action: "line", prefix: "## " },
  { label: "B", title: "Bold", action: "wrap", prefix: "**", suffix: "**", placeholder: "bold text" },
  { label: "I", title: "Italic", action: "wrap", prefix: "*", suffix: "*", placeholder: "italic text" },
  { label: "`", title: "Inline code", action: "wrap", prefix: "`", suffix: "`", placeholder: "code" },
  { label: "Link", title: "Link", action: "wrap", prefix: "[", suffix: "](https://)", placeholder: "link text" },
  { label: "UL", title: "Bulleted list", action: "line", prefix: "- " },
  { label: "OL", title: "Numbered list", action: "line", prefix: "1. " },
  { label: "Quote", title: "Blockquote", action: "line", prefix: "> " },
  { label: "Code block", title: "Code block", action: "block", prefix: "```bash\n", suffix: "\n```", placeholder: "command" },
  { label: "Table", title: "Table", action: "insert", text: "\n| Column | Detail |\n| --- | --- |\n| Item | Value |\n\n" },
  { label: "---", title: "Divider", action: "insert", text: "\n---\n" },
];

export default function Editor({ postId }) {
  const isEdit = Boolean(postId);
  const { navigate } = useRouter();
  const { setNotice } = useAdmin();
  const [form, setForm] = useState(EMPTY);
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState("");
  const [categories, setCategories] = useState([]);
  const [authors, setAuthors] = useState([]);
  const [tagSuggestions, setTagSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("write");
  const [saveState, setSaveState] = useState("");
  const [restore, setRestore] = useState(null);
  const [uploading, setUploading] = useState(false);
  const textareaRef = useRef(null);
  const coverInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const autosaveKey = `blog.autosave.${postId || "new"}`;

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([
      api("/admin/categories"),
      api("/admin/authors"),
      api("/admin/tags"),
      isEdit ? api(`/admin/posts/${postId}`) : Promise.resolve(null),
    ])
      .then(([categoryData, authorData, tagData, postData]) => {
        if (!active) return;
        setCategories(categoryData.items || []);
        setAuthors(authorData.items || []);
        setTagSuggestions(tagData.items || []);
        if (postData?.post) {
          const post = postData.post;
          setForm({
            title: post.title || "",
            slug: post.slug || "",
            excerpt: post.excerpt || "",
            content: post.content || "",
            cover_image: post.cover_image || "",
            category_id: post.category_id ?? "",
            author_id: post.author_id ?? "",
            meta_title: post.meta_title || "",
            meta_description: post.meta_description || "",
            status: post.status || "draft",
            is_featured: Boolean(post.is_featured),
            published_at: toLocalInput(post.published_at),
          });
          setTags(post.tags || []);
        } else {
          setForm((previous) => ({
            ...previous,
            category_id: categoryData.items?.[0]?.id ?? "",
            author_id: authorData.items?.[0]?.id ?? "",
          }));
        }
        const stored = window.localStorage.getItem(autosaveKey);
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            const newerThanPost =
              !postData?.post ||
              Date.parse(parsed.savedAt) > Date.parse(postData.post.updated_at || 0);
            if (newerThanPost && parsed.form?.title) setRestore(parsed);
          } catch {
            window.localStorage.removeItem(autosaveKey);
          }
        }
      })
      .catch((fetchError) => {
        if (active) setLoadError(fetchError);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId, isEdit]);

  useEffect(() => {
    if (loading || restore) return;
    const timer = window.setTimeout(() => {
      if (!form.title && !form.content) return;
      window.localStorage.setItem(
        autosaveKey,
        JSON.stringify({ form, tags, savedAt: new Date().toISOString() })
      );
      setSaveState(`Draft autosaved ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`);
    }, 1500);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, tags, loading, restore]);

  const update = (key, value) => setForm((previous) => ({ ...previous, [key]: value }));

  const applyToolbar = (item) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const value = form.content;
    const selected = value.slice(start, end) || item.placeholder || "";

    let insertion = "";
    let cursorOffset = 0;
    if (item.action === "line") {
      const lineStart = value.lastIndexOf("\n", start - 1) + 1;
      const before = value.slice(0, lineStart);
      const line = value.slice(lineStart);
      insertion = item.prefix;
      setForm((previous) => ({ ...previous, content: `${before}${item.prefix}${line}` }));
      cursorOffset = start + item.prefix.length;
      window.setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(cursorOffset, cursorOffset);
      }, 0);
      return;
    }
    if (item.action === "insert") {
      insertion = item.text;
      setForm((previous) => ({
        ...previous,
        content: `${value.slice(0, start)}${insertion}${value.slice(end)}`,
      }));
      cursorOffset = start + insertion.length;
    } else {
      insertion = `${item.prefix}${selected}${item.suffix}`;
      setForm((previous) => ({
        ...previous,
        content: `${value.slice(0, start)}${insertion}${value.slice(end)}`,
      }));
      cursorOffset = start + item.prefix.length + selected.length;
    }
    window.setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(cursorOffset, cursorOffset);
    }, 0);
  };

  const addTag = (value) => {
    const next = value.trim().replace(/^#/, "");
    if (!next || tags.includes(next) || tags.length >= 8) return;
    setTags((previous) => [...previous, next]);
    setTagInput("");
  };

  const uploadImage = async (file) => {
    setUploading(true);
    setError("");
    try {
      const dataBase64 = await readFileBase64(file);
      const result = await api("/admin/uploads", {
        method: "POST",
        body: { filename: file.name, dataBase64 },
      });
      return result.url;
    } catch (uploadError) {
      setError(submissionErrorMessage(uploadError));
      return null;
    } finally {
      setUploading(false);
    }
  };

  const onCoverSelected = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const url = await uploadImage(file);
    if (url) update("cover_image", url);
  };

  const onInlineImageSelected = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const url = await uploadImage(file);
    if (!url) return;
    const textarea = textareaRef.current;
    const position = textarea ? textarea.selectionStart : form.content.length;
    const snippet = `\n![${file.name.replace(/\.[^.]+$/, "")}](${url})\n`;
    setForm((previous) => ({
      ...previous,
      content: `${previous.content.slice(0, position)}${snippet}${previous.content.slice(position)}`,
    }));
  };

  const save = async (nextStatus) => {
    if (saving) return;
    setError("");
    if (form.title.trim().length < 3) {
      setError("Give the article a title of at least 3 characters.");
      return;
    }
    if (!form.content.trim()) {
      setError("The article needs content before it can be saved.");
      return;
    }

    const status = nextStatus || form.status;
    if (status === "scheduled" && !form.published_at) {
      setError("Choose a future publication date before scheduling.");
      return;
    }

    const payload = {
      title: form.title.trim(),
      slug: form.slug.trim() || undefined,
      excerpt: form.excerpt.trim(),
      content: form.content,
      cover_image: form.cover_image,
      category_id: form.category_id === "" ? null : Number(form.category_id),
      author_id: form.author_id === "" ? null : Number(form.author_id),
      meta_title: form.meta_title.trim(),
      meta_description: form.meta_description.trim(),
      status,
      is_featured: form.is_featured,
      published_at: form.published_at ? new Date(form.published_at).toISOString() : null,
      tags,
    };

    setSaving(true);
    try {
      const result = isEdit
        ? await api(`/admin/posts/${postId}`, { method: "PUT", body: payload })
        : await api("/admin/posts", { method: "POST", body: payload });
      window.localStorage.removeItem(autosaveKey);
      setSaveState("");
      setNotice(
        status === "published"
          ? "Article published."
          : status === "scheduled"
            ? "Article scheduled."
            : "Draft saved."
      );
      if (!isEdit) navigate(`/admin/blog/edit/${result.post.id}`);
      else {
        setForm((previous) => ({
          ...previous,
          status: result.post.status,
          published_at: toLocalInput(result.post.published_at),
          slug: result.post.slug,
        }));
      }
    } catch (saveError) {
      setError(submissionErrorMessage(saveError));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!window.confirm("Delete this article permanently?")) return;
    setSaving(true);
    try {
      await api(`/admin/posts/${postId}`, { method: "DELETE" });
      window.localStorage.removeItem(autosaveKey);
      setNotice("Article deleted.");
      navigate("/admin/blog/posts");
    } catch (deleteError) {
      setError(submissionErrorMessage(deleteError));
    } finally {
      setSaving(false);
    }
  };

  const preview = useMemo(() => <Markdown content={form.content || "*Nothing to preview yet.*"} />, [form.content]);

  if (loading) {
    return <div className="admin-panel" style={{ padding: "2rem" }}><p className="blog-dim">Loading editor…</p></div>;
  }

  if (loadError) {
    return <ErrorState error={loadError} title="Editor could not load" />;
  }

  return (
    <>
      <div className="admin-topbar">
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <button type="button" className="blog-btn blog-btn-sm" onClick={() => navigate("/admin/blog/posts")} aria-label="Back to articles">
            <ArrowLeft size={14} />
          </button>
          <div>
            <h1>{isEdit ? "Edit article" : "New article"}</h1>
            <p>
              {isEdit ? `Post #${postId} · ${form.status}` : "Draft a new research article."}
              {saveState && <> · <span className="admin-save-state saved">{saveState}</span></>}
            </p>
          </div>
        </div>
        <div className="admin-actions">
          <button type="button" className="blog-btn blog-btn-sm" disabled={saving} onClick={() => save(form.status)}>
            {saving ? "Saving…" : "Save"}
          </button>
          {form.status === "published" ? (
            <button type="button" className="blog-btn blog-btn-sm" disabled={saving} onClick={() => save("draft")}>
              Unpublish
            </button>
          ) : (
            <button type="button" className="blog-btn blog-btn-primary blog-btn-sm" disabled={saving} onClick={() => save("published")}>
              <CheckIcon size={14} /> Publish
            </button>
          )}
        </div>
      </div>

      {restore && (
        <div className="blog-success" style={{ marginBottom: "1rem", display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
          <span>An unsaved local draft from {formatDate(restore.savedAt, { withTime: true })} was found.</span>
          <button
            type="button"
            className="blog-btn blog-btn-sm"
            onClick={() => {
              setForm({ ...EMPTY, ...restore.form });
              setTags(restore.tags || []);
              setRestore(null);
            }}
          >
            Restore draft
          </button>
          <button
            type="button"
            className="blog-btn blog-btn-sm"
            onClick={() => {
              window.localStorage.removeItem(autosaveKey);
              setRestore(null);
            }}
          >
            Discard
          </button>
        </div>
      )}

      {error && <div className="blog-error" style={{ marginBottom: "1rem" }} role="alert">{error}</div>}

      <div className="admin-editor-layout">
        <div className="admin-editor-main">
          <div className="admin-panel" style={{ marginTop: 0, padding: "1rem" }}>
            <label className="blog-field">
              <span>Title</span>
              <input
                className="blog-input"
                style={{ fontSize: "1.15rem", fontWeight: 600 }}
                value={form.title}
                onChange={(event) => update("title", event.target.value)}
                placeholder="A specific, useful title"
              />
            </label>
            <label className="blog-field" style={{ marginTop: "0.8rem" }}>
              <span>Slug</span>
              <input
                className="blog-input"
                value={form.slug}
                onChange={(event) => update("slug", event.target.value)}
                placeholder="auto-generated-from-title"
              />
            </label>
            <label className="blog-field" style={{ marginTop: "0.8rem" }}>
              <span>Excerpt</span>
              <textarea
                className="blog-textarea"
                rows={2}
                value={form.excerpt}
                onChange={(event) => update("excerpt", event.target.value)}
                placeholder="One or two sentences shown on cards and in search results."
              />
            </label>
          </div>

          <div className="admin-panel" style={{ marginTop: 0, padding: "0.9rem" }}>
            <div className="admin-tabs">
              <button type="button" className={tab === "write" ? "active" : ""} onClick={() => setTab("write")}>Write</button>
              <button type="button" className={tab === "preview" ? "active" : ""} onClick={() => setTab("preview")}>Preview</button>
              <button type="button" className={tab === "split" ? "active" : ""} onClick={() => setTab("split")}>Split</button>
            </div>

            <div className="admin-toolbar" role="toolbar" aria-label="Formatting">
              {TOOLBAR.map((item) => (
                <button key={item.label} type="button" title={item.title} onClick={() => applyToolbar(item)}>
                  {item.label}
                </button>
              ))}
              <span className="divider" />
              <button type="button" title="Upload image" onClick={() => imageInputRef.current?.click()} disabled={uploading}>
                {uploading ? "…" : "Image"}
              </button>
              <input ref={imageInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden onChange={onInlineImageSelected} />
            </div>

            <div
              style={
                tab === "split"
                  ? { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.9rem" }
                  : undefined
              }
            >
              {(tab === "write" || tab === "split") && (
                <textarea
                  ref={textareaRef}
                  className="blog-textarea admin-editor-textarea"
                  style={tab === "split" ? { minHeight: 480 } : undefined}
                  value={form.content}
                  onChange={(event) => update("content", event.target.value)}
                  placeholder={"## Start with a heading\n\nWrite the article in Markdown. Use the toolbar for formatting, code blocks, and images."}
                  spellCheck="true"
                />
              )}
              {(tab === "preview" || tab === "split") && (
                <div className="admin-preview" style={tab === "split" ? { minHeight: 480 } : undefined}>
                  {preview}
                </div>
              )}
            </div>
            <p className="admin-note" style={{ marginTop: "0.6rem" }}>
              Markdown is stored raw and rendered with an HTML-escaping renderer. Raw HTML is shown as
              text, not executed.
            </p>
          </div>
        </div>

        <div className="admin-editor-side">
          <div className="admin-panel" style={{ marginTop: 0, padding: "1rem" }}>
            <h2 style={{ fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "#71717a", marginBottom: "0.8rem" }}>
              Publishing
            </h2>
            <div className="blog-field">
              <span>Status</span>
              <select className="blog-select" value={form.status} onChange={(event) => update("status", event.target.value)}>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="scheduled">Scheduled</option>
              </select>
            </div>
            <div className="blog-field" style={{ marginTop: "0.8rem" }}>
              <span>Publication date</span>
              <input
                className="blog-input"
                type="datetime-local"
                value={form.published_at}
                onChange={(event) => update("published_at", event.target.value)}
              />
            </div>
            <label className="admin-checkbox" style={{ marginTop: "0.8rem" }}>
              <input
                type="checkbox"
                checked={form.is_featured}
                onChange={(event) => update("is_featured", event.target.checked)}
              />
              Feature on the blog homepage
            </label>
            {form.status === "scheduled" && (
              <button type="button" className="blog-btn blog-btn-sm" style={{ marginTop: "0.8rem", width: "100%" }} disabled={saving} onClick={() => save("scheduled")}>
                Schedule publication
              </button>
            )}
            {isEdit && (
              <button type="button" className="blog-btn blog-btn-danger blog-btn-sm" style={{ marginTop: "0.8rem", width: "100%" }} disabled={saving} onClick={remove}>
                <TrashIcon size={13} /> Delete article
              </button>
            )}
          </div>

          <div className="admin-panel" style={{ marginTop: 0, padding: "1rem" }}>
            <h2 style={{ fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "#71717a", marginBottom: "0.8rem" }}>
              Cover image
            </h2>
            {form.cover_image ? (
              <img className="admin-cover-preview" src={assetUrl(form.cover_image)} alt="Cover preview" />
            ) : (
              <div className="admin-cover-preview" style={{ display: "grid", placeItems: "center", color: "#52525b", fontSize: "0.78rem" }}>
                No cover selected
              </div>
            )}
            <div className="admin-upload-row" style={{ marginTop: "0.7rem" }}>
              <button type="button" className="blog-btn blog-btn-sm" disabled={uploading} onClick={() => coverInputRef.current?.click()}>
                <UploadIcon size={13} /> {uploading ? "Uploading…" : "Upload"}
              </button>
              {form.cover_image && (
                <button type="button" className="blog-btn blog-btn-sm" onClick={() => update("cover_image", "")}>
                  Remove
                </button>
              )}
              <input ref={coverInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden onChange={onCoverSelected} />
            </div>
            <input
              className="blog-input"
              style={{ marginTop: "0.6rem" }}
              value={form.cover_image}
              onChange={(event) => update("cover_image", event.target.value)}
              placeholder="/assets/… or https://…"
              aria-label="Cover image URL"
            />
          </div>

          <div className="admin-panel" style={{ marginTop: 0, padding: "1rem" }}>
            <h2 style={{ fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "#71717a", marginBottom: "0.8rem" }}>
              Organisation
            </h2>
            <div className="blog-field">
              <span>Category</span>
              <select className="blog-select" value={form.category_id} onChange={(event) => update("category_id", event.target.value)}>
                <option value="">Uncategorised</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </select>
            </div>
            <div className="blog-field" style={{ marginTop: "0.8rem" }}>
              <span>Author</span>
              <select className="blog-select" value={form.author_id} onChange={(event) => update("author_id", event.target.value)}>
                <option value="">No author</option>
                {authors.map((author) => (
                  <option key={author.id} value={author.id}>{author.name}</option>
                ))}
              </select>
            </div>
            <div className="blog-field" style={{ marginTop: "0.8rem" }}>
              <span>Tags (max 8)</span>
              <div className="admin-chips" style={{ marginBottom: "0.4rem" }}>
                {tags.map((tag) => (
                  <span className="admin-chip" key={tag}>
                    {tag}
                    <button type="button" onClick={() => setTags((previous) => previous.filter((value) => value !== tag))} aria-label={`Remove ${tag}`}>×</button>
                  </span>
                ))}
              </div>
              <input
                className="blog-input"
                value={tagInput}
                onChange={(event) => setTagInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === ",") {
                    event.preventDefault();
                    addTag(tagInput);
                  }
                }}
                onBlur={() => addTag(tagInput)}
                placeholder="Type a tag and press Enter"
              />
              {tagSuggestions.length > 0 && (
                <div style={{ display: "flex", gap: "0.3rem", flexWrap: "wrap", marginTop: "0.45rem" }}>
                  {tagSuggestions
                    .filter((tag) => !tags.includes(tag.name))
                    .slice(0, 10)
                    .map((tag) => (
                      <button key={tag.id} type="button" className="blog-chip" onClick={() => addTag(tag.name)}>
                        + {tag.name}
                      </button>
                    ))}
                </div>
              )}
            </div>
          </div>

          <div className="admin-panel" style={{ marginTop: 0, padding: "1rem" }}>
            <h2 style={{ fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "#71717a", marginBottom: "0.8rem" }}>
              SEO
            </h2>
            <div className="blog-field">
              <span>Meta title</span>
              <input className="blog-input" value={form.meta_title} onChange={(event) => update("meta_title", event.target.value)} maxLength={160} placeholder={form.title || "Defaults to the title"} />
            </div>
            <div className="blog-field" style={{ marginTop: "0.8rem" }}>
              <span>Meta description</span>
              <textarea className="blog-textarea" rows={3} value={form.meta_description} onChange={(event) => update("meta_description", event.target.value)} maxLength={320} placeholder={form.excerpt || "Defaults to the excerpt"} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
