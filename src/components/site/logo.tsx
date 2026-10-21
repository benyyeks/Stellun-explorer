// STELLUN brand lockup: PNG icon + PNG wordmark, light/dark auto-swap.
// Files in /public:
//   stellun-icon-light.png, stellun-icon-dark.png
//   stellun-wordmark-light.png, stellun-wordmark-dark.png

/** Orbital mark (square PNG). Swaps with light / dark theme. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <span className={`brand-mark-img ${className ?? ""}`} aria-hidden="true">
      <img
        src="/stellun-icon-light.png"
        alt=""
        className="brand-mark-light"
        width={3000}
        height={1000}
      />
      <img
        src="/stellun-icon-dark.png"
        alt=""
        className="brand-mark-dark"
        width={3000}
        height={1000}
      />
    </span>
  );
}

/** STELLUN lettering (wide PNG). Swaps with light / dark theme. */
export function BrandWord() {
  return (
    <span className="brand-word-img" role="img" aria-label="Stellun">
      <img
        src="/stellun-wordmark-light.png"
        alt=""
        className="brand-word-light"
        width={40900}
        height={80}
      />
      <img
        src="/stellun-wordmark-dark.png"
        alt=""
        className="brand-word-dark"
        width={40900}
        height={80}
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
