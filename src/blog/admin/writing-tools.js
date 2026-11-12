/**
 * Small helpers for the writing surface.
 *
 * These run on every keystroke, so they are deliberately simple and avoid
 * regular expressions that backtrack.
 */

/**
 * Pulls the heading outline out of a Markdown document.
 *
 * Returns the headings with their character offset in the source, so the
 * outline can scroll the textarea to the right place. Fenced code blocks
 * are ignored — a shell comment is not a heading.
 */
export function extractOutline(markdown) {
  const text = String(markdown || "");
  const headings = [];
  let offset = 0;
  let inFence = false;

  for (const line of text.split("\n")) {
    if (/^\s*```/.test(line)) {
      inFence = !inFence;
      offset += line.length + 1;
      continue;
    }
    const match = inFence ? null : /^(#{1,4})\s+(.+?)\s*#*\s*$/.exec(line);
    if (match) {
      headings.push({
        level: match[1].length,
        text: match[2].trim(),
        offset,
      });
    }
    offset += line.length + 1;
  }

  return headings;
}

/**
 * Word count.
 *
 * Code is counted too — a reader still has to read it — but inline code
 * markers are not words themselves.
 */
export function countWords(markdown) {
  const text = String(markdown || "");
  if (!text.trim()) return 0;
  const withoutInline = text.replace(/`[^`]*`/g, (run) => run.replace(/`/g, " "));
  const words = withoutInline.match(/[A-Za-z0-9][A-Za-z0-9'’-]*/g);
  return words ? words.length : 0;
}

/** Minutes to read, at 220 words per minute. */
export function readingMinutes(words) {
  return Math.max(1, Math.round((Number(words) || 0) / 220));
}

/** Turns a title into a URL slug. */
export function slugifyTitle(title) {
  return String(title || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/**
 * A publication-ready check for an article.
 *
 * The same list drives the checklist in the editor and the review hints in
 * the dashboard, so they never disagree.
 */
export function reviewChecklist(post) {
  const content = String(post?.content || "");
  const words = countWords(content);
  const outline = extractOutline(content);
  const excerpt = String(post?.excerpt || "").trim();
  const title = String(post?.title || "").trim();

  return [
    {
      key: "title",
      label: "A clear title",
      done: title.length >= 15 && title.length <= 90,
      hint: "Aim for 15–90 characters so it survives a search result.",
    },
    {
      key: "excerpt",
      label: "A summary for cards and search",
      done: excerpt.length >= 40,
      hint: "One or two sentences, at least 40 characters.",
    },
    {
      key: "depth",
      label: "At least 600 words",
      done: words >= 600,
      hint: `Currently ${words.toLocaleString()} words.`,
    },
    {
      key: "structure",
      label: "Section headings",
      done: outline.length >= 2,
      hint: outline.length ? `${outline.length} heading${outline.length === 1 ? "" : "s"} found.` : "Break the article into sections.",
    },
    {
      key: "category",
      label: "A category",
      done: Boolean(post?.category_id),
      hint: "Helps readers browse the archive.",
    },
    {
      key: "cover",
      label: "A cover image",
      done: Boolean(post?.cover_image),
      hint: "Articles with a cover get more reads.",
    },
    {
      key: "tags",
      label: "Two or three tags",
      done: Array.isArray(post?.tags) && post.tags.length >= 2,
      hint: "Tags feed the topic index.",
    },
  ];
}

/** The share of the checklist that is done, as a percentage. */
export function checklistProgress(checks) {
  if (!checks?.length) return 0;
  const done = checks.filter((check) => check.done).length;
  return Math.round((done / checks.length) * 100);
}
