import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { getLaunches } from "@/lib/stellun-data.functions";
import { fmtNum, safeText, pad2 } from "@/lib/format";
import { FreshnessBadge } from "@/components/site/freshness-badge";
import { FeedError, EmptyState } from "@/components/site/data-state";
import { SkeletonImage } from "@/components/site/skeleton-image";
import { PastLaunches } from "@/components/launches/past-launches";
import { useNow } from "@/hooks/use-now";
import { launchStream, type LaunchStream } from "@/lib/launch-live";
import { PageHeroSkeleton, StatGridSkeleton, LaunchListSkeleton } from "@/components/site/page-skeleton";

export const Route = createFileRoute("/_authenticated/launches")({
  head: () => ({
    meta: [
      { title: "Launch Schedule - STELLUN" },
      {
        name: "description",
        content:
          "Upcoming orbital launches worldwide with live countdowns: rocket, provider, pad, and mission details from The Space Devs Launch Library 2.",
      },
      { property: "og:title", content: "Launch Schedule - STELLUN" },
      {
        property: "og:description",
        content: "Upcoming orbital launches with live countdowns, from The Space Devs Launch Library 2.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: async ({ context }) => {
    // Best effort: if the upstream is down during SSR, the client retries.
    await Promise.allSettled([context.queryClient.ensureQueryData(launchesQueryOptions)]);
  },
  staleTime: 60_000,
  pendingMs: 0,
  pendingComponent: LaunchesSkeleton,
  errorComponent: LaunchesError,
  component: LaunchesPage,
});

function LaunchesSkeleton() {
  return (
    <main className="page-main">
      <section>
        <div className="container" role="status" aria-busy="true" aria-label="Loading launch schedule">
          <span className="sr-only">Loading launch schedule</span>
          <PageHeroSkeleton />
          <StatGridSkeleton count={4} />
          <LaunchListSkeleton />
        </div>
      </section>
    </main>
  );
}

const launchesQueryOptions = queryOptions({
  queryKey: ["stellun", "launches"],
  queryFn: () => getLaunches(),
  retry: false,
  staleTime: 120_000,
});

// ------------------------------ Parsing -----------------------------------

type Launch = {
  id: string;
  name: string;
  net: string; // ISO datetime, "NET" = no earlier than
  status: string;
  provider: string;
  rocket: string;
  missionType: string;
  missionDesc: string;
  orbit: string;
  pad: string;
  location: string;
  country: string;
  webcastLive: boolean;
  vidURLs: unknown;
  image: string | null;
};

function parseLaunches(raw: unknown): Launch[] {
  const results = (raw as any)?.results;
  if (!Array.isArray(results)) return [];
  return results.map((l: any) => ({
    id: String(l?.id ?? ""),
    name: safeText(l?.name, 160),
    net: String(l?.net ?? ""),
    status: safeText(l?.status?.abbrev || l?.status?.name, 30),
    provider: safeText(l?.launch_service_provider?.name, 80),
    rocket: safeText(l?.rocket?.configuration?.full_name, 80),
    missionType: safeText(l?.mission?.type, 60),
    missionDesc: safeText(l?.mission?.description, 600),
    orbit: safeText(l?.mission?.orbit?.name, 40),
    pad: safeText(l?.pad?.name, 100),
    location: safeText(l?.pad?.location?.name, 100),
    country: safeText(
      l?.pad?.location?.country_code || l?.pad?.country_code,
      6,
    ),
    webcastLive: Boolean(l?.webcast_live),
    vidURLs: l?.vidURLs ?? l?.vid_urls ?? [],
    image:
      typeof l?.image === "string" && l.image
        ? l.image
        : typeof l?.rocket?.configuration?.image_url === "string" && l.rocket.configuration.image_url
          ? l.rocket.configuration.image_url
          : null,
  }));
}

function statusTone(abbrev: string): string {
  const a = abbrev.toLowerCase();
  if (a === "go") return "success";
  if (a.includes("hold")) return "danger";
  if (a === "tbd" || a === "tbc") return "muted";
  return "accent";
}

function fmtNet(net: string): string {
  const d = new Date(net);
  if (Number.isNaN(d.getTime())) return "TBD";
  const date = d.toLocaleDateString("en-US", { timeZone: "UTC", month: "short", day: "numeric", year: "numeric" });
  return `${date} · ${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())} UTC`;
}

// ------------------------------ Components ---------------------------------

// Mission imagery from the launch provider feed. Renders a skeleton while
// loading and a neutral placeholder when the source is missing or fails, so
// cards reserve their space and never show a broken frame.
function LaunchImage({ src, className, eager = false }: { src: string | null; className: string; eager?: boolean }) {
  return <SkeletonImage src={src} className={className} eager={eager} />;
}
function LaunchWatch({
  stream,
  image,
  className,
}: {
  stream: LaunchStream | null;
  image: string | null;
  className: string;
}) {
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  const goFullscreen = () => {
    const el = boxRef.current;
    if (!el) return;
    const req =
      el.requestFullscreen?.bind(el) ||
      (el as any).webkitRequestFullscreen?.bind(el);
    void req?.();
  };

  if (!stream) {
    return image ? <LaunchImage src={image} className={className} /> : null;
  }

  if (open && stream.embedUrl) {
    return (
      <div ref={boxRef} className={`launch-watch-player ${className}`}>
        <iframe
          title="Launch webcast"
          src={stream.embedUrl}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen
          style={{ width: "100%", height: "100%", minHeight: 220, border: 0, borderRadius: 12 }}
        />
        <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
          <button type="button" className="btn btn-ghost btn-sm" onClick={goFullscreen}>
            Full screen
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen(false)}>
            Show poster
          </button>
          <a className="btn btn-ghost btn-sm" href={stream.url} target="_blank" rel="noopener noreferrer">
            Open official stream
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className={`launch-watch-poster ${className}`} style={{ position: "relative" }}>
      {image ? (
        <LaunchImage src={image} className={className} />
      ) : (
        <div className={className} style={{ minHeight: 160, background: "rgba(0,0,0,0.25)" }} />
      )}
      <button
        type="button"
        className="btn btn-primary btn-sm"
        style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%, -50%)" }}
        onClick={() => {
          if (stream.embedUrl) setOpen(true);
          else window.open(stream.url, "_blank", "noopener,noreferrer");
        }}
      >
        Watch live
      </button>
    </div>
  );
}

// After the scheduled moment passes, the countdown switches to a post-liftoff
// state read from the launch feed's own status: in flight, then the confirmed
// outcome once the provider reports it.
type PostState = { label: string; tone: "accent" | "success" | "danger"; note: string };

function postLiftoffState(status: string): PostState {
  const s = status.toLowerCase();
  if (s.includes("success")) {
    return s.includes("partial")
      ? { label: "LIFTOFF", tone: "accent", note: "Partial success reported for this flight." }
      : { label: "LIFTOFF", tone: "success", note: "Launch successful." };
  }
  if (s.includes("fail")) {
    return { label: "LIFTOFF", tone: "danger", note: "Launch failure reported for this flight." };
  }
  if (s.includes("hold")) {
    return { label: "HOLD", tone: "danger", note: "Countdown is paused by the launch team." };
  }
  if (s.includes("flight")) {
    return { label: "LIFTOFF", tone: "accent", note: "Vehicle is in flight." };
  }
  return { label: "LIFTOFF", tone: "accent", note: "Liftoff time has passed. Outcome pending confirmation." };
}

function elapsedLabel(ms: number): string {
  const total = Math.floor(ms / 1000);
  const hrs = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  return hrs > 0 ? `T+ ${hrs}:${pad2(mins)}:${pad2(secs)}` : `T+ ${pad2(mins)}:${pad2(secs)}`;
}

// Ticking countdown; clock-dependent, so it renders only after hydration.
function Countdown({ net, status = "" }: { net: string; status?: string }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const target = new Date(net).getTime();
  const diff = now === null ? null : target - now;

  if (diff === null) {
    return (
      <div className="countdown-row" aria-hidden="true">
        {["days", "hrs", "min", "sec"].map((u) => (
          <div className="countdown-cell" key={u}>
            <div className="countdown-value">--</div>
            <div className="countdown-unit">{u}</div>
          </div>
        ))}
      </div>
    );
  }
  if (diff <= 0) {
    const state = postLiftoffState(status);
    return (
      <div className={`countdown-live countdown-${state.tone}`} role="status">
        <div className="countdown-liftoff">{state.label}</div>
        <div className="countdown-elapsed">{elapsedLabel(-diff)}</div>
        <div className="countdown-outcome">{state.note}</div>
      </div>
    );
  }
  const days = Math.floor(diff / 86400000);
  const hrs = Math.floor((diff % 86400000) / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  const secs = Math.floor((diff % 60000) / 1000);
  const cells: Array<[string, string]> = [
    [String(days), "days"],
    [pad2(hrs), "hrs"],
    [pad2(mins), "min"],
    [pad2(secs), "sec"],
  ];
  return (
    <div className="countdown-row" role="timer" aria-label="Countdown to next launch">
      {cells.map(([v, u]) => (
        <div className="countdown-cell" key={u}>
          <div className="countdown-value">{v}</div>
          <div className="countdown-unit">{u}</div>
        </div>
      ))}
    </div>
  );
}


function LaunchesError({ reset }: { reset: () => void }) {
  const router = useRouter();
  return (
    <main className="page-main">
      <section>
        <div className="container">
          <FeedError
            title="The launch schedule is temporarily unavailable"
            source="Launch Library 2 by The Space Devs"
            onRetry={() => {
              router.invalidate();
              reset();
            }}
          />
        </div>
      </section>
    </main>
  );
}

function LaunchesPage() {
  const now = useNow(1000);
  const { data: res } = useSuspenseQuery(launchesQueryOptions);
  const launches = parseLaunches(res?.data);
  const next = launches[0] ?? null;
  const rest = launches.slice(1);
  const providers = new Set(launches.map((l) => l.provider).filter(Boolean));
  const countries = new Set(launches.map((l) => l.country).filter(Boolean));
  const [shareHint, setShareHint] = useState("");

  async function shareNextLaunch() {
    if (!next) return;

    const origin =
      typeof window !== "undefined" ? window.location.origin : "https://stellun-explorer.noreplyobitex.workers.dev";
    const url = origin + "/launches#next-launch";
    const name = next.name || "the next orbital launch";
    const title = "STELLUN · " + name;
    // Prefilled message for WhatsApp / Messages / etc.
    const text =
      "Hi — check out " +
      name +
      ". We can track the countdown and watch the launch live on STELLUN.\n\n" +
      url;

    const finish = (msg: string) => {
      setShareHint(msg);
      window.setTimeout(() => setShareHint(""), 2500);
    };

    try {
      // Prefer sharing the launch image as a real file when the OS allows it
      // (Android Chrome + WhatsApp often shows the photo in the composer).
      if (next.image && typeof navigator.canShare === "function") {
        try {
          const imgRes = await fetch(next.image, { mode: "cors" });
          if (imgRes.ok) {
            const blob = await imgRes.blob();
            const type = blob.type || "image/jpeg";
            const ext = type.indexOf("png") >= 0 ? "png" : "jpg";
            const file = new File([blob], "stellun-launch." + ext, { type: type });
            const withFile = { title: title, text: text, url: url, files: [file] };
            if (navigator.canShare(withFile)) {
              await navigator.share(withFile);
              finish("Shared");
              return;
            }
          }
        } catch {
          // CORS or share-with-files not supported — fall through
        }
      }

      if (typeof navigator.share === "function") {
        await navigator.share({ title: title, text: text, url: url });
        finish("Shared");
        return;
      }

      await navigator.clipboard.writeText(text);
      finish("Message copied");
    } catch {
      try {
        await navigator.clipboard.writeText(text);
        finish("Message copied");
      } catch {
        finish("Copy failed");
      }
    }
  }
  return (
    <main className="page-main">
      <section>
        <div className="container">
          <div className="page-hero">
            <span className="eyebrow">Launch Library 2 · The Space Devs</span>
            <h1>Launch schedule</h1>
            <p className="tagline">
              Every confirmed upcoming orbital launch worldwide, with times given as NET
              (no earlier than). Schedules shift often, and this page is refreshed
              throughout the day.
            </p>
          </div>

          <div className="freshness-row">
            <FreshnessBadge res={res} />
            <span className="freshness-note">All times UTC. A launch marked Go is confirmed for its window.</span>
          </div>

          <div className="stat-grid" style={{ marginBottom: 24 }}>
            <div className="glass glass-card stat-card">
              <div className="stat-label">Upcoming tracked</div>
              <div className="stat-value">{fmtNum(launches.length)}</div>
              <div className="stat-unit">launches in feed</div>
            </div>
            <div className="glass glass-card stat-card">
              <div className="stat-label">Launch providers</div>
              <div className="stat-value">{fmtNum(providers.size)}</div>
              <div className="stat-unit">agencies and companies</div>
            </div>
            <div className="glass glass-card stat-card">
              <div className="stat-label">Countries</div>
              <div className="stat-value">{fmtNum(countries.size)}</div>
              <div className="stat-unit">launch sites represented</div>
            </div>
            <div className="glass glass-card stat-card">
              <div className="stat-label">Next launch</div>
              <div className="stat-value" style={{ fontSize: "1.3rem" }}>{next ? next.rocket || next.name : "--"}</div>
              <div className="stat-unit">{next ? `${next.provider || "Unknown provider"} · ${fmtNet(next.net)}` : ""}</div>
            </div>
            </div>

          {launches.length === 0 && (
            <EmptyState
              title="No launches currently listed"
              message="The worldwide schedule has no confirmed orbital launches in the coming window. New missions appear here as soon as they are announced."
            />
          )}

          {next && (
            <article
  id="next-launch"
  className="glass glass-card next-launch"
  aria-label="Next launch"
>
              {(next.image ||
  (now &&
    launchStream(next.vidURLs, next.net, now.getTime(), next.webcastLive))) && (
  <div className="next-launch-media">
    <LaunchWatch
      stream={
        now
          ? launchStream(next.vidURLs, next.net, now.getTime(), next.webcastLive)
          : null
      }
      image={next.image}
      className="next-launch-img"
    />
  </div>
)}
              <div className="next-launch-body">
                <div className="next-launch-info">
                  <span className={`badge badge-${statusTone(next.status)}`}>{next.status || "Scheduled"}</span>
                  <h2>{next.name}</h2>
                  <dl className="fact-list">
                    {next.provider && <div><dt>Provider</dt><dd>{next.provider}</dd></div>}
                    {next.rocket && <div><dt>Rocket</dt><dd>{next.rocket}</dd></div>}
                    {(next.pad || next.location) && (
                      <div><dt>Pad</dt><dd>{[next.pad, next.location].filter(Boolean).join(", ")}</dd></div>
                    )}
                    {next.orbit && <div><dt>Target orbit</dt><dd>{next.orbit}</dd></div>}
                    {next.missionType && <div><dt>Mission type</dt><dd>{next.missionType}</dd></div>}
                  </dl>
                  {next.missionDesc && <p className="next-launch-desc">{next.missionDesc}</p>}
                  {/* Watch control lives on the poster/player above when a stream is available */}
                </div>
                <div className="next-launch-count">
                  <div className="stat-label">Time until launch (NET)</div>
                  <Countdown net={next.net} status={next.status} />
                  <div className="freshness-note">{fmtNet(next.net)}</div>
                  <div className="next-launch-actions">
                    <button
                      type="button"
                      className="btn-share-launch"
                      onClick={() => void shareNextLaunch()}
                    >
                      {next.image ? (
                        <img
                          className="btn-share-launch-thumb"
                          src={next.image}
                          alt=""
                          width={40}
                          height={40}
                        />
                      ) : null}
                      <span className="btn-share-launch-label">
                        Share this launch
                        <span className="btn-share-launch-sub">
                          Countdown + live watch on STELLUN
                        </span>
                      </span>
                    </button>
                    {shareHint ? (
                      <span className="freshness-note" role="status">
                        {shareHint}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            </article>
          )}

          {rest.length > 0 && (
            <section style={{ marginTop: 32 }}>
              <h2 className="section-title">Following launches</h2>
              <div className="launch-list">
                {rest.map((l) => (
                  <article className="glass glass-card launch-row" key={l.id || l.name}>
                    <LaunchImage src={l.image} className="launch-thumb" />
                    <div className="launch-row-body">
                      <div className="launch-row-head">
                        <span className={`badge badge-${statusTone(l.status)}`}>{l.status || "Scheduled"}</span>
                        <span className="launch-date">{fmtNet(l.net)}</span>
                      </div>
                      <h3>{l.name}</h3>
                      <p className="launch-meta">
                        {[l.provider, l.rocket, l.location && `${l.location}${l.country ? ` (${l.country})` : ""}`]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                      {l.missionDesc && <p className="launch-desc">{l.missionDesc}</p>}
                      {now && launchStream(l.vidURLs, l.net, now.getTime(), l.webcastLive) ? (
  <a
    className="btn btn-primary btn-sm"
    href={launchStream(l.vidURLs, l.net, now.getTime(), l.webcastLive)!.url}
    target="_blank"
    rel="noopener noreferrer"
  >
    Watch live
  </a>
) : null}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}

          <PastLaunches />

          <div className="glass glass-card method-note">
            <h2>How this data works</h2>
            <p>
              Launch data comes from Launch Library 2, the open launch database maintained by
              The Space Devs. Times are NET (no earlier than): a launch can slip later than the
              listed time, never earlier. Status abbreviations: Go means confirmed for the
              window, TBD or TBC means the date is provisional, Hold means the countdown is
              paused.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
