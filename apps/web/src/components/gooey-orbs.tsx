/**
 * A small liquid brand mark — three blobs continuously drifting and
 * melting into each other via an SVG goo filter (blur + a
 * contrast-boosting feColorMatrix). Purely decorative and non-text, so
 * the blur pass never touches anything that needs to stay legible.
 */
export function GooeyOrbs({ size = 40 }: { size?: number }) {
  return (
    <div className="relative" style={{ width: size, height: size }} aria-hidden="true">
      <svg width="0" height="0" className="absolute">
        <defs>
          <filter id="gooey-orbs-filter">
            <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur" />
            <feColorMatrix
              in="blur"
              mode="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -10"
            />
          </filter>
        </defs>
      </svg>
      <div className="absolute inset-0" style={{ filter: "url(#gooey-orbs-filter)" }}>
        <span className="gooey-orb gooey-orb--1" />
        <span className="gooey-orb gooey-orb--2" />
        <span className="gooey-orb gooey-orb--3" />
      </div>
    </div>
  );
}
