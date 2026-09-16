import { useEffect, useState } from "react";

export default function PreLoader() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(false), 700);
    return () => window.clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[10000] grid place-items-center bg-black transition-opacity duration-500"
      role="status"
      aria-label="Loading portfolio"
    >
      <div className="flex flex-col items-center gap-5">
        <div className="h-12 w-12 animate-spin rounded-full border-2 border-zinc-700 border-t-violet-400" aria-hidden="true" />
        <span className="text-xs font-semibold tracking-[0.35em] text-zinc-400">SATHISH M</span>
      </div>
    </div>
  );
}
