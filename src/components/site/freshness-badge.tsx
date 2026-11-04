import { useEffect, useState } from "react";
import { timeAgo } from "@/lib/format";

/** Catalog / feed age. Does not claim "Live" for multi-hour TLE caches. */
export function FreshnessBadge({
  res,
  label = "Elements",
}: {
  res: { isStale: boolean; fetchedAt: string };
  /** e.g. "Elements" for orbit groups, "Feed" for news */
  label?: string;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const ageMs = mounted ? Date.now() - new Date(res.fetchedAt).getTime() : 0;
  const old = res.isStale || ageMs > 30 * 60_000;
  return (
    <span className={`badge ${old ? "badge-warning" : "badge-success"}`}>
      {old ? "Last updated" : label}
      {mounted ? ` · ${timeAgo(new Date(res.fetchedAt))}` : ""}
    </span>
  );
}
