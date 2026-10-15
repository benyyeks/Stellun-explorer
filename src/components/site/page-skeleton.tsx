// Page-level skeleton screens. Each page gets a skeleton that outlines its
// real section layout (hero, stat cards, tables, 3D scene, sidebar) while
// data and the 3D engines boot in the background. Skeletons announce
// themselves to assistive tech via role="status" and render no fake content.
import type { CSSProperties, ReactNode } from "react";

function Sk({ className = "", style }: { className?: string; style?: CSSProperties }) {
  return <div className={`ps ${className}`} style={style} aria-hidden="true" />;
}

function Status({ label, children, className = "" }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={className} role="status" aria-busy="true" aria-label={label}>
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}

// ------------------------------ Primitives ---------------------------------

export function PageHeroSkeleton() {
  return (
    <div className="page-hero" aria-hidden="true">
      <Sk className="ps-eyebrow" />
      <Sk className="ps-title" />
      <Sk className="ps-line" style={{ width: "84%" }} />
      <Sk className="ps-line" style={{ width: "62%" }} />
    </div>
  );
}

export function StatGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="stat-grid" style={{ marginBottom: 24 }} aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <div className="glass glass-card stat-card ps-card" key={i}>
          <Sk className="ps-stat-label" />
          <Sk className="ps-stat-value" />
          <Sk className="ps-stat-unit" />
          <Sk className="ps-stat-note" />
        </div>
      ))}
    </div>
  );
}

export function PanelSkeleton({ lines = 4 }: { lines?: number }) {
  return (
    <div className="glass glass-card scaffold-card ps-card" aria-hidden="true">
      <Sk style={{ width: "38%", height: 20, borderRadius: 8 }} />
      {Array.from({ length: lines }, (_, i) => (
        <Sk className="ps-line" key={i} style={{ width: `${88 - i * 12}%` }} />
      ))}
    </div>
  );
}

export function CardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="news-grid" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <div className="news-card" key={i}>
          <Sk className="ps-card-media" />
          <div className="ps-card-body">
            <Sk className="ps-badge" />
            <Sk className="ps-line" style={{ width: "92%" }} />
            <Sk className="ps-line" style={{ width: "70%" }} />
            <Sk className="ps-line" style={{ width: "40%" }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="glass glass-card scaffold-card" aria-hidden="true">
      <Sk style={{ width: "34%", height: 20, borderRadius: 8, marginBottom: 6 }} />
      <Sk className="ps-line" style={{ width: "72%", marginBottom: 14 }} />
      <div className="ps-table">
        {Array.from({ length: rows }, (_, i) => (
          <div className="ps-table-row" key={i}>
            <Sk className="ps-line" style={{ width: "80%" }} />
            <Sk className="ps-line" style={{ width: "65%" }} />
            <Sk className="ps-line" style={{ width: "55%" }} />
            <Sk className="ps-line" style={{ width: "60%" }} />
            <Sk className="ps-line" style={{ width: "75%" }} />
            <Sk className="ps-line" style={{ width: "50%" }} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function DetailRowsSkeleton({ cells = 5, label }: { cells?: number; label?: string }) {
  const body = (
    <div className="ps-detail-rows" aria-hidden="true">
      {Array.from({ length: cells }, (_, i) => (
        <div className="ps-detail-cell" key={i}>
          <Sk className="ps-stat-label" />
          <Sk className="ps-detail-value" />
        </div>
      ))}
    </div>
  );
  return label ? <Status label={label}>{body}</Status> : body;
}

export function MapSkeleton({ label }: { label: string }) {
  return (
    <Status label={label}>
      <Sk className="ps-map" />
    </Status>
  );
}

export function PhotoGridSkeleton({ count = 6, label }: { count?: number; label?: string }) {
  const body = (
    <div className="mars-photo-grid" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <Sk className="ps-photo" key={i} />
      ))}
    </div>
  );
  return label ? <Status label={label}>{body}</Status> : body;
}

// ------------------------------ 3D scenes ----------------------------------

// Orbiting-dots glyph used inside scene skeletons and boot overlays; echoes
// the landing page orbit diagram so the boot state feels on-brand.
export function OrbitBootGlyph() {
  return (
    <svg viewBox="0 0 200 200" className="ps-globe-svg" aria-hidden="true">
      <circle cx="100" cy="100" r="88" className="ps-orbit-ring" />
      <circle cx="100" cy="100" r="64" className="ps-orbit-ring" />
      <circle cx="100" cy="100" r="42" className="ps-orbit-core" />
      <g className="ps-orbit-spin">
        <circle cx="100" cy="12" r="3.4" className="ps-orbit-dot" />
      </g>
      <g className="ps-orbit-spin ps-orbit-spin-rev">
        <circle cx="164" cy="100" r="2.6" className="ps-orbit-dot-faint" />
      </g>
    </svg>
  );
}

// Absolute overlay that covers the scene canvas while the 3D engine boots.
export function SceneBootOverlay({ label }: { label: string }) {
  return (
    <div className="ps-scene-overlay" role="status" aria-label={label}>
      <span className="sr-only">{label}</span>
      <OrbitBootGlyph />
      <p className="ps-scene-caption mono" aria-hidden="true">
        {label}...
      </p>
    </div>
  );
}

function SidebarCardSkeleton({ rows }: { rows: number }) {
  return (
    <div className="glass glass-card side-card ps-card" aria-hidden="true">
      <Sk style={{ width: "44%", height: 16, borderRadius: 7 }} />
      {Array.from({ length: rows }, (_, i) => (
        <div className="ps-side-row" key={i}>
          <Sk className="ps-line" style={{ width: "52%" }} />
          <Sk className="ps-line" style={{ width: "30%" }} />
        </div>
      ))}
    </div>
  );
}

// Full scene-layout skeleton: canvas outline with HUD chips and the orbit
// glyph, plus sidebar cards. Used on first boot of the 3D pages.
export function SceneSkeleton({ label, chips = 6 }: { label: string; chips?: number }) {
  return (
    <Status label={label} className="scene-layout">
      <div className="ps-scene-canvas" aria-hidden="true">
        <div className="ps-hud-row">
          {Array.from({ length: chips }, (_, i) => (
            <span className="ps-hud-chip" key={i} />
          ))}
        </div>
        <OrbitBootGlyph />
        <p className="ps-scene-caption mono">{label}...</p>
        <span className="ps-scene-hintbar" />
      </div>
      <div className="scene-side" aria-hidden="true">
        <SidebarCardSkeleton rows={4} />
        <SidebarCardSkeleton rows={3} />
        <SidebarCardSkeleton rows={6} />
      </div>
    </Status>
  );
}

// --------------------------- Detail page skeleton ---------------------------

function DetailCardSkeleton({ cells, withMedia = false }: { cells: number; withMedia?: boolean }) {
  return (
    <div className="glass glass-card side-card ps-card" aria-hidden="true">
      <Sk style={{ width: "42%", height: 16, borderRadius: 7 }} />
      {withMedia ? <Sk style={{ width: "100%", aspectRatio: "4 / 3", borderRadius: 12 }} /> : null}
      <div className="ps-detail-rows">
        {Array.from({ length: cells }, (_, i) => (
          <div className="ps-detail-cell" key={i}>
            <Sk className="ps-stat-label" />
            <Sk className="ps-detail-value" />
          </div>
        ))}
      </div>
      <Sk className="ps-line" style={{ width: "88%" }} />
      <Sk className="ps-line" style={{ width: "64%" }} />
    </div>
  );
}

export function DetailPageSkeleton({ label = "Loading object details" }: { label?: string }) {
  return (
    <Status label={label}>
      <div className="sat-detail-grid">
        <DetailCardSkeleton cells={0} withMedia />
        <DetailCardSkeleton cells={6} />
      </div>
      <div className="sat-detail-grid" style={{ marginTop: 18 }}>
        <DetailCardSkeleton cells={8} />
        <DetailCardSkeleton cells={8} />
      </div>
    </Status>
  );
}

// --------------------------- Composed page shells ---------------------------

export function LaunchListSkeleton() {
  return (
    <>
      <div className="glass glass-card next-launch ps-card" aria-hidden="true">
        <Sk className="ps-banner" />
        <div className="ps-card-body" style={{ padding: 22 }}>
          <Sk className="ps-badge" />
          <Sk style={{ width: "55%", height: 24, borderRadius: 9 }} />
          <Sk className="ps-line" style={{ width: "88%" }} />
          <Sk className="ps-line" style={{ width: "76%" }} />
          <div className="ps-countdown">
            {Array.from({ length: 4 }, (_, i) => (
              <Sk key={i} style={{ width: 64, height: 54, borderRadius: 10 }} />
            ))}
          </div>
        </div>
      </div>
      <div className="launch-list" style={{ marginTop: 32 }} aria-hidden="true">
        {Array.from({ length: 4 }, (_, i) => (
          <div className="glass glass-card launch-row" key={i}>
            <Sk className="ps-thumb" />
            <div className="launch-row-body ps-card" style={{ flex: 1 }}>
              <Sk className="ps-line" style={{ width: "34%" }} />
              <Sk className="ps-line" style={{ width: "68%" }} />
              <Sk className="ps-line" style={{ width: "52%" }} />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

export function LandingSkeleton() {
  return (
    <main className="page-main">
      <Status label="Loading STELLUN">
        <section className="hero">
          <div className="container hero-grid" aria-hidden="true">
            <div>
              <Sk className="ps-pill" />
              <Sk className="ps-title" style={{ height: 44, width: "min(380px, 80%)" }} />
              <Sk className="ps-line" style={{ width: "92%" }} />
              <Sk className="ps-line" style={{ width: "80%" }} />
              <Sk className="ps-line" style={{ width: "58%" }} />
              <div className="ps-actions">
                <Sk style={{ width: 168, height: 42, borderRadius: 999 }} />
                <Sk style={{ width: 168, height: 42, borderRadius: 999 }} />
              </div>
            </div>
            <Sk className="ps-hero-orbit" />
          </div>
        </section>
        <section className="tight">
          <div className="container" aria-hidden="true">
            <div className="overview-strip glass">
              {Array.from({ length: 4 }, (_, i) => (
                <div className="overview-item" key={i}>
                  <Sk className="ps-stat-value" style={{ width: "70%", margin: "0 auto" }} />
                  <Sk className="ps-stat-unit" style={{ width: "80%", margin: "6px auto 0" }} />
                </div>
              ))}
            </div>
          </div>
        </section>
        <section>
          <div className="container" aria-hidden="true">
            <div className="section-head">
              <Sk className="ps-eyebrow" />
              <Sk style={{ width: "min(320px, 60%)", height: 26, borderRadius: 9, marginTop: 8 }} />
            </div>
            <div className="explore-grid">
              {Array.from({ length: 8 }, (_, i) => (
                <div className="glass glass-card explore-card ps-card" key={i}>
                  <Sk style={{ width: 34, height: 34, borderRadius: 9 }} />
                  <Sk className="ps-line" style={{ width: "55%" }} />
                  <Sk className="ps-line" style={{ width: "88%" }} />
                </div>
              ))}
            </div>
          </div>
        </section>
        <section>
          <div className="container" aria-hidden="true">
            <div className="section-head">
              <Sk className="ps-eyebrow" />
              <Sk style={{ width: "min(340px, 62%)", height: 26, borderRadius: 9, marginTop: 8 }} />
            </div>
            <CardGridSkeleton count={6} />
          </div>
        </section>
      </Status>
    </main>
  );
}
