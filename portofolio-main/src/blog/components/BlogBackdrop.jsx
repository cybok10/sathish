import { useEffect, useState } from "react";

/**
 * The animated page backdrop.
 *
 * Three layers, all driven by CSS so they stay on the compositor and cost
 * no JavaScript per frame:
 *
 *   1. two slow-drifting colour fields (violet and teal)
 *   2. a fine grid that pans slowly, for depth
 *   3. a vignette that keeps the edges calm so text stays readable
 *
 * The whole thing is decorative and hidden from assistive technology.
 * Anyone who prefers reduced motion gets a still version, and anyone on a
 * small screen gets a much quieter one so it never competes with the text.
 */
export default function BlogBackdrop() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  return (
    <div className="blog-backdrop" data-reduced={reduced ? "true" : "false"} aria-hidden="true">
      <div className="blog-backdrop__field blog-backdrop__field--violet" />
      <div className="blog-backdrop__field blog-backdrop__field--teal" />
      <div className="blog-backdrop__grid" />
      <div className="blog-backdrop__vignette" />
    </div>
  );
}
