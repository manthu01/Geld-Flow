/**
 * Fixed decorative backdrop — three slow-drifting blurred gradient blobs
 * (pure CSS, see globals.css). Mounted once in the root layout so every
 * page's glass surfaces have something non-flat behind them to blur.
 */
export function AuroraBackground() {
  return (
    <div className="aurora" aria-hidden="true">
      <div className="aurora__blob aurora__blob--1" />
      <div className="aurora__blob aurora__blob--2" />
      <div className="aurora__blob aurora__blob--3" />
    </div>
  );
}
