import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api, formatDate, submissionErrorMessage } from "../api";
import { useRouter } from "../router";
import { useAdmin } from "./AdminApp";
import { canDelete, isAdmin } from "./permissions";
import { Markdown } from "../markdown";
import { assetUrl } from "../base";
import { ErrorState } from "../components/States";
import {
  ArrowLeft,
  CheckIcon,
  ClockIcon,
  CloseIcon,
  EyeIcon,
  PlusIcon,
  TrashIcon,
  UploadIcon,
} from "../components/Icons";
import {
  checklistProgress,
  countWords,
  extractOutline,
  readingMinutes,
  reviewChecklist,
  slugifyTitle,
} from "./writing-tools";

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
  { id: "h2", label: "H2", title: "Heading", action: "line", prefix: "## " },
  { id: "h3", label: "H3", title: "Sub-heading", action: "line", prefix: "### " },
  { id: "bold", label: "B", title: "Bold (Ctrl+B)", action: "wrap", prefix: "**", suffix: "**", placeholder: "bold text" },
  { id: "italic", label: "I", title: "Italic (Ctrl+I)", action: "wrap", prefix: "*", suffix: "*", placeholder: "italic text" },
  { id: "code", label: "`", title: "Inline code", action: "wrap", prefix: "`", suffix: "`", placeholder: "code" },
  { id: "link", label: "Link", title: "Link", action: "wrap", prefix: "[", suffix: "](https://)", placeholder: "link text" },
  { id: "ul", label: "UL", title: "Bulleted list", action: "line", prefix: "- " },
  { id: "ol", label: "OL", title: "Numbered list", action: "line", prefix: "1. " },
  { id: "quote", label: "Quote", title: "Blockquote", action: "line", prefix: "> " },
  { id: "pre", label: "Code block", title: "Code block", action: "block", prefix: "```bash\n", suffix: "\n```", placeholder: "command" },
  { id: "table", label: "Table", title: "Table", action: "insert", text: "\n| Column | Detail |\n| --- | --- |\n| Item | Value |\n\n" },
  { id: "hr", label: "---", title: "Divider", action: "insert", text: "\n---\n" },
];

const CHEAT_SHEET = [
  ["## Heading", "Section heading"],
  ["**bold**", "Bold text"],
  ["*italic*", "Italic text"],
  ["`code`", "Inline code"],
  ["```bash", "Code block"],
  ["- item", "Bulleted list"],
  ["> quote", "Blockquote"],
  ["| a | b |", "Table row"],
  ["[text](url)", "Link"],
  ["![alt](url)", "Image"],
];

/** The shortcut modifier for this machine — "⌘" on a Mac, "Ctrl+" elsewhere. */
const MOD =
  typeof navigator !== "undefined" && /Mac|iPhone|iPad/i.test(navigator.platform || navigator.userAgent)
    ? "⌘"
    : "Ctrl+";

export default function Editor({ postId }) {
  const isEdit = Boolean(postId);
  const { navigate } = useRouter();
  const { admin, setNotice } = useAdmin();
  const publisher = isAdmin(admin);

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
  const [dirty, setDirty] = useState(false);
  const [restore, setRestore] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteQuery, setPaletteQuery] = useState("");
  const [paletteIndex, setPaletteIndex] = useState(0);
  const [showOutline, setShowOutline] = useState(true);
  const [showCheats, setShowCheats] = useState(false);
  const [slugLocked, setSlugLocked] = useState(false);
  const [dragging, setDragging] = useState(false);

  const textareaRef = useRef(null);
  const coverInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const paletteRef = useRef(null);
  const autosaveKey = `blog.autosave.${postId || "new"}`;

  // ---------- loading ----------

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
          if (post.slug) setSlugLocked(true);
        } else {
          setForm((previous) => ({
            ...previous,
            category_id: categoryData.items?.[0]?.id ?? "",
            author_id: admin?.author_id ?? authorData.items?.[0]?.id ?? "",
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

  // ---------- autosave ----------

  useEffect(() => {
    if (loading || restore) return;
    const timer = window.setTimeout(() => {
      if (!form.title && !form.content) return;
      window.localStorage.setItem(
        autosaveKey,
        JSON.stringify({ form, tags, savedAt: new Date().toISOString() })
      );
      setSaveState(
        `Autosaved ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
      );
      setDirty(false);
    }, 1500);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, tags, loading, restore]);

  const update = (key, value) => {
    setForm((previous) => {
      const next = { ...previous, [key]: value };
      // Keep the slug in step with the title until the writer edits it by hand.
      if (key === "title" && !slugLocked && !isEdit) {
        next.slug = slugifyTitle(value);
      }
      return next;
    });
    setDirty(true);
  };

  // ---------- derived ----------

  const words = useMemo(() => countWords(form.content), [form.content]);
  const minutes = useMemo(() => readingMinutes(words), [words]);
  const outline = useMemo(() => extractOutline(form.content), [form.content]);
  const checks = useMemo(
    () => reviewChecklist({ ...form, tags }),
    [form, tags]
  );
  const readiness = checklistProgress(checks);
  const preview = useMemo(
    () => <Markdown content={form.content || "*Nothing to preview yet.*"} />,
    [form.content]
  );
  const lockedByline = !publisher && admin?.author_id
    ? authors.find((author) => author.id === admin.author_id)
    : null;

  // ---------- toolbar ----------

  const applyToolbar = useCallback(
    (item) => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const value = form.content;
      const selected = value.slice(start, end) || item.placeholder || "";

      let cursorOffset = 0;
      if (item.action === "line") {
        const lineStart = value.lastIndexOf("\n", start - 1) + 1;
        const before = value.slice(0, lineStart);
        const line = value.slice(lineStart);
        setForm((previous) => ({ ...previous, content: `${before}${item.prefix}${line}` }));
        cursorOffset = start + item.prefix.length;
        window.setTimeout(() => {
          textarea.focus();
          textarea.setSelectionRange(cursorOffset, cursorOffset);
        }, 0);
        return;
      }
      if (item.action === "insert") {
        setForm((previous) => ({
          ...previous,
          content: `${value.slice(0, start)}${item.text}${value.slice(end)}`,
        }));
        cursorOffset = start + item.text.length;
      } else {
        const insertion = `${item.prefix}${selected}${item.suffix}`;
        setForm((previous) => ({
          ...previous,
          content: `${value.slice(0, start)}${insertion}${value.slice(end)}`,
        }));
        cursorOffset = start + item.prefix.length + selected.length;
      }
      setDirty(true);
      window.setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(cursorOffset, cursorOffset);
      }, 0);
    },
    [form.content]
  );

  const insertSnippet = useCallback(
    (text) => {
      const textarea = textareaRef.current;
      const value = form.content;
      const position = textarea ? textarea.selectionStart : value.length;
      setForm((previous) => ({
        ...previous,
        content: `${value.slice(0, position)}${text}${value.slice(position)}`,
      }));
      setDirty(true);
      window.setTimeout(() => {
        textarea?.focus();
        textarea?.setSelectionRange(position + text.length, position + text.length);
      }, 0);
    },
    [form.content]
  );

  // ---------- images ----------

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
    insertSnippet(`\n![${file.name.replace(/\.[^.]+$/, "")}](${url})\n`);
  };

  const onDropImage = async (event) => {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer?.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    const url = await uploadImage(file);
    if (url) insertSnippet(`\n![${file.name.replace(/\.[^.]+$/, "")}](${url})\n`);
  };

  const onPaste = async (event) => {
    const items = Array.from(event.clipboardData?.items || []);
    const imageItem = items.find((item) => item.type?.startsWith("image/"));
    if (!imageItem) return;
    const file = imageItem.getAsFile();
    if (!file) return;
    event.preventDefault();
    const url = await uploadImage(file);
    if (url) insertSnippet(`\n![${file.name.replace(/\.[^.]+$/, "")}](${url})\n`);
  };

  // ---------- saving ----------

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
      tags,
    };

    if (publisher) {
      payload.status = status;
      payload.is_featured = form.is_featured;
      payload.published_at = form.published_at
        ? new Date(form.published_at).toISOString()
        : null;
    } else {
      payload.status = "draft";
    }

    setSaving(true);
    try {
      const result = isEdit
        ? await api(`/admin/posts/${postId}`, { method: "PUT", body: payload })
        : await api("/admin/posts", { method: "POST", body: payload });
      window.localStorage.removeItem(autosaveKey);
      setSaveState("");
      setDirty(false);
      setNotice(
        status === "published"
          ? "Article published."
          : status === "scheduled"
            ? "Article scheduled."
            : publisher
              ? "Draft saved."
              : "Saved. An administrator will review it before it goes live."
      );
      if (!isEdit) navigate(`/admin/blog/edit/${result.post.id}`);
      else {
        setForm((previous) => ({
          ...previous,
          status: result.post.status,
          published_at: toLocalInput(result.post.published_at),
          slug: result.post.slug,
          author_id: result.post.author_id ?? previous.author_id,
        }));
      }
    } catch (saveError) {
      setError(submissionErrorMessage(saveError));
    } finally {
      setSaving(false);
    }
  };

  const runAction = async (action) => {
    setSaving(true);
    setError("");
    try {
      await api(`/admin/posts/${postId}/${action}`, { method: "POST", body: {} });
      setNotice(
        action === "publish"
          ? "Article published."
          : action === "unpublish"
            ? "Article moved back to draft."
            : action === "feature"
              ? "Article featured on the homepage."
              : "Feature removed."
      );
      const fresh = await api(`/admin/posts/${postId}`);
      setForm((previous) => ({
        ...previous,
        status: fresh.post.status,
        is_featured: Boolean(fresh.post.is_featured),
        published_at: toLocalInput(fresh.post.published_at),
      }));
    } catch (actionError) {
      setError(submissionErrorMessage(actionError));
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

  // ---------- tags ----------

  const addTag = (value) => {
    const next = value.trim().replace(/^#/, "");
    if (!next || tags.includes(next) || tags.length >= 8) return;
    setTags((previous) => [...previous, next]);
    setTagInput("");
    setDirty(true);
  };

  // ---------- command palette ----------

  // The command list is rebuilt on every render so that every entry runs
  // against the current form. Memoising it would freeze the closures over
  // `form`, and "Save draft" would quietly save whatever was typed a few
  // seconds ago.
  const commands = [
    { id: "save", label: "Save draft", hint: `${MOD}S`, run: () => save(form.status) },
    { id: "preview", label: "Toggle preview", hint: `${MOD}P`, run: () => setTab(tab === "preview" ? "write" : "preview") },
    { id: "focus", label: "Toggle focus mode", hint: `${MOD}Shift+F`, run: () => setFocusMode((value) => !value) },
    { id: "outline", label: "Toggle outline", run: () => setShowOutline((value) => !value) },
    { id: "cheats", label: "Markdown cheat sheet", run: () => setShowCheats((value) => !value) },
    { id: "image", label: "Insert image", run: () => imageInputRef.current?.click() },
    { id: "cover", label: "Upload cover image", run: () => coverInputRef.current?.click() },
  ];
  if (publisher) {
    if (isEdit) {
      commands.push(
        {
          id: "publish",
          label: form.status === "published" ? "Unpublish" : "Publish now",
          run: () => runAction(form.status === "published" ? "unpublish" : "publish"),
        },
        {
          id: "feature",
          label: form.is_featured ? "Remove from featured" : "Feature on homepage",
          run: () => runAction(form.is_featured ? "unfeature" : "feature"),
        }
      );
    }
    commands.push({
      id: "schedule",
      label: "Schedule publication",
      run: () => setForm((previous) => ({ ...previous, status: "scheduled" })),
    });
  } else {
    commands.push({ id: "submit", label: "Submit for review", run: () => save("draft") });
  }
  TOOLBAR.forEach((item) => {
    commands.push({
      id: `format-${item.id}`,
      label: `Insert: ${item.title}`,
      run: () => applyToolbar(item),
    });
  });
  if (isEdit && canDelete(admin)) {
    commands.push({ id: "delete", label: "Delete article", run: () => remove() });
  }

  const query = paletteQuery.trim().toLowerCase();
  const filteredCommands = query
    ? commands.filter((command) => command.label.toLowerCase().includes(query)).slice(0, 40)
    : commands.slice(0, 40);

  // The highlighted entry follows the query, and the arrow keys move it.
  useEffect(() => {
    setPaletteIndex(0);
  }, [paletteQuery]);

  const runCommand = (command) => {
    setPaletteOpen(false);
    setPaletteQuery("");
    command.run();
  };

  const movePalette = (delta) => {
    if (!filteredCommands.length) return;
    setPaletteIndex((current) => {
      const next = current + delta;
      if (next < 0) return filteredCommands.length - 1;
      if (next >= filteredCommands.length) return 0;
      return next;
    });
  };

  // ---------- keyboard ----------

  useEffect(() => {
    const onKeyDown = (event) => {
      const meta = event.metaKey || event.ctrlKey;

      if (meta && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen((value) => !value);
        return;
      }
      if (meta && event.key.toLowerCase() === "s") {
        event.preventDefault();
        save(form.status);
        return;
      }
      if (meta && event.key.toLowerCase() === "p") {
        event.preventDefault();
        setTab((value) => (value === "preview" ? "write" : "preview"));
        return;
      }
      if (meta && event.shiftKey && event.key.toLowerCase() === "f") {
        event.preventDefault();
        setFocusMode((value) => !value);
        return;
      }
      if (!paletteOpen && meta && event.key.toLowerCase() === "b") {
        event.preventDefault();
        applyToolbar(TOOLBAR.find((item) => item.id === "bold"));
        return;
      }
      if (!paletteOpen && meta && event.key.toLowerCase() === "i") {
        event.preventDefault();
        applyToolbar(TOOLBAR.find((item) => item.id === "italic"));
        return;
      }
      if (event.key === "Escape" && paletteOpen) {
        setPaletteOpen(false);
        setPaletteQuery("");
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.status, paletteOpen]);

  useEffect(() => {
    if (!paletteOpen) return;
    const timer = window.setTimeout(() => paletteRef.current?.focus(), 30);
    return () => window.clearTimeout(timer);
  }, [paletteOpen]);

  // ---------- render ----------

  if (loading) {
    return (
      <div className="admin-panel" style={{ padding: "2rem" }}>
        <p className="blog-dim">Loading editor…</p>
      </div>
    );
  }

  if (loadError) {
    return <ErrorState error={loadError} title="Editor could not load" />;
  }

  const statusTone =
    form.status === "published"
      ? "published"
      : form.status === "scheduled"
        ? "scheduled"
        : "draft";

  return (
    <div className={`admin-editor-shell${focusMode ? " focus" : ""}`}>
      <div className="admin-topbar admin-editor-topbar">
        <div className="admin-editor-heading">
          <button
            type="button"
            className="blog-btn blog-btn-sm"
            onClick={() => navigate("/admin/blog/posts")}
            aria-label="Back to articles"
          >
            <ArrowLeft size={14} />
          </button>
          <div>
            <h1>
              {isEdit ? "Edit article" : "New article"}
              <span className={`admin-badge ${statusTone}`} style={{ marginLeft: "0.6rem", verticalAlign: "middle" }}>
                {form.status}
              </span>
            </h1>
            <p>
              {isEdit ? `Post #${postId}` : "Draft a new article"}
              {saveState && <> · <span className="admin-save-state saved">{saveState}</span></>}
              {dirty && !saveState && <> · <span className="admin-save-state">Unsaved changes</span></>}
            </p>
          </div>
        </div>

        <div className="admin-actions">
          <button
            type="button"
            className="blog-btn blog-btn-sm"
            onClick={() => setPaletteOpen(true)}
            title="Command palette"
          >
            {MOD}K
          </button>
          <button
            type="button"
            className="blog-btn blog-btn-sm"
            onClick={() => setFocusMode((value) => !value)}
            title="Focus mode (Ctrl+Shift+F)"
          >
            {focusMode ? "Exit focus" : "Focus"}
          </button>
          <button type="button" className="blog-btn blog-btn-sm" disabled={saving} onClick={() => save(form.status)}>
            {saving ? "Saving…" : "Save"}
          </button>
          {publisher ? (
            form.status === "published" ? (
              <button type="button" className="blog-btn blog-btn-sm" disabled={saving} onClick={() => runAction("unpublish")}>
                Unpublish
              </button>
            ) : (
              <button
                type="button"
                className="blog-btn blog-btn-primary blog-btn-sm"
                disabled={saving}
                onClick={() => save("published")}
              >
                <CheckIcon size={14} /> Publish
              </button>
            )
          ) : (
            <button
              type="button"
              className="blog-btn blog-btn-primary blog-btn-sm"
              disabled={saving}
              onClick={() => save("draft")}
            >
              <CheckIcon size={14} /> Submit for review
            </button>
          )}
        </div>
      </div>

      {!publisher && (
        <div className="admin-review-banner" role="note">
          You are writing as a contributor. Everything you save stays a draft until an administrator
          publishes it.
        </div>
      )}

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
          <div className="admin-panel admin-panel-flush">
            <label className="blog-field blog-field-title">
              <span>Title</span>
              <input
                className="admin-title-input"
                value={form.title}
                onChange={(event) => update("title", event.target.value)}
                placeholder="A specific, useful title"
                maxLength={120}
              />
              <em className="admin-counter">{form.title.length}/120</em>
            </label>

            <div className="blog-field">
              <span>Slug</span>
              <div className="admin-inline-form">
                <input
                  className="blog-input"
                  value={form.slug}
                  onChange={(event) => {
                    setSlugLocked(true);
                    update("slug", event.target.value);
                  }}
                  placeholder="auto-generated-from-title"
                />
                <button
                  type="button"
                  className="blog-btn blog-btn-sm"
                  onClick={() => {
                    setSlugLocked((value) => !value);
                    if (slugLocked) setForm((previous) => ({ ...previous, slug: slugifyTitle(previous.title) }));
                  }}
                  title={slugLocked ? "Follow the title again" : "Stop changing the slug automatically"}
                >
                  {slugLocked ? "Locked" : "Auto"}
                </button>
              </div>
            </div>

            <label className="blog-field">
              <span>Excerpt</span>
              <textarea
                className="blog-textarea"
                rows={2}
                value={form.excerpt}
                onChange={(event) => update("excerpt", event.target.value)}
                placeholder="One or two sentences shown on cards and in search results."
                maxLength={320}
              />
              <em className="admin-counter">{form.excerpt.length}/320</em>
            </label>
          </div>

          {showOutline && outline.length > 0 && (
            <div className="admin-panel admin-outline" style={{ marginTop: 0, padding: "0.75rem 1rem" }}>
              <div className="admin-outline-head">
                <span>Outline</span>
                <button type="button" className="blog-btn blog-btn-sm" onClick={() => setShowOutline(false)} aria-label="Hide outline">
                  <CloseIcon size={12} />
                </button>
              </div>
              <ol className="admin-outline-list">
                {outline.map((heading) => (
                  <li key={`${heading.offset}-${heading.text}`} style={{ paddingLeft: `${(heading.level - 1) * 0.85}rem` }}>
                    <button
                      type="button"
                      onClick={() => {
                        const textarea = textareaRef.current;
                        if (!textarea) return;
                        textarea.focus();
                        textarea.setSelectionRange(heading.offset, heading.offset);
                        textarea.scrollTop = Math.max(0, heading.offset * 0.32);
                      }}
                    >
                      {heading.text}
                    </button>
                  </li>
                ))}
              </ol>
            </div>
          )}

          <div className="admin-panel" style={{ marginTop: 0, padding: "0.9rem" }}>
            <div className="admin-tabs">
              <button type="button" className={tab === "write" ? "active" : ""} onClick={() => setTab("write")}>Write</button>
              <button type="button" className={tab === "preview" ? "active" : ""} onClick={() => setTab("preview")}>Preview</button>
              <button type="button" className={tab === "split" ? "active" : ""} onClick={() => setTab("split")}>Split</button>
              <span className="admin-tabs-spacer" />
              <span className="admin-live-count">
                {words.toLocaleString()} words · {minutes} min read
              </span>
            </div>

            <div className="admin-toolbar" role="toolbar" aria-label="Formatting">
              {TOOLBAR.map((item) => (
                <button key={item.id} type="button" title={item.title} onClick={() => applyToolbar(item)}>
                  {item.label}
                </button>
              ))}
              <span className="divider" />
              <button type="button" title="Upload image" onClick={() => imageInputRef.current?.click()} disabled={uploading}>
                {uploading ? "…" : "Image"}
              </button>
              <input
                ref={imageInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                hidden
                onChange={onInlineImageSelected}
              />
            </div>

            <div
              className="admin-editor-surface"
              style={tab === "split" ? { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.9rem" } : undefined}
              onDragOver={(event) => {
                event.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDropImage}
            >
              {(tab === "write" || tab === "split") && (
                <textarea
                  ref={textareaRef}
                  className="blog-textarea admin-editor-textarea"
                  style={tab === "split" ? { minHeight: 480 } : undefined}
                  value={form.content}
                  onChange={(event) => update("content", event.target.value)}
                  onPaste={onPaste}
                  placeholder={"## Start with a heading\n\nWrite the article in Markdown. Use the toolbar for formatting, code blocks, and images. Drop or paste an image to insert it."}
                  spellCheck="true"
                />
              )}
              {(tab === "preview" || tab === "split") && (
                <div className="admin-preview" style={tab === "split" ? { minHeight: 480 } : undefined}>
                  {preview}
                </div>
              )}
              {dragging && (
                <div className="admin-drop-hint">Drop an image to insert it</div>
              )}
            </div>

            <div className="admin-editor-foot">
              <p className="admin-note">
                Markdown is stored raw and rendered with an HTML-escaping renderer. Raw HTML is shown as
                text, not executed.
              </p>
              <button
                type="button"
                className="admin-note admin-note-button"
                onClick={() => setShowCheats((value) => !value)}
              >
                {showCheats ? "Hide" : "Show"} Markdown cheat sheet
              </button>
            </div>

            {showCheats && (
              <div className="admin-cheats">
                {CHEAT_SHEET.map(([syntax, meaning]) => (
                  <button
                    key={syntax}
                    type="button"
                    className="admin-cheat"
                    onClick={() => insertSnippet(syntax)}
                    title={`Insert ${syntax}`}
                  >
                    <code>{syntax}</code>
                    <span>{meaning}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="admin-editor-side">
          <div className="admin-panel" style={{ marginTop: 0, padding: "1rem" }}>
            <h2 className="admin-side-title">Publishing</h2>

            {publisher ? (
              <>
                <div className="blog-field">
                  <span>Status</span>
                  <select
                    className="blog-select"
                    value={form.status}
                    onChange={(event) => update("status", event.target.value)}
                  >
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
                  <button
                    type="button"
                    className="blog-btn blog-btn-sm"
                    style={{ marginTop: "0.8rem", width: "100%" }}
                    disabled={saving}
                    onClick={() => save("scheduled")}
                  >
                    Schedule publication
                  </button>
                )}
                {isEdit && (
                  <button
                    type="button"
                    className="blog-btn blog-btn-danger blog-btn-sm"
                    style={{ marginTop: "0.8rem", width: "100%" }}
                    disabled={saving}
                    onClick={remove}
                  >
                    <TrashIcon size={13} /> Delete article
                  </button>
                )}
              </>
            ) : (
              <>
                <div className="admin-locked-note">
                  <strong>Draft</strong>
                  <span>Your work is reviewed before it goes live.</span>
                </div>
                {isEdit && (
                  <button
                    type="button"
                    className="blog-btn blog-btn-sm"
                    style={{ marginTop: "0.8rem", width: "100%" }}
                    disabled={saving}
                    onClick={() => save("draft")}
                  >
                    Save and send for review
                  </button>
                )}
              </>
            )}
          </div>

          <div className="admin-panel" style={{ marginTop: 0, padding: "1rem" }}>
            <h2 className="admin-side-title">Before it goes live</h2>
            <div className="admin-readiness">
              <div className="admin-readiness-bar">
                <span style={{ width: `${readiness}%` }} />
              </div>
              <em>{readiness}% ready</em>
            </div>
            <ul className="admin-checklist">
              {checks.map((check) => (
                <li key={check.key} className={check.done ? "done" : ""}>
                  <span className="admin-check-mark" aria-hidden="true">{check.done ? "✓" : "•"}</span>
                  <span>
                    <strong>{check.label}</strong>
                    {!check.done && <em>{check.hint}</em>}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="admin-panel" style={{ marginTop: 0, padding: "1rem" }}>
            <h2 className="admin-side-title">Cover image</h2>
            {form.cover_image ? (
              <img className="admin-cover-preview" src={assetUrl(form.cover_image)} alt="Cover preview" />
            ) : (
              <div
                className="admin-cover-preview admin-cover-empty"
                onDragOver={(event) => event.preventDefault()}
                onDrop={onDropImage}
              >
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
              <input
                ref={coverInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                hidden
                onChange={onCoverSelected}
              />
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
            <h2 className="admin-side-title">Organisation</h2>
            <div className="blog-field">
              <span>Category</span>
              <select
                className="blog-select"
                value={form.category_id}
                onChange={(event) => update("category_id", event.target.value)}
              >
                <option value="">Uncategorised</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </select>
            </div>

            <div className="blog-field" style={{ marginTop: "0.8rem" }}>
              <span>Author</span>
              {publisher ? (
                <select
                  className="blog-select"
                  value={form.author_id}
                  onChange={(event) => update("author_id", event.target.value)}
                >
                  <option value="">No author</option>
                  {authors.map((author) => (
                    <option key={author.id} value={author.id}>{author.name}</option>
                  ))}
                </select>
              ) : (
                <div className="admin-locked-note">
                  <strong>{lockedByline?.name || "No byline linked"}</strong>
                  <span>
                    {lockedByline
                      ? "Articles are published under this byline."
                      : "Ask an administrator to link a byline to your account."}
                  </span>
                </div>
              )}
            </div>

            <div className="blog-field" style={{ marginTop: "0.8rem" }}>
              <span>Tags (max 8)</span>
              <div className="admin-chips" style={{ marginBottom: "0.4rem" }}>
                {tags.map((tag) => (
                  <span className="admin-chip" key={tag}>
                    {tag}
                    <button type="button" onClick={() => setTags((previous) => previous.filter((value) => value !== tag))} aria-label={`Remove ${tag}`}>
                      ×
                    </button>
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
                <div className="admin-tag-suggestions">
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
            <h2 className="admin-side-title">Search preview</h2>
            <div className="admin-serp">
              <span className="admin-serp-url">sathish.blog/blog/{form.slug || "your-slug"}</span>
              <span className="admin-serp-title">
                {form.meta_title || form.title || "Your article title"}
              </span>
              <span className="admin-serp-desc">
                {form.meta_description || form.excerpt || "A short description of the article shows here."}
              </span>
            </div>
            <div className="blog-field" style={{ marginTop: "0.8rem" }}>
              <span>Meta title</span>
              <input
                className="blog-input"
                value={form.meta_title}
                onChange={(event) => update("meta_title", event.target.value)}
                maxLength={160}
                placeholder={form.title || "Defaults to the title"}
              />
              <em className="admin-counter">{form.meta_title.length}/160</em>
            </div>
            <div className="blog-field" style={{ marginTop: "0.8rem" }}>
              <span>Meta description</span>
              <textarea
                className="blog-textarea"
                rows={3}
                value={form.meta_description}
                onChange={(event) => update("meta_description", event.target.value)}
                maxLength={320}
                placeholder={form.excerpt || "Defaults to the excerpt"}
              />
              <em className="admin-counter">{form.meta_description.length}/320</em>
            </div>
          </div>

          <div className="admin-panel" style={{ marginTop: 0, padding: "1rem" }}>
            <h2 className="admin-side-title">This article</h2>
            <div className="admin-mini-stats">
              <div>
                <EyeIcon size={13} />
                <span>{words.toLocaleString()} words</span>
              </div>
              <div>
                <ClockIcon size={13} />
                <span>{minutes} min read</span>
              </div>
              <div>
                <PlusIcon size={13} />
                <span>{outline.length} headings</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {paletteOpen && (
        <div
          className="admin-palette-backdrop"
          onClick={() => setPaletteOpen(false)}
          role="presentation"
        >
          <div
            className="admin-palette"
            role="dialog"
            aria-modal="true"
            aria-label="Command palette"
            onClick={(event) => event.stopPropagation()}
          >
            <input
              ref={paletteRef}
              className="admin-palette-input"
              value={paletteQuery}
              onChange={(event) => setPaletteQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && filteredCommands.length) {
                  event.preventDefault();
                  runCommand(filteredCommands[paletteIndex] || filteredCommands[0]);
                  return;
                }
                if (event.key === "ArrowDown") {
                  event.preventDefault();
                  movePalette(1);
                  return;
                }
                if (event.key === "ArrowUp") {
                  event.preventDefault();
                  movePalette(-1);
                }
              }}
              placeholder="Type a command…"
              aria-label="Search commands"
            />
            <ul className="admin-palette-list">
              {filteredCommands.map((command, index) => (
                <li key={command.id}>
                  <button
                    type="button"
                    className={index === paletteIndex ? "active" : ""}
                    onMouseEnter={() => setPaletteIndex(index)}
                    onClick={() => runCommand(command)}
                  >
                    <span>{command.label}</span>
                    {command.hint && <em>{command.hint}</em>}
                  </button>
                </li>
              ))}
              {!filteredCommands.length && (
                <li className="admin-palette-empty">No command matches “{paletteQuery}”.</li>
              )}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
