// Past launches archive — mobile cards + desktop table, fixed time format, compact video thumbs.
import { useQuery } from "@tanstack/react-query";
import { getPastLaunches } from "@/lib/stellun-data.functions";
import { safeText, pad2 } from "@/lib/format";
import { ExportButtons } from "@/components/site/export-buttons";
import { FeedStatus } from "@/components/site/feed-status";

type PastLaunch = {
  id: string;
  name: string;
  net: string;
  outcome: string;
  provider: string;
  rocket: string;
  location: string;
  orbit: string;
  image: string | null;
  videoUrl: string | null;
};

function youtubeId(url: string): string | null {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    if (host === "youtu.be") return u.pathname.replace(/^\//, "").split("/")[0] || null;
    if (host === "youtube.com" || host === "m.youtube.com") {
      const v = u.searchParams.get("v");
      if (v) return v;
      const parts = u.pathname.split("/").filter(Boolean);
      if (parts[0] === "embed" || parts[0] === "live" || parts[0] === "shorts") {
        return parts[1] || null;
      }
    }
  } catch {
    /* ignore */
  }
  return null;
}

function bestVideo(vids: unknown): string | null {
  if (!Array.isArray(vids) || vids.length === 0) return null;
  const sorted = [...vids].sort(
    (a: any, b: any) => (a?.priority ?? 999) - (b?.priority ?? 999),
  );
  for (const v of sorted) {
    const href = typeof v === "string" ? v : v?.url;
    if (typeof href === "string" && href.startsWith("https://")) return href;
  }
  return null;
}

function parse(raw: unknown): PastLaunch[] {
  const results = (raw as { results?: unknown } | null)?.results;
  if (!Array.isArray(results)) return [];
  return results.map((l: any) => ({
    id: String(l?.id ?? ""),
    name: safeText(l?.name, 160),
    net: String(l?.net ?? ""),
    outcome: safeText(l?.status?.name || l?.status?.abbrev, 40),
    provider: safeText(l?.launch_service_provider?.name, 80),
    rocket: safeText(l?.rocket?.configuration?.full_name, 80),
    location: safeText(l?.pad?.location?.name || l?.pad?.name, 100),
    orbit: safeText(l?.mission?.orbit?.name, 40),
    image: typeof l?.image === "string" ? l.image : null,
    videoUrl: bestVideo(l?.vidURLs ?? l?.vid_urls),
  }));
}

/** Always use ${pad2(...)} — bare {pad2(...)} prints as source text. */
function fmtWhen(net: string): string {
  const d = new Date(net);
  if (Number.isNaN(d.getTime())) return "Unknown";
  const date = d.toLocaleDateString("en-US", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
    year: "numeric",
  });return `${date} · \( {pad2(d.getUTCHours())}: \){pad2(d.getUTCMinutes())} UTC`;
}

function outcomeTone(outcome: string): string {
  const o = outcome.toLowerCase();
  if (o.includes("success")) return "success";
  if (o.includes("failure")) return "danger";
  return "muted";
}

function VideoThumb({
  videoUrl,
  image,
  name,
}: {
  videoUrl: string | null;
  image: string | null;
  name: string;
}) {
  if (!videoUrl) {
    return <span className="past-video-empty" aria-label="No video">—</span>;
  }
  const yt = youtubeId(videoUrl);
  const thumb = yt ? `https://img.youtube.com/vi/${yt}/hqdefault.jpg` : image;

  return (
    <a
      className="past-video-link"
      href={videoUrl}
      target="_blank"
      rel="noopener noreferrer"
      title={`Watch ${name}`}
      aria-label={`Watch video for ${name}`}
    >
      {thumb ? (
        <span className="past-video-thumb">
          <img src={thumb} alt="" loading="lazy" width={80} height={45} />
          <span className="past-video-play" aria-hidden>
            ▶
          </span>
        </span>
      ) : (
        <span className="past-video-text">Watch</span>
      )}
    </a>
  );
}

const COLUMNS = [
  { key: "when", label: "Launch day & time (UTC)", value: (l: PastLaunch) => fmtWhen(l.net) },
  { key: "video", label: "Launch video", value: (l: PastLaunch) => l.videoUrl ?? "" },
  { key: "name", label: "Mission", value: (l: PastLaunch) => l.name },
  { key: "outcome", label: "Outcome", value: (l: PastLaunch) => l.outcome },
  { key: "provider", label: "Provider", value: (l: PastLaunch) => l.provider },
  { key: "rocket", label: "Vehicle", value: (l: PastLaunch) => l.rocket },
  { key: "location", label: "Launch site", value: (l: PastLaunch) => l.location },
];

export function PastLaunches() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["stellun", "launches", "previous"],
    queryFn: () => getPastLaunches(),
    retry: false,
    staleTime: 30 * 60_000,
  });

  const rows = parse(data?.data);
  const state = isLoading
    ? "loading"
    : isError || rows.length === 0
      ? "unavailable"
      : data?.isStale
        ? "delayed"
        : "live";

  return (
    <section className="past-launches" style={{ marginTop: 32 }}>
      <div className="panel-head past-head">
        <div>
          <h2 className="section-title">Past launches archive</h2>
          <p className="freshness-note">
            Recent completed orbital flights, newest first. Tap the video thumb to open the
            best available webcast.
          </p>
        </div>
        <ExportButtons
          rows={rows}
          columns={COLUMNS}
          meta={{
            dataset: "Recent completed orbital launches",
            source: "Launch Library 2, The Space Devs",
            ...(data?.fetchedAt ? { retrievedAt: data.fetchedAt } : {}),
          }}
        />
      </div>

      <FeedStatus
        label="Launch archive"
        source="Launch Library 2"
        state={state as "live" | "delayed" | "unavailable" | "loading"}
        {...(data?.fetchedAt ? { fetchedAt: data.fetchedAt } : {})}
      />

      {rows.length > 0 ? (
        <>
          {/* Mobile / narrow: stacked cards */}
          <ul className="past-card-list">
            {rows.map((l) => (
              <li className="past-card glass glass-card" key={l.id || l.name}>
                <div className="past-card-top">
                  <VideoThumb videoUrl={l.videoUrl} image={l.image} name={l.name} />
                  <div className="past-card-main">
                    <div className="past-card-meta">
                      <span className="mono past-when">{fmtWhen(l.net)}</span>
                      <span className={`badge badge-${outcomeTone(l.outcome)}`}>
                        {l.outcome || "Recorded"}
                      </span>
                    </div>
                    <h3 className="past-card-title">{l.name}</h3>
                  </div>
                </div>
                <dl className="past-card-facts">
                  <div>
                    <dt>Provider</dt>
                    <dd>{l.provider || "—"}</dd>
                  </div>
                  <div>
                    <dt>Vehicle</dt>
                    <dd>{l.rocket || "—"}</dd>
                  </div>
                  <div>
                    <dt>Launch site</dt>
                    <dd>
                      {l.location || "—"}
                      {l.orbit ? ` · ${l.orbit}` : ""}
                    </dd>
                  </div>
                </dl>
              </li>
            ))}
          </ul>

          {/* Desktop: compact table */}
          <div className="table-scroll past-table-wrap">
            <table className="data-table past-launches-table">
              <thead>
                <tr>
                  <th scope="col">Launch day &amp; time</th>
                  <th scope="col">Video</th>
                  <th scope="col">Mission</th>
                  <th scope="col">Outcome</th>
                  <th scope="col">Provider</th>
                  <th scope="col">Vehicle</th>
                  <th scope="col">Launch site</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((l) => (
                  <tr key={l.id || l.name}>
                    <td className="mono past-when">{fmtWhen(l.net)}</td>
                    <td className="past-video-cell">
                      <VideoThumb videoUrl={l.videoUrl} image={l.image} name={l.name} />
                    </td>
                    <td className="past-mission">{l.name}</td>
                    <td>
                      <span className={`badge badge-${outcomeTone(l.outcome)}`}>
                        {l.outcome || "Recorded"}
                      </span>
                    </td>
                    <td>{l.provider}</td>
                    <td>{l.rocket}</td>
                    <td>
                      {l.location}
                      {l.orbit ? ` · ${l.orbit}` : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </section>
  );
      }
