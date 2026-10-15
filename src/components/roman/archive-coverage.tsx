// Archive coverage for the Roman survey fields. Roman is in commissioning and
// has published no science data, so this panel queries the archive for real
// Hubble and Webb observations of the same sky regions. Roman's own rows stay
// marked as pending observation. When the archive does not answer, the panel
// says so and keeps the planned survey information usable.
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CATALOGUE_ROWS } from "@/lib/roman";
import { getArchiveObservations, type ArchiveObservation } from "@/lib/stellun-data.functions";
import { ExportButtons } from "@/components/site/export-buttons";
import { FeedStatus } from "@/components/site/feed-status";

const COLUMNS = [
  { key: "collection", label: "Observatory", value: (r: ArchiveObservation) => r.collection },
  { key: "instrument", label: "Instrument", value: (r: ArchiveObservation) => r.instrument },
  { key: "target", label: "Target", value: (r: ArchiveObservation) => r.target },
  { key: "filters", label: "Filters", value: (r: ArchiveObservation) => r.filters },
  {
    key: "start",
    label: "Observation start (UTC)",
    value: (r: ArchiveObservation) => r.startISO ?? "",
  },
  {
    key: "exposure",
    label: "Exposure (s)",
    value: (r: ArchiveObservation) => r.exposureSeconds ?? "",
  },
  { key: "product", label: "Product type", value: (r: ArchiveObservation) => r.productType },
];

function dateLabel(iso: string | null): string {
  if (!iso) return "--";
  return new Date(iso).toISOString().slice(0, 10);
}

export function ArchiveCoverage() {
  const [fieldName, setFieldName] = useState(CATALOGUE_ROWS[2]!.field);
  const field = CATALOGUE_ROWS.find((r) => r.field === fieldName) ?? CATALOGUE_ROWS[0]!;
  const fetchArchive = useServerFn(getArchiveObservations);

  const q = useQuery({
    queryKey: ["mast-cone", field.raDeg, field.decDeg],
    queryFn: () => fetchArchive({ data: { raDeg: field.raDeg, decDeg: field.decDeg } }),
    staleTime: 6 * 3600 * 1000,
  });

  const rows: ArchiveObservation[] = q.data?.data?.items ?? [];

  return (
    <div className="glass glass-card">
      <div className="panel-head">
        <div>
          <h3>Existing coverage of the Roman survey fields</h3>
          <p className="roman-note">
            Real observations already recorded by Hubble and Webb inside 0.2 degrees of
            each planned Roman field centre, drawn from the Mikulski Archive for Space
            Telescopes. Roman itself is still commissioning, so its own rows remain
            pending observation.
          </p>
        </div>
        <ExportButtons
          rows={rows}
          columns={COLUMNS}
          meta={{
            dataset: `Archive coverage of ${field.field}`,
            source: "Mikulski Archive for Space Telescopes",
            retrievedAt: q.data?.fetchedAt,
          }}
        />
      </div>

      <div className="chip-row" role="group" aria-label="Survey field">
        {CATALOGUE_ROWS.map((r) => (
          <button
            key={r.field}
            type="button"
            className={`chip${r.field === field.field ? " chip-active" : ""}`}
            aria-pressed={r.field === field.field}
            onClick={() => setFieldName(r.field)}
          >
            {r.field}
          </button>
        ))}
      </div>

      <p className="roman-note mono">
        Centre {field.ra} {field.dec} · {field.survey}
      </p>

      <FeedStatus
        label="Archive coverage"
        source="Mikulski Archive for Space Telescopes"
        state={
          q.isLoading
            ? "loading"
            : q.isError
              ? "unavailable"
              : q.data?.isStale
                ? "delayed"
                : "live"
        }
        fetchedAt={q.data?.fetchedAt ?? null}
      />

      {rows.length > 0 ? (
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">Observatory</th>
                <th scope="col">Instrument</th>
                <th scope="col">Target</th>
                <th scope="col">Filters</th>
                <th scope="col">Start</th>
                <th scope="col">Exposure</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={`${r.target}-${r.startISO}-${i}`}>
                  <td>{r.collection}</td>
                  <td className="mono">{r.instrument}</td>
                  <td>{r.target}</td>
                  <td className="mono">{r.filters}</td>
                  <td className="mono">{dateLabel(r.startISO)}</td>
                  <td className="mono">
                    {r.exposureSeconds ? `${Math.round(r.exposureSeconds)} s` : "--"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : q.isLoading ? null : (
        <p className="roman-note">
          No Hubble or Webb records were returned for this field. The planned survey
          information above remains accurate, and coverage is checked again on the next
          visit.
        </p>
      )}
    </div>
  );
}
