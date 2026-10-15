// Shared scaffold for pages whose live-data integration is assembled in a
// later build phase. Renders an honest, on-brand "module under assembly"
// state instead of a blank page, and lists the verified sources that will be
// wired in so the page documents its own provenance.
type ScaffoldProps = {
  title: string;
  tagline: string;
  description: string;
  sources: string[];
  plannedFeatures: string[];
};

export function PageScaffold({
  title,
  tagline,
  description,
  sources,
  plannedFeatures,
}: ScaffoldProps) {
  return (
    <main className="container page-scaffold">
      <section className="page-hero">
        <span className="badge badge-amber">Under assembly</span>
        <h1>{title}</h1>
        <p className="tagline">{tagline}</p>
      </section>
      <section className="glass scaffold-card">
        <p className="lead">{description}</p>
        <div className="scaffold-grid">
          <div>
            <h3>Verified data sources</h3>
            <ul className="source-list">
              {sources.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </div>
          <div>
            <h3>What lands here</h3>
            <ul className="feature-list">
              {plannedFeatures.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          </div>
        </div>
        <p className="scaffold-note">
          This module is completing final verification. STELLUN publishes a
          figure only when it can be traced to a named source, so this view
          opens once its data meets that standard.
        </p>
      </section>
    </main>
  );
}
