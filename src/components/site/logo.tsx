// STELLUN brand lockup: PNG icon + transparent PNG wordmark (your designed lettering + U orbit).
// Light wordmark = dark letters (for light header).
// Dark wordmark = light letters (for dark mode / navy panels).

/** Orbital mark (square). */
export function LogoMark({ className }: { className?: string }) {
  return (
    <span className={`brand-mark-img ${className ?? ""}`} aria-hidden="true">
      <img
        src="/stellun-icon-light.png"
        alt=""
        className="brand-mark-light"
        width={80}
        height={80}
        decoding="async"
      />
      <img
        src="/stellun-icon-dark.png"
        alt=""
        className="brand-mark-dark"
        width={80}
        height={80}
        decoding="async"
      />
    </span>
  );
}

/** Designed STELLUN wordmark — rectangular, transparent background only. */
export function BrandWord() {
  return (
    <span className="brand-word-img" role="img" aria-label="Stellun">
      <img
        src="/stellun-wordmark-light.png"
        alt=""
        className="brand-word-light"
        width={785}
        height={160}
        decoding="async"
      />
      <img
        src="/stellun-wordmark-dark.png"
        alt=""
        className="brand-word-dark"
        width={754}
        height={160}
        decoding="async"
      />
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
