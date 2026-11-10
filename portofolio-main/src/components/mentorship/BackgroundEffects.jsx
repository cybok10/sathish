import { usePrefersReducedMotion } from "./hooks";

/**
 * Subtle page-wide decoration: a slow-moving gradient wash and a faint
 * scanline field. Purely CSS-driven (GPU-friendly, no JS scroll work) and
 * fully disabled under prefers-reduced-motion.
 *
 * The colours come from the page's own theme tokens, so the decoration
 * follows the palette instead of being pinned to one set of colours.
 */
export default function BackgroundEffects() {
  const reduced = usePrefersReducedMotion();

  return (
    <div className="ms-fx" aria-hidden="true" data-reduced={reduced ? "true" : "false"}>
      <div className="ms-fx__aurora" />
      <div className="ms-fx__scan" />
      <style>{css}</style>
    </div>
  );
}

const css = `
.ms-fx {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  overflow: hidden;
}
.ms-fx__aurora {
  position: absolute;
  inset: -30%;
  background:
    radial-gradient(38% 32% at 18% 22%, rgba(var(--ms-accent-rgb), 0.16), transparent 65%),
    radial-gradient(42% 36% at 82% 70%, rgba(var(--ms-accent-2-rgb), 0.14), transparent 65%),
    radial-gradient(30% 28% at 55% 95%, rgba(var(--ms-accent-2-rgb), 0.1), transparent 70%);
  animation: ms-aurora 34s ease-in-out infinite alternate;
  will-change: transform;
}
@keyframes ms-aurora {
  0%   { transform: translate3d(-3%, -2%, 0) scale(1); }
  50%  { transform: translate3d(2%, 3%, 0) scale(1.06); }
  100% { transform: translate3d(4%, -3%, 0) scale(1.02); }
}
.ms-fx__scan {
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(
    180deg,
    rgba(var(--ms-muted-rgb), 0.04) 0px,
    rgba(var(--ms-muted-rgb), 0.04) 1px,
    transparent 1px,
    transparent 4px
  );
  mask-image: linear-gradient(180deg, transparent, #000 25%, #000 75%, transparent);
  opacity: 0.5;
}
.ms-fx[data-reduced="true"] .ms-fx__aurora { animation: none; }
`;
