// Fixed decorative layers behind the app: perspective grid + scanlines +
// vignette (.av-bg) and film grain (.av-noise). Styles live in globals.css.
export default function ArcadeBackground() {
  return (
    <>
      <div className="av-bg" aria-hidden="true" />
      <div className="av-noise" aria-hidden="true" />
    </>
  );
}
