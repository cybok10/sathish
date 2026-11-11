import { useEffect, useState } from "react";

/**
 * A thin reading-progress bar.
 *
 * It tells a reader how much of the page is left, which matters on a
 * long article. The scroll handler is throttled with requestAnimationFrame
 * so it never runs more than once per frame.
 */
export default function ReadingProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let frame = null;

    const measure = () => {
      frame = null;
      const doc = document.documentElement;
      const scrollable = doc.scrollHeight - doc.clientHeight;
      if (scrollable <= 0) {
        setProgress(0);
        return;
      }
      const ratio = (doc.scrollTop || document.body.scrollTop) / scrollable;
      setProgress(Math.min(1, Math.max(0, ratio)));
    };

    const onScroll = () => {
      if (frame === null) frame = requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      if (frame !== null) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <div className="blog-progress" aria-hidden="true">
      <span className="blog-progress__bar" style={{ transform: `scaleX(${progress})` }} />
    </div>
  );
}
