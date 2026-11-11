import { useMemo, useState } from "react";
import { Link } from "../router";
import { searchTools, tools, toolsByCategory } from "../data/tactics";
import { useSeo } from "../seo";
import TacticsHeader from "../components/TacticsHeader";
import { ArrowRight, SearchIcon } from "../components/Icons";

/**
 * The tools index.
 *
 * Grouped by what the tool is for, because that is the question people
 * actually arrive with — "what do I use for X?" rather than "what is
 * called Y?".
 */
export default function ToolsIndex() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");

  useSeo({
    title: "Tools",
    description:
      "The offensive security toolkit explained honestly — what each tool is for, how to install it, the commands that matter and where it gives you the wrong answer.",
    path: "/blog/tactics/tools",
  });

  const results = useMemo(() => searchTools(query), [query]);
  const groups = useMemo(() => {
    const base = toolsByCategory();
    if (!category) return base;
    return base.filter((group) => group.id === category);
  }, [category]);

  return (
    <div className="blog-container blog-tac">
      <nav className="blog-breadcrumb" aria-label="Breadcrumb">
        <Link to="/blog">Blog</Link>
        <span>/</span>
        <Link to="/blog/tactics">Tactics</Link>
        <span>/</span>
        <span className="blog-dim">Tools</span>
      </nav>

      <TacticsHeader
        eyebrow="Tools"
        title="The toolkit,"
        accentWord="explained honestly."
        lead="The tools that earn their place in an assessment — what each one is for, how to install it, the commands that matter, and where it will happily give you the wrong answer."
        stats={[
          { value: tools.length, label: "tools" },
          { value: toolsByCategory().length, label: "categories" },
          { value: toolsByCategory()[0]?.tools.length ?? 0, label: "largest group" },
        ]}
        bars={toolsByCategory()
          .slice(0, 6)
          .map((group) => ({
            label: group.label,
            value: group.tools.length,
            color: "#a78bfa",
          }))}
      />

      <div className="blog-tac-toolbar">
        <label className="blog-tac-search blog-tac-search--wide">
          <SearchIcon size={15} />
          <span className="blog-visually-hidden">Search tools</span>
          <input
            type="search"
            value={query}
            placeholder="Search tools — try “nmap”, “password” or “subdomain”"
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
      </div>

      <div className="blog-tac-tags">
        <button
          type="button"
          className={`blog-chip ${category === "" ? "blog-chip-accent" : ""}`}
          onClick={() => setCategory("")}
          aria-pressed={category === ""}
        >
          All ({tools.length})
        </button>
        {toolsByCategory().map((group) => (
          <button
            key={group.id}
            type="button"
            className={`blog-chip ${category === group.id ? "blog-chip-accent" : ""}`}
            onClick={() => setCategory(category === group.id ? "" : group.id)}
            aria-pressed={category === group.id}
          >
            {group.label} ({group.tools.length})
          </button>
        ))}
      </div>

      <p className="blog-dim blog-tac-count">
        Showing {results.length} of {tools.length} tools
      </p>

      {groups.map((group) => {
        const visible = group.tools.filter((tool) => results.includes(tool));
        if (!visible.length) return null;
        return (
          <section className="blog-tac-group" key={group.id}>
            <h2 className="blog-h2">{group.label}</h2>
            <ul className="blog-tac-grid blog-tac-grid--compact">
              {visible.map((tool) => (
                <li key={tool.slug} data-reveal>
                  <Link to={`/blog/tactics/tools/${tool.slug}`} className="blog-tac-card">
                    <span className="blog-tac-card__top">
                      <span className="blog-tac-card__name">{tool.name}</span>
                    </span>
                    <span className="blog-tac-card__desc">{tool.summary}</span>
                    <span className="blog-tac-card__more">
                      Read the reference <ArrowRight size={12} />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      {results.length === 0 ? (
        <div className="blog-empty">
          <h3>Nothing matched that</h3>
          <p>Try a different tool name or category.</p>
        </div>
      ) : null}
    </div>
  );
}
