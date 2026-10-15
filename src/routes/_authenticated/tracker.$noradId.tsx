import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { satByIdQuery } from "@/lib/sat-queries";
import { parseOMMArray, propagateSat, orbitRegime, type TLE } from "@/lib/satellite";
import { fmtNum, timeAgo, utcClock, utcDateStr } from "@/lib/format";
import { FreshnessBadge } from "@/components/site/freshness-badge";
import { FeedError, EmptyState } from "@/components/site/data-state";
import { DetailPageSkeleton } from "@/components/site/page-skeleton";
import { GroundTrack } from "@/components/tracker/ground-track";
import { ObserverLocationControls, PassForecast } from "@/components/tracker/observer-location";
import { FavButton } from "@/components/tracker/fav-button";
import { ObjectProfile } from "@/components/tracker/object-profile";
import { useFavorites } from "@/lib/favorites";
import { useObserverLocation } from "@/lib/location";
import { useNow } from "@/hooks/use-now";

// Shared detail template for any object in the public satellite catalog.
// One route serves every NORAD catalog number: live telemetry, a rendered
// ground track, pass predictions, and the full orbital element set.

export const Route = createFileRoute("/_authenticated/tracker/$noradId")({
  head: ({ params }) => ({
    meta: [
      { title: `Catalog Object ${params.noradId} - STELLUN` },
      {
        name: "description",
        content: `Live position, ground track, and orbital elements for satellite catalog object ${params.noradId}, propagated from the latest published element set.`,
      },
      { property: "og:title", content: `Catalog Object ${params.noradId} - STELLUN` },
      {
        property: "og:description",
        content: `Live position, ground track, and orbital elements for catalog object ${params.noradId}.`,
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SatelliteDetailPage,
});


function epochDate(jd: number): Date {
  return new Date((jd - 2440587.5) * 86400000);
}

function DetailCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="detail-cell">
      <div className="stat-label">{label}</div>
      <div className="detail-value">{value}</div>
    </div>
  );
}

function SatelliteDetailPage() {
  const { noradId } = Route.useParams();
  const validId = /^\d{1,6}$/.test(noradId);
  const query = useQuery({ ...satByIdQuery(noradId), enabled: validId });
  const now = useNow(1000);
  const favorites = useFavorites();
  const loc = useObserverLocation();

  const tle = useMemo(() => {
    if (!query.data?.data) return null;
    return parseOMMArray(query.data.data)[0] ?? null;
  }, [query.data]);

  const state = now && tle ? propagateSat(tle, now) : null;
  const failed = validId && (query.isError || (query.isSuccess && !query.data.data));

  return (
    <main className="page-main">
      <section className="page-hero">
        <div className="container">
          <span className="eyebrow">
            <Link to="/tracker" className="crumb-link">
              Orbit Tracker
            </Link>
            {` · NORAD catalog ${noradId}`}
          </span>
          <h1 aria-live="polite">{tle ? tle.name : `Catalog object ${noradId}`}</h1>
          <p className="tagline">
            Live position, ground track, and the complete orbital element set for this
            object, propagated in your browser from the latest published elements.
          </p>
        </div>
      </section>

      <section>
        <div className="container">
          {validId && query.isPending ? (
            <DetailPageSkeleton label="Loading element set" />
          ) : failed ? (
            <FeedError
              title="Object details are temporarily unavailable"
              source="the CelesTrak orbital element catalog"
              onRetry={() => query.refetch()}
              retrying={query.isRefetching}
            />
          ) : !validId || !tle ? (
            <EmptyState
              title="Object not found in the current catalog"
              message="This catalog number has no current element set. The object may have reentered, or the number may be incorrect."
            />
          ) : (
            <>
              <div className="sat-detail-grid">
                <div className="glass glass-card side-card">
                  <div className="side-item-top">
                    <h3>Ground track</h3>
                    {query.data ? <FreshnessBadge res={query.data} /> : null}
                  </div>
                  {now ? <GroundTrack tle={tle} now={now} /> : null}
                  <p className="detail-note">
                    One full past orbit and half an orbit ahead. The amber marker is the
                    object's current subpoint over Earth's surface.
                  </p>
                </div>

                <div className="glass glass-card side-card">
                  <div className="side-item-top">
                    <h3>Live telemetry</h3>
                    <span className="side-item-actions">
                      <FavButton
                        isFav={favorites.isFavorite(tle.noradId)}
                        name={tle.name}
                        onToggle={() => favorites.toggle({ noradId: tle.noradId, name: tle.name })}
                      />
                      <span className="mono" style={{ fontSize: "0.75rem", color: "var(--ink-faint)" }}>
                        {now ? `${utcClock(now)} UTC` : "--"}
                      </span>
                    </span>
                  </div>
                  <div className="detail-rows">
                    <DetailCell label="Latitude" value={state ? `${fmtNum(state.lat, 3)}°` : "--"} />
                    <DetailCell label="Longitude" value={state ? `${fmtNum(state.lon, 3)}°` : "--"} />
                    <DetailCell label="Altitude" value={state ? `${fmtNum(state.alt, 1)} km` : "--"} />
                    <DetailCell label="Speed" value={state ? `${fmtNum(state.speed, 2)} km/s` : "--"} />
                    <DetailCell label="Orbit regime" value={orbitRegime(tle)} />
                    <DetailCell label="Period" value={`${fmtNum(tle.periodMin, 2)} min`} />
                  </div>
                  <p className="detail-note">
                    Positions are computed from the element set, not streamed from the
                    spacecraft, and update every second.
                  </p>
                </div>
              </div>

              <div className="sat-detail-grid" style={{ marginTop: 18 }}>
                <div className="glass glass-card side-card">
                  <div className="side-item-top">
                    <h3>Orbital elements</h3>
                  </div>
                  <div className="detail-rows">
                    <DetailCell label="Element epoch" value={utcDateStr(epochDate(tle.epochJD))} />
                    <DetailCell label="Inclination" value={`${fmtNum(tle.inc, 3)}°`} />
                    <DetailCell label="RA of ascending node" value={`${fmtNum(tle.raan, 3)}°`} />
                    <DetailCell label="Eccentricity" value={fmtNum(tle.ecc, 5)} />
                    <DetailCell label="Argument of perigee" value={`${fmtNum(tle.argp, 3)}°`} />
                    <DetailCell label="Mean anomaly" value={`${fmtNum(tle.ma, 3)}°`} />
                    <DetailCell label="Mean motion" value={`${fmtNum(tle.meanMotion, 4)} rev/day`} />
                    <DetailCell label="Element age" value={timeAgo(epochDate(tle.epochJD))} />
                  </div>
                </div>

                <div className="glass glass-card side-card">
                  <div className="side-item-top">
                    <h3>Passes from your location</h3>
                    {loc.location ? (
                      <span className="mono" style={{ fontSize: "0.75rem", color: "var(--ink-faint)" }}>
                        {fmtNum(Math.abs(loc.location.lat), 2)}°{loc.location.lat >= 0 ? "N" : "S"},{" "}
                        {fmtNum(Math.abs(loc.location.lon), 2)}°{loc.location.lon >= 0 ? "E" : "W"}
                      </span>
                    ) : null}
                  </div>
                  <ObserverLocationControls loc={loc} />
                  <PassForecast tle={tle} location={loc.location} />
                </div>
              </div>

              <div className="sat-detail-grid" style={{ marginTop: 18 }}>
                <div className="glass glass-card side-card">
                  <div className="side-item-top">
                    <h3>Orbit profile</h3>
                  </div>
                  <div className="detail-rows">
                    <DetailCell label="Apogee altitude" value={`${fmtNum(tle.apogeeAlt, 0)} km`} />
                    <DetailCell label="Perigee altitude" value={`${fmtNum(tle.perigeeAlt, 0)} km`} />
                    <DetailCell label="Semi-major axis" value={`${fmtNum(tle.a0, 0)} km`} />
                    <DetailCell label="Revolutions per day" value={fmtNum(tle.meanMotion, 2)} />
                    <DetailCell label="NORAD catalog" value={tle.noradId} />
                    <DetailCell label="Regime" value={orbitRegime(tle)} />
                  </div>
                  <Link to="/tracker" className="detail-link">
                    Track this object on the 3D globe
                  </Link>
                </div>
              </div>

              <ObjectProfile noradId={noradId} displayName={tle.name} tle={tle} />

              <p className="scaffold-note" style={{ marginTop: 18 }}>
                Elements source: CelesTrak. Mission and transmitter records: SatNOGS
                community catalog. Propagation uses a Kepler solver with J2 secular
                corrections; short-term accuracy is typically within a few kilometers
                of the true position while elements are fresh.
              </p>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
