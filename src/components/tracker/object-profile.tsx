import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { satnogsProfileQuery, satnogsTransmittersQuery } from "@/lib/sat-queries";
import { SkeletonImage } from "@/components/site/skeleton-image";
import { safeText, utcDateStr } from "@/lib/format";
import { matchDebrisEvent, orbitRegime, type TLE } from "@/lib/satellite";
import { setAskPrefill } from "@/lib/study-workspace";

type SatnogsSat = {
  name?: string;
  names?: string;
  image?: string;
  status?: string;
  launched?: string;
  deployed?: string;
  decayed?: string;
  website?: string;
  operator?: string;
  countries?: string;
};

type SatnogsTx = {
  uuid?: string;
  description?: string;
  type?: string;
  alive?: boolean;
  status?: string;
  downlink_low?: number | null;
  downlink_high?: number | null;
  uplink_low?: number | null;
  uplink_high?: number | null;
  mode?: string;
  baud?: number | null;
  service?: string;
  invert?: boolean;
  unconfirmed?: boolean;
};

function fmtDate(value: unknown): string | null {
  if (typeof value !== "string" || !value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : utcDateStr(d);
}

function cleanField(value: unknown, maxLen = 120): string {
  const text = safeText(value, maxLen);
  return /^(none|n\/a|null|unknown)$/i.test(text) ? "" : text;
}

function fmtFreq(hz: number | null | undefined): string | null {
  if (typeof hz !== "number" || !Number.isFinite(hz) || hz <= 0) return null;
  if (hz >= 1e9) return (hz / 1e9).toFixed(3) + " GHz";
  return (hz / 1e6).toFixed(3) + " MHz";
}

function fmtFreqRange(
  low: number | null | undefined,
  high: number | null | undefined,
): string | null {
  const lo = fmtFreq(low);
  const hi = fmtFreq(high);
  if (!lo) return hi;
  if (!hi || lo === hi) return lo;
  return lo + " to " + hi;
}

function DetailCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="detail-cell">
      <div className="stat-label">{label}</div>
      <div className="detail-value">{value}</div>
    </div>
  );
}

function buildWriteUp(sat: SatnogsSat, displayName: string, noradId: string): string {
  const name = cleanField(sat.name, 120) || displayName;
  const alt = cleanField(sat.names, 160);
  const sentences: string[] = [];

  let first =
    name +
    (alt ? ", also catalogued as " + alt + "," : "") +
    " is tracked in the public catalog as NORAD " +
    noradId +
    ".";
  sentences.push(first);

  const operator = cleanField(sat.operator, 120);
  const countries = cleanField(sat.countries, 120).replace(/,/g, ", ");
  const launched = fmtDate(sat.launched);
  let mission = "";
  if (operator) {
    mission = "It is operated by " + operator + (countries ? " (" + countries + ")" : "");
  } else if (countries) {
    mission = "It is registered to " + countries;
  }
  if (mission && launched) {
    mission += " and was launched on " + launched + ".";
  } else if (mission) {
    mission += ".";
  } else if (launched) {
    mission = "It was launched on " + launched + ".";
  }
  if (mission) sentences.push(mission);

  const deployed = fmtDate(sat.deployed);
  if (deployed) sentences.push("Deployment followed on " + deployed + ".");
  const decayed = fmtDate(sat.decayed);
  if (decayed) sentences.push("The object reentered the atmosphere on " + decayed + ".");
  const rawStatus = cleanField(sat.status, 40);
  const status = rawStatus ? rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1) : "";
  if (status && !decayed) {
    sentences.push("Observers currently report its status as " + status + ".");
  }
  return sentences.join(" ");
}

function buildMissionAskPrompt(
  displayName: string,
  noradId: string,
  tle?: TLE | null,
): string {
  const regime = tle ? orbitRegime(tle) : null;
  const bits: string[] = [];
  bits.push(
    'Can you help me with the mission profile and background for satellite "' +
      displayName +
      '" (NORAD catalog ' +
      noradId +
      ")?",
  );
  if (regime) {
    bits.push("Orbit regime from published elements: " + regime + ".");
  }
  if (tle) {
    bits.push(
      "Approximate altitudes from elements: apogee \~" +
        Math.round(tle.apogeeAlt) +
        " km, perigee \~" +
        Math.round(tle.perigeeAlt) +
        " km, period \~" +
        tle.periodMin.toFixed(1) +
        " min.",
    );
  }
  bits.push(
    "Summarize what is publicly known about its purpose, operator, and history. If little is published, say so clearly and do not invent details.",
  );
  return bits.join(" ");
}

function TransmitterRow({ tx }: { tx: SatnogsTx }) {
  const description = cleanField(tx.description, 120) || "Unnamed transmitter";
  const downlink = fmtFreqRange(tx.downlink_low, tx.downlink_high);
  const uplink = fmtFreqRange(tx.uplink_low, tx.uplink_high);
  const mode = cleanField(tx.mode, 40);
  const service = cleanField(tx.service, 60);
  const active = tx.alive === true || tx.status === "active";

  const meta: string[] = [];
  if (downlink) meta.push("Downlink " + downlink + (tx.invert ? " (inverted)" : ""));
  if (uplink) meta.push("Uplink " + uplink);
  if (mode) meta.push(mode);
  if (typeof tx.baud === "number" && tx.baud > 0) {
    meta.push(tx.baud.toLocaleString("en-US") + " baud");
  }
  if (service) meta.push(service);

  return (
    <li className="tx-row">
      <div className="tx-row-top">
        <span className="tx-name">{description}</span>
        <span className="tx-badges">
          {tx.type ? <span className="badge badge-muted">{cleanField(tx.type, 20)}</span> : null}
          <span className={"badge " + (active ? "badge-success" : "badge-muted")}>
            {active ? "Active" : "Inactive"}
          </span>
          {tx.unconfirmed ? <span className="badge badge-warning">Unconfirmed</span> : null}
        </span>
      </div>
      {meta.length ? <div className="tx-meta mono">{meta.join("  ·  ")}</div> : null}
    </li>
  );
}

export function ObjectProfile({
  noradId,
  displayName,
  tle,
}: {
  noradId: string;
  displayName: string;
  tle?: TLE | null;
}) {
  const navigate = useNavigate();
  const profileQuery = useQuery(satnogsProfileQuery(noradId));
  const txQuery = useQuery(satnogsTransmittersQuery(noradId));
  const [showInactive, setShowInactive] = useState(false);

  const sat: SatnogsSat | null = profileQuery.data?.data ?? null;
  const allTx: SatnogsTx[] = useMemo(() => {
    const rows = txQuery.data?.data;
    return Array.isArray(rows) ? rows : [];
  }, [txQuery.data]);

  const sortedTx = useMemo(() => {
    const rows = showInactive
      ? allTx
      : allTx.filter((tx) => tx.alive === true || tx.status === "active");
    return [...rows].sort((a, b) => (a.downlink_low ?? 0) - (b.downlink_low ?? 0));
  }, [allTx, showInactive]);

  const inactiveCount = allTx.filter(
    (tx) => !(tx.alive === true || tx.status === "active"),
  ).length;
  const writeUp = sat ? buildWriteUp(sat, displayName, noradId) : null;
  const profilePending = profileQuery.isPending;
  const txPending = txQuery.isPending;

  const debrisEvent = tle ? matchDebrisEvent(tle.name) : null;
  const isDebris = tle ? orbitRegime(tle) === "Orbital debris" : false;

  const openAskMissionProfile = () => {
    const text = buildMissionAskPrompt(displayName, noradId, tle);
    setAskPrefill({ mode: "chat", text, autoSend: true });
    void navigate({ to: "/ask" });
  };

  return (
    <div className="sat-detail-grid" style={{ marginTop: 18 }}>
      <div className="glass glass-card side-card">
        <div className="side-item-top">
          <h3>{isDebris ? "Fragmentation debris" : "Mission profile"}</h3>
          {sat?.website ? (
            <a
              href={sat.website}
              target="_blank"
              rel="noopener noreferrer"
              className="detail-link"
              style={{ marginTop: 0 }}
            >
              Official mission site
            </a>
          ) : null}
        </div>

        {isDebris && debrisEvent ? (
          <>
            <div className="debris-event-banner">
              <span className="badge badge-warning">Debris</span>
              <span className="debris-event-name">{debrisEvent.event}</span>
            </div>
            <p className="profile-lede">{debrisEvent.detail}</p>
            <div className="detail-rows">
              <DetailCell label="Event date" value={debrisEvent.date} />
              <DetailCell label="Debris altitude" value={debrisEvent.altKm} />
              <DetailCell label="Origin" value={debrisEvent.event} />
            </div>
            <p className="detail-note">
              This object is a tracked fragment from a fragmentation event. Orbital debris
              is catalogued and tracked by the 18th Space Defense Squadron; elements are
              published via CelesTrak.
            </p>
          </>
        ) : profilePending ? (
          <p className="detail-note">Loading the community mission record.</p>
        ) : sat ? (
          <>
            {sat.image ? (
              <div className="profile-figure">
                <SkeletonImage
                  src={sat.image}
                  className="profile-img"
                  alt={displayName + " spacecraft"}
                  hideOnError
                />
              </div>
            ) : null}
            <p className="profile-lede">{writeUp}</p>
            <div className="detail-rows">
              {cleanField(sat.operator, 80) ? (
                <DetailCell label="Operator" value={cleanField(sat.operator, 80)} />
              ) : null}
              {cleanField(sat.countries, 80) ? (
                <DetailCell
                  label="Countries"
                  value={cleanField(sat.countries, 80).replace(/,/g, ", ")}
                />
              ) : null}
              {cleanField(sat.status, 40) ? (
                <DetailCell
                  label="Status"
                  value={
                    cleanField(sat.status, 40).charAt(0).toUpperCase() +
                    cleanField(sat.status, 40).slice(1)
                  }
                />
              ) : null}
              {fmtDate(sat.launched) ? (
                <DetailCell label="Launched" value={fmtDate(sat.launched)!} />
              ) : null}
              {fmtDate(sat.deployed) ? (
                <DetailCell label="Deployed" value={fmtDate(sat.deployed)!} />
              ) : null}
              {fmtDate(sat.decayed) ? (
                <DetailCell label="Reentered" value={fmtDate(sat.decayed)!} />
              ) : null}
            </div>
          </>
        ) : (
          <div className="profile-empty">
            <p className="detail-note" style={{ marginBottom: 12 }}>
              No community mission record is published for this object yet. Orbital
              elements and live telemetry above are still complete; many small payloads
              and debris simply have no profile on file.
            </p>
            <p className="detail-note" style={{ marginBottom: 14 }}>
              Stellun AI can still summarize what is publicly known from the catalog name
              and NORAD number.
            </p>
            <button type="button" className="btn btn-primary" onClick={openAskMissionProfile}>
              Ask Stellun AI for a mission profile
            </button>
          </div>
        )}
        <p className="detail-note">Profile maintained by the SatNOGS observer community.</p>
      </div>

      <div className="glass glass-card side-card">
        <div className="side-item-top">
          <h3>Radio transmitters</h3>
          {allTx.length ? (
            <span className="mono" style={{ fontSize: "0.75rem", color: "var(--ink-faint)" }}>
              {allTx.length} on record
            </span>
          ) : null}
        </div>

        {txPending ? (
          <p className="detail-note">Loading transmitter records.</p>
        ) : allTx.length === 0 ? (
          <p className="detail-note">
            No radio transmitter records are published for this object. Crewed stations,
            amateur satellites, and science missions are the best documented.
          </p>
        ) : (
          <>
            <div className="tx-controls">
              <button
                type="button"
                className="tx-toggle"
                aria-pressed={showInactive}
                onClick={() => setShowInactive((v) => !v)}
              >
                {showInactive
                  ? "Showing all records"
                  : "Show " + inactiveCount + " inactive"}
              </button>
            </div>
            {sortedTx.length ? (
              <ul className="tx-list" aria-label="Known radio transmitters for this object">
                {sortedTx.map((tx, i) => (
                  <TransmitterRow key={tx.uuid ?? i} tx={tx} />
                ))}
              </ul>
            ) : (
              <p className="detail-note">
                Every transmitter on record is currently reported inactive.
              </p>
            )}
          </>
        )}
        <p className="detail-note">
          Frequencies are the published downlink and uplink values reported by ground
          observers, useful if you want to listen for this object during a pass.
        </p>
      </div>
    </div>
  );
}
