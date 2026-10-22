// STELLUN brand lockup: orbital mark + text wordmark (no opaque PNG box).

/** Orbital mark (square PNG). Swaps with light / dark theme. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <span className={`brand-mark-img ${className ?? ""}`} aria-hidden="true">
      <img
        src="/stellun-icon-light.png"
        alt=""
        className="brand-mark-light"
        width={64}
        height={64}
        decoding="async"
      />
      <img
        src="/stellun-icon-dark.png"
        alt=""
        className="brand-mark-dark"
        width={64}
        height={64}
        decoding="async"
      />
    </span>
  );
}

/** STELLUN lettering as clear text inside a soft glass pill (no PNG background). */
export function BrandWord() {
  return (
    <span className="brand-word-pill" role="img" aria-label="Stellun">
      <span className="brand-word-text">STELLUN</span>
    </span>
  );
}

export function BrandLockup({ className }: { className?: string }) {
  return (
    <span className={`brand ${className ?? ""}`}>
      <LogoMark className="brand-mark" />
      <BrandWord />
    </span>
  );
}
