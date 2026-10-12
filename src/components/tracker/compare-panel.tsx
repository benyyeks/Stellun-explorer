// Comparison of any number of satellites: orbital parameters, live state,
// and ground tracks. Rendered below the tracker scene in compare mode.
import { propagateSat, orbitRegime, type TLE } from "@/lib/satellite";
import { fmtNum } from "@/lib/format";
import { useNow } from "@/hooks/use-now";
import { GroundTrack } from "./ground-track";

const MAX_COMPARE = 12;

function meanAlt(t: TLE): number {
  return (t.apogeeAlt + t.perigeeAlt) / 2;
}

export function ComparePanel({
  items,
  onRemove,
}: {
  items: TLE[];
  onRemove?: (noradId: string) => void;
}) {
  const now = useNow(1000);
  const list = items.slice(0, MAX_COMPARE);

  const fmt = (v: number | null | undefined, digits: number, unit: string) =>
    v == null || Number.isNaN(v) ? "—" : `${fmtNum(v, digits)}${unit ? ` ${unit}` : ""}`;

  type Row = {
    label: string;
    value: (t: TLE) => number | null;
    digits: number;
    unit: string;
  };

  const rows: Row[] = [
    { label: "Mean altitude", value: (t) => meanAlt(t), digits: 0, unit: "km" },
    {
      label: "Current speed",
      value: (t) => (now ? propagateSat(t, now)?.speed ?? null : null),
      digits: 2,
      unit: "km/s",
    },
    { label: "Orbital period", value: (t) => t.periodMin ?? null, digits: 1, unit: "min" },
    { label: "Inclination", value: (t) => t.inc ?? null, digits: 2, unit: "°" },
    { label: "Apogee", value: (t) => t.apogeeAlt ?? null, digits: 0, unit: "km" },
    { label: "Perigee", value: (t) => t.perigeeAlt ?? null, digits: 0, unit: "km" },
    { label: "Eccentricity", value: (t) => t.ecc ?? null, digits: 4, unit: "" },
  ];

  if (list.length === 0) {
    return (
      <div className="glass glass-card compare-panel" aria-label="Satellite comparison">
        <div className="side-item-top">
          <h3>Compare</h3>
        </div>
        <p className="detail-note" style={{ margin: 0 }}>
          Select satellites in the catalog while compare mode is on. Add up to {MAX_COMPARE} objects.
        </p>
      </div>
    );
  }

  return (
    <div className="glass glass-card compare-panel" aria-label="Satellite comparison">
      <div className="side-item-top">
        <h3>Comparison</h3>
        <span className="mono compare-sub">
          {list.length} object{list.length === 1 ? "" : "s"}
        </span>
      </div>

      <ul className="compare-chip-list">
        {list.map((t) => (
          <li key={t.noradId}>
            <span className="compare-chip-name">{t.name}</span>
            <span className="mono text-faint">{t.noradId}</span>
            {onRemove ? (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => onRemove(t.noradId)}
                aria-label={`Remove ${t.name} from comparison`}
              >
                Remove
              </button>
            ) : null}
          </li>
        ))}
      </ul>

      <div className="compare-table-wrap">
        <table className="compare-table">
          <thead>
            <tr>
              <th scope="col">Parameter</th>
              {list.map((t) => (
                <th scope="col" key={t.noradId}>
                  {t.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label}>
                <th scope="row">{r.label}</th>
                {list.map((t) => (
                  <td className="mono" key={t.noradId}>
                    {fmt(r.value(t), r.digits, r.unit)}
                  </td>
                ))}
              </tr>
            ))}
            <tr>
              <th scope="row">Orbital regime</th>
              {list.map((t) => (
                <td key={t.noradId}>{orbitRegime(t)}</td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      <div className="compare-grid compare-grid-multi">
        {now &&
          list.map((t) => (
            <figure key={t.noradId}>
              <GroundTrack tle={t} now={now} />
              <figcaption>{t.name}: current orbit in context</figcaption>
            </figure>
          ))}
      </div>
      <p className="detail-note">
        Ground tracks cover the next two orbital periods from now. Live values update every second.
        Objects in this list are highlighted with orbit paths in the 3D view.
      </p>
    </div>
  );
}

export const COMPARE_MAX = MAX_COMPARE;
