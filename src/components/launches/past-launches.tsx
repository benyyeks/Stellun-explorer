// Past launches archive: the most recent completed orbital flights worldwide,
// with outcome, vehicle, and pad, plus CSV and JSON download. Loaded separately
// from the upcoming schedule so a slow archive never delays the countdown.
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
};

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
    location: safeText(l?.pad?.location?.name, 100),
    orbit: safeText(l?.mission?.orbit?.name, 40),
  }));
}

function fmtWhen(net: string): string {
  const d = new Date(net);
  if (Number.isNaN(d.getTime())) return "Unknown";
  const date = d.toLocaleDateString("en-US", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return `${date} · ${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())} UTC`;
}

function outcomeTone(outcome: string): string {
  const o = outcome.toLowerCase();
  if (o.includes("success")) return "success";
  if (o.includes("failure")) return "danger";
  return "muted";
}

const COLUMNS = [
  { key: "when", label: "Launch time (UTC)", value: (l: PastLaunch) => l.net },
  { key: "name", label: "Mission", value: (l: PastLaunch) => l.name },
  { key: "outcome", label: "Outcome", value: (l: PastLaunch) => l.outcome },
  { key: "provider", label: "Provider", value: (l: PastLaunch) => l.provider },
  { key: "rocket", label: "Vehicle", value: (l: PastLaunch) => l.rocket },
  { key: "location", label: "Launch site", value: (l: PastLaunch) => l.location },
  { key: "orbit", label: "Target orbit", value: (l: PastLaunch) => l.orbit },
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
    <section style={{ marginTop: 32 }}>
      <div className="panel-head">
        <div>
          <h2 className="section-title">Past launches archive</h2>
          <p className="freshness-note">
            The most recent completed orbital flights worldwide, newest first, with the
            outcome as the launch database records it.
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
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">Launch time</th>
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
                  <td className="mono">{fmtWhen(l.net)}</td>
                  <td>{l.name}</td>
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
      ) : null}
    </section>
  );
}
