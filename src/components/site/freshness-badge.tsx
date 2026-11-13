import { useEffect, useState } from "react";
import { timeAgo } from "@/lib/format";

function parseFetchedAt(raw: string | null | undefined): Date | null {
  if (!raw) return null;
  const t = new Date(raw).getTime();
  // Reject missing, invalid, and the empty-cache sentinel (epoch 0)
  if (!Number.isFinite(t) || t < 1_000_000_000_000) return null; // before \~2001
  return new Date(t);
}

/** Catalog / feed age. Does not claim "Live" for multi-hour TLE caches. */
export function FreshnessBadge({
  res,
  label = "Elements",
}: {
  res: { isStale?: boolean; fetchedAt?: string | null };
  label?: string;
}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const at = parseFetchedAt(res.fetchedAt ?? null);
  if (!at) {
    return <span className="badge badge-warning">No data yet</span>;
  }

  const ageMs = Math.max(0, now - at.getTime());
  const old = Boolean(res.isStale) || ageMs > 30 * 60_000;

  return (
    <span className={`badge ${old ? "badge-warning" : "badge-success"}`}>
      {old ? "Last updated" : label}
      {` · ${timeAgo(at)}`}
    </span>
  );
}

/** ISS / live feeds only — short green clock, no "Elements" wording. */
export function LiveFreshnessBadge({
  fetchedAt,
  isError,
}: {
  fetchedAt?: number | string | null;
  isError?: boolean;
}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  if (isError) {
    return <span className="badge badge-warning">Live feed unavailable</span>;
  }

  let atMs: number | null = null;
  if (typeof fetchedAt === "number" && Number.isFinite(fetchedAt)) atMs = fetchedAt;
  else if (typeof fetchedAt === "string") {
    const p = parseFetchedAt(fetchedAt);
    atMs = p ? p.getTime() : null;
  }

  if (atMs == null) {
    return <span className="badge badge-success">Live · connecting…</span>;
  }

  const ageMs = Math.max(0, now - atMs);
  const stale = ageMs > 60_000; // >1 min without a successful poll
  return (
    <span className={`badge ${stale ? "badge-warning" : "badge-success"}`}>
      {stale ? "Last live fix" : "Live"}
      {` · ${timeAgo(new Date(atMs))}`}
    </span>
  );
}
