import { useEffect, useState } from "react";
import { timeAgo } from "@/lib/format";

/**
 * Relative timestamps ("3m ago") depend on Date.now(), so server HTML and
 * the client's first paint never match exactly. Render a stable placeholder
 * until after hydration, then show the live relative string.
 *
 * Fixes production React error #418 (hydration text mismatch).
 */
export function RelativeTime({
  date,
  className,
}: {
  date: string | Date | null | undefined;
  className?: string;
}) {
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    if (date == null || date === "") {
      setLabel(null);
      return;
    }
    const d = date instanceof Date ? date : new Date(date);
    if (Number.isNaN(d.getTime())) {
      setLabel(null);
      return;
    }
    const tick = () => setLabel(timeAgo(d));
    tick();
    const id = window.setInterval(tick, 15_000);
    return () => window.clearInterval(id);
  }, [date]);

  if (date == null || date === "") return null;

  return (
    <span className={className} suppressHydrationWarning>
      {label ?? "…"}
    </span>
  );
}
