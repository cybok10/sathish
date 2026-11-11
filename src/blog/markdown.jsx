import { useMemo, useRef, useState } from "react";
import { assetUrl } from "./base";
import { slugifyHeading } from "./router";

/* ------------------------------------------------------------------ */
/* Headings / table of contents                                        */
/* ------------------------------------------------------------------ */

export function extractHeadings(markdown) {
  const headings = [];
  const seen = new Map();
  let inFence = false;
  for (const line of String(markdown || "").split("\n")) {
    if (/^```/.test(line.trim())) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const match = line.match(/^(#{2,4})\s+(.+)$/);
    if (!match) continue;
    const text = stripInline(match[2]);
    const id = uniqueHeadingId(text, seen);
    headings.push({ level: match[1].length, text, id });
  }
  return headings;
}

function stripInline(text) {
  return String(text || "")
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[*_`~]/g, "")
    .trim();
}

function uniqueHeadingId(text, seen) {
  const base = slugifyHeading(text) || "section";
  const count = seen.get(base) || 0;
  seen.set(base, count + 1);
  return count === 0 ? base : `${base}-${count + 1}`;
}

/* ------------------------------------------------------------------ */
/* Block parser                                                        */
/* ------------------------------------------------------------------ */

function splitRow(line) {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

function isBlockStart(line) {
  return (
    /^```/.test(line) ||
    /^#{1,4}\s+/.test(line) ||
    /^>\s?/.test(line) ||
    /^\s*[-*+]\s+/.test(line) ||
    /^\s*\d+[.)]\s+/.test(line) ||
    /^\s*(---|\*\*\*|___)\s*$/.test(line) ||
    /^!\[[^\]]*\]\([^)]*\)\s*$/.test(line.trim())
  );
}

export function parseBlocks(source) {
  const lines = String(source || "").replace(/\r\n?/g, "\n").split("\n");
  const blocks = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i += 1;
      continue;
    }

    const fence = line.match(/^```(\w+)?\s*$/);
    if (fence) {
      const lang = (fence[1] || "text").toLowerCase();
      const code = [];
      i += 1;
      while (i < lines.length && !/^```\s*$/.test(lines[i])) {
        code.push(lines[i]);
        i += 1;
      }
      i += 1;
      blocks.push({ type: "code", lang, code: code.join("\n") });
      continue;
    }

    const heading = line.match(/^(#{1,4})\s+(.*)$/);
    if (heading) {
      blocks.push({ type: "heading", level: heading[1].length, text: heading[2].trim() });
      i += 1;
      continue;
    }

    if (/^\s*(---|\*\*\*|___)\s*$/.test(line)) {
      blocks.push({ type: "hr" });
      i += 1;
      continue;
    }

    const image = line.trim().match(/^!\[([^\]]*)\]\((\S+?)(?:\s+"([^"]*)")?\)$/);
    if (image) {
      blocks.push({ type: "image", alt: image[1], src: image[2], caption: image[3] || "" });
      i += 1;
      continue;
    }

    if (
      line.includes("|") &&
      i + 1 < lines.length &&
      /^\s*\|?[\s:-]+(?:\|[\s:-]+)+\|?\s*$/.test(lines[i + 1])
    ) {
      const header = splitRow(line);
      const rows = [];
      i += 2;
      while (i < lines.length && lines[i].includes("|") && lines[i].trim()) {
        rows.push(splitRow(lines[i]));
        i += 1;
      }
      blocks.push({ type: "table", header, rows });
      continue;
    }

    if (/^>\s?/.test(line)) {
      const quote = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        quote.push(lines[i].replace(/^>\s?/, ""));
        i += 1;
      }
      blocks.push({ type: "quote", text: quote.join("\n") });
      continue;
    }

    if (/^\s*[-*+]\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*+]\s+/, ""));
        i += 1;
      }
      blocks.push({ type: "ul", items });
      continue;
    }

    if (/^\s*\d+[.)]\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+[.)]\s+/, ""));
        i += 1;
      }
      blocks.push({ type: "ol", items });
      continue;
    }

    const paragraph = [];
    while (i < lines.length && lines[i].trim() && !isBlockStart(lines[i])) {
      paragraph.push(lines[i]);
      i += 1;
    }
    if (!paragraph.length) {
      paragraph.push(lines[i] || "");
      i += 1;
    }
    blocks.push({ type: "p", text: paragraph.join("\n") });
  }

  return blocks;
}

/* ------------------------------------------------------------------ */
/* Inline renderer (never uses dangerouslySetInnerHTML)                */
/* ------------------------------------------------------------------ */

const INLINE_SOURCE =
  "`([^`]+)`|\\*\\*([^*]+)\\*\\*|__([^_]+)__|\\*([^*\\n]+)\\*|_([^_\\n]+)_|~~([^~]+)~~|!\\[([^\\]]*)\\]\\((\\S+?)(?:\\s+\"([^\"]*)\")?\\)|\\[([^\\]]+)\\]\\((\\S+?)(?:\\s+\"([^\"]*)\")?\\)|(https?:\\/\\/[^\\s<]+)";

function safeHref(href) {
  const value = String(href || "").trim();
  if (/^(https?:|mailto:)/i.test(value)) return value;
  if (value.startsWith("/") || value.startsWith("#")) return value;
  return null;
}

function renderText(text, key) {
  const parts = String(text).split("\n");
  return parts.flatMap((part, index) => {
    const nodes = [];
    if (index > 0) nodes.push(<br key={`${key}-br-${index}`} />);
    if (part) nodes.push(part);
    return nodes;
  });
}

export function renderInline(text, keyPrefix = "i") {
  const source = String(text || "");
  const nodes = [];
  const pattern = new RegExp(INLINE_SOURCE, "g");
  let lastIndex = 0;
  let match;
  let index = 0;

  while ((match = pattern.exec(source)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(...renderText(source.slice(lastIndex, match.index), `${keyPrefix}-t-${index}`));
      index += 1;
    }
    const key = `${keyPrefix}-${index}`;
    index += 1;

    if (match[1] !== undefined) {
      nodes.push(<code key={key} className="blog-inline-code">{match[1]}</code>);
    } else if (match[2] !== undefined || match[3] !== undefined) {
      const content = match[2] ?? match[3];
      nodes.push(<strong key={key}>{renderInline(content, `${key}-b`)}</strong>);
    } else if (match[4] !== undefined || match[5] !== undefined) {
      const content = match[4] ?? match[5];
      nodes.push(<em key={key}>{renderInline(content, `${key}-i`)}</em>);
    } else if (match[6] !== undefined) {
      nodes.push(<del key={key}>{renderInline(match[6], `${key}-d`)}</del>);
    } else if (match[7] !== undefined) {
      const href = safeHref(match[8]);
      const src = href ? assetUrl(href) : null;
      nodes.push(
        src ? (
          <img
            key={key}
            src={src}
            alt={match[7]}
            title={match[9] || undefined}
            loading="lazy"
            className="blog-inline-image"
          />
        ) : (
          match[7]
        )
      );
    } else if (match[10] !== undefined) {
      const href = safeHref(match[11]);
      if (!href) {
        nodes.push(...renderText(match[10], `${key}-plain`));
      } else {
        const external = /^https?:/i.test(href);
        nodes.push(
          <a
            key={key}
            href={assetUrl(href)}
            title={match[12] || undefined}
            {...(external ? { target: "_blank", rel: "noopener noreferrer nofollow" } : {})}
          >
            {renderInline(match[10], `${key}-l`)}
          </a>
        );
      }
    } else if (match[13] !== undefined) {
      nodes.push(
        <a key={key} href={match[13]} target="_blank" rel="noopener noreferrer nofollow">
          {match[13]}
        </a>
      );
    }
    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < source.length) {
    nodes.push(...renderText(source.slice(lastIndex), `${keyPrefix}-tail`));
  }
  return nodes;
}

/* ------------------------------------------------------------------ */
/* Lightweight syntax highlighting                                     */
/* ------------------------------------------------------------------ */

const KEYWORDS = {
  js: "const let var function return if else for while class import export from await async new try catch finally throw typeof instanceof of in this super yield switch case break continue default null true false undefined",
  ts: "const let var function return if else for while class import export from await async new try catch finally throw typeof instanceof of in this super yield switch case break continue default null true false undefined interface type enum implements public private readonly",
  jsx: "const let var function return if else for while class import export from await async new try catch finally throw typeof instanceof of in this super yield switch case break continue default null true false undefined",
  python: "def class return if elif else for while import from as with try except finally raise in not and or is pass lambda yield global nonlocal assert del None True False self",
  py: "def class return if elif else for while import from as with try except finally raise in not and or is pass lambda yield global nonlocal assert del None True False self",
  bash: "if then else elif fi for while do done case esac function return export local echo cd curl sudo nmap grep awk sed cat chmod chown mkdir rm cp mv set unset read source",
  sh: "if then else elif fi for while do done case esac function return export local echo cd curl sudo grep awk sed cat chmod mkdir rm cp mv set unset",
  powershell: "if else elseif foreach for while function return param begin end process Get-ADUser Set-ADUser New-Item Remove-Item Select-Object Where-Object Import-Module",
  ps1: "if else elseif foreach for while function return param begin end process Get-ADUser Set-ADUser New-Item Remove-Item Select-Object Where-Object Import-Module",
  sql: "select from where and or insert into values update set delete join left right inner outer on group by order limit offset as create table index alter drop primary key foreign references not null default",
  http: "GET POST PUT PATCH DELETE HTTP HTTPS Content-Type Authorization Cookie Set-Cookie",
  xml: "",
  html: "",
  json: "true false null",
  yaml: "true false null",
  yml: "true false null",
  text: "",
};

const HASH_COMMENT = new Set(["python", "py", "bash", "sh", "shell", "yaml", "yml", "ruby", "r", "toml", "ini", "conf", "dockerfile"]);
const SLASH_COMMENT = new Set(["js", "ts", "jsx", "tsx", "java", "c", "cpp", "csharp", "go", "rust", "php", "swift", "kotlin"]);
const MARKUP_COMMENT = new Set(["xml", "html", "svg"]);

function highlightTokens(code, lang) {
  const keywords = (KEYWORDS[lang] || "").split(" ").filter(Boolean);
  if (!keywords.length && !HASH_COMMENT.has(lang) && !SLASH_COMMENT.has(lang) && !MARKUP_COMMENT.has(lang)) {
    return [{ type: "text", value: code }];
  }

  const commentParts = [];
  if (HASH_COMMENT.has(lang)) commentParts.push("#[^\\n]*");
  if (SLASH_COMMENT.has(lang)) commentParts.push("\\/\\/[^\\n]*", "\\/\\*[\\s\\S]*?\\*\\/");
  if (MARKUP_COMMENT.has(lang)) commentParts.push("<!--[\\s\\S]*?-->");
  if (lang === "sql" || lang === "lua") commentParts.push("--[^\\n]*");

  const keywordPattern = keywords.length
    ? `\\b(?:${keywords.map((word) => word.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")).join("|")})\\b`
    : "(?!x)x";
  const pattern = new RegExp(
    `(${commentParts.join("|") || "(?!x)x"})|("(?:\\\\.|[^"\\\\])*"|'(?:\\\\.|[^'\\\\])*'|\`(?:\\\\.|[^\`\\\\])*\`)|(${keywordPattern})|(\\b\\d+(?:\\.\\d+)?\\b)`,
    "g"
  );

  const tokens = [];
  let last = 0;
  let match;
  while ((match = pattern.exec(code)) !== null) {
    if (match.index > last) tokens.push({ type: "text", value: code.slice(last, match.index) });
    if (match[1] !== undefined) tokens.push({ type: "comment", value: match[1] });
    else if (match[2] !== undefined) tokens.push({ type: "string", value: match[2] });
    else if (match[3] !== undefined) tokens.push({ type: "keyword", value: match[3] });
    else if (match[4] !== undefined) tokens.push({ type: "number", value: match[4] });
    last = pattern.lastIndex;
  }
  if (last < code.length) tokens.push({ type: "text", value: code.slice(last) });
  return tokens;
}

const LANG_LABELS = {
  js: "JavaScript",
  ts: "TypeScript",
  jsx: "JSX",
  tsx: "TSX",
  py: "Python",
  python: "Python",
  sh: "Shell",
  bash: "Bash",
  powershell: "PowerShell",
  ps1: "PowerShell",
  sql: "SQL",
  http: "HTTP",
  xml: "XML",
  html: "HTML",
  json: "JSON",
  yaml: "YAML",
  yml: "YAML",
  text: "Text",
};

function CodeBlock({ code, lang }) {
  const [copied, setCopied] = useState(false);
  const tokens = useMemo(() => highlightTokens(code, lang), [code, lang]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      const area = document.createElement("textarea");
      area.value = code;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      document.body.removeChild(area);
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="blog-code">
      <div className="blog-code-bar">
        <span>{LANG_LABELS[lang] || lang || "Code"}</span>
        <button type="button" onClick={copy} aria-label="Copy code">
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre>
        <code>
          {tokens.map((token, index) =>
            token.type === "text" ? (
              token.value
            ) : (
              <span key={index} className={`tok-${token.type}`}>
                {token.value}
              </span>
            )
          )}
        </code>
      </pre>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Block renderer                                                      */
/* ------------------------------------------------------------------ */

function renderBlock(block, key, seen) {
  switch (block.type) {
    case "heading": {
      const id = uniqueHeadingId(stripInline(block.text), seen);
      const level = Math.min(4, Math.max(2, block.level));
      const Tag = `h${level}`;
      return (
        <Tag key={key} id={id} className="blog-heading">
          <a href={`#${id}`} className="blog-heading-anchor" aria-hidden="true">#</a>
          {renderInline(block.text, `${key}-h`)}
        </Tag>
      );
    }
    case "p":
      return <p key={key}>{renderInline(block.text, `${key}-p`)}</p>;
    case "quote":
      return (
        <blockquote key={key}>
          {block.text.split("\n").map((line, index) => (
            <p key={index}>{renderInline(line, `${key}-q-${index}`)}</p>
          ))}
        </blockquote>
      );
    case "ul":
      return (
        <ul key={key}>
          {block.items.map((item, index) => (
            <li key={index}>{renderInline(item, `${key}-ul-${index}`)}</li>
          ))}
        </ul>
      );
    case "ol":
      return (
        <ol key={key}>
          {block.items.map((item, index) => (
            <li key={index}>{renderInline(item, `${key}-ol-${index}`)}</li>
          ))}
        </ol>
      );
    case "code":
      return <CodeBlock key={key} code={block.code} lang={block.lang} />;
    case "table":
      return (
        <div key={key} className="blog-table-wrap">
          <table>
            <thead>
              <tr>
                {block.header.map((cell, index) => (
                  <th key={index}>{renderInline(cell, `${key}-th-${index}`)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex}>{renderInline(cell, `${key}-td-${rowIndex}-${cellIndex}`)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case "image": {
      const href = safeHref(block.src);
      if (!href) return null;
      return (
        <figure key={key} className="blog-figure">
          <img src={assetUrl(href)} alt={block.alt || ""} loading="lazy" />
          {(block.caption || block.alt) && <figcaption>{block.caption || block.alt}</figcaption>}
        </figure>
      );
    }
    case "hr":
      return <hr key={key} />;
    default:
      return null;
  }
}

export function Markdown({ content }) {
  const blocks = useMemo(() => parseBlocks(content), [content]);
  // The heading-dedup map has to reset whenever the content changes.
  const seenRef = useRef(null);
  if (!seenRef.current || seenRef.current.content !== content) {
    seenRef.current = { content, map: new Map() };
  }
  const seen = seenRef.current.map;
  return <div className="blog-prose">{blocks.map((block, index) => renderBlock(block, `b-${index}`, seen))}</div>;
}
