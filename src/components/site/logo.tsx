// Icon = PNG. Wordmark = text (no image background) so glass header shows through.

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

/**
 * Text wordmark — rectangular lockup, no PNG plate.
 * "G" uses a crescent accent via CSS (matches brand idea without a boxed image).
 */
export function BrandWord() {
  return (
    <span className="brand-word-text" aria-label="Stellun">
      <span className="brand-word-letters">
        STELLUN
        <span className="brand-word-crescent" aria-hidden="true" />
      </span>
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
