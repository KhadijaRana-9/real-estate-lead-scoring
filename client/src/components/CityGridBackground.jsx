// Futuristic city-skyline + perspective grid backdrop for the front/login
// surface. Theme-aware via the existing `.dark` class (Navbar's
// useDarkMode toggle already applies globally - this component adds no
// new toggle, it just responds to the one that exists). Day mode: white
// ground, saturated green lines (kept deliberately un-faint per spec).
// Night mode: near-black ground, the same lines glowing via a blurred
// duplicate layer instead of an expensive per-pixel filter.
//
// Everything here animates only `background-position` on one layer and
// nothing else - no per-frame layout/paint work beyond that single
// compositable property, so it stays cheap even left running
// indefinitely. Respects prefers-reduced-motion (see index.css).
//
// Buildings are plain divs from a small fixed-seed array (same
// "deterministic pseudo-random, stable across re-renders" approach as
// AmbientBackground.jsx's SPARKLES) rather than hand-authored SVG path
// data. A flat solid-tinted rectangle reads as a bar chart, not
// architecture - what actually sells "building" is a window/floor grid
// on the facade (.city-building-facade, index.css) plus varied
// silhouettes: most are simple towers, some get a narrower setback tier
// stacked on top (real skyscraper massing), and a few are thin spike
// towers with a needle antenna, echoing the reference image's tallest
// landmark spires instead of a uniform bar-chart skyline.
const BUILDING_KINDS = ['tower', 'tower', 'setback', 'tower', 'spike', 'setback', 'tower']

const BUILDINGS = Array.from({ length: 30 }, (_, i) => {
  const seed = (i * 47 + 13) % 100
  const seed2 = (i * 83 + 31) % 100
  const seed3 = (i * 131 + 7) % 100
  const kind = BUILDING_KINDS[seed3 % BUILDING_KINDS.length]
  return {
    kind,
    width: kind === 'spike' ? 1.6 + (seed % 2) : 2.4 + (seed % 5),
    height: kind === 'spike' ? 55 + (seed % 35) : 12 + ((seed * 3) % 62),
    spire: kind === 'spike' || seed2 % 4 === 0,
  }
})

export default function CityGridBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden bg-white dark:bg-[#050708]">
      {/* Horizon glow band */}
      <div className="absolute inset-x-0 top-[42%] h-48 -translate-y-1/2 bg-[radial-gradient(ellipse_at_center,color-mix(in_oklab,var(--color-brand-400)_40%,transparent)_0%,transparent_70%)] dark:bg-[radial-gradient(ellipse_at_center,color-mix(in_oklab,var(--color-brand-400)_60%,transparent)_0%,transparent_70%)]" />

      {/* Skyline, sitting on the horizon line - packed dense with a
          slight overlap so buildings read as one continuous silhouette. */}
      <div className="absolute inset-x-0 top-[42%] flex h-96 -translate-y-full items-end justify-center px-[1%]">
        {BUILDINGS.map((b, i) => (
          <div key={i} className="relative -ml-px shrink-0" style={{ width: `${b.width}%`, height: `${b.height}%` }}>
            {b.kind === 'setback' ? (
              <>
                <div className="city-building-facade absolute bottom-0 h-[70%] w-full border-x border-t border-brand-600 bg-white/40 dark:border-brand-300 dark:bg-black/30 dark:shadow-[0_0_18px_2px_rgba(52,211,153,0.4)]" />
                <div className="city-building-facade absolute bottom-[70%] left-1/2 h-[30%] w-[55%] -translate-x-1/2 border-x border-t border-brand-600 bg-white/40 dark:border-brand-300 dark:bg-black/30 dark:shadow-[0_0_18px_2px_rgba(52,211,153,0.4)]" />
              </>
            ) : (
              <div className="city-building-facade h-full w-full border-x border-t border-brand-600 bg-white/40 dark:border-brand-300 dark:bg-black/30 dark:shadow-[0_0_18px_2px_rgba(52,211,153,0.4)]" />
            )}
            {b.spire && (
              <div className="absolute -top-10 left-1/2 h-10 w-px -translate-x-1/2 bg-brand-600 dark:bg-brand-200 dark:shadow-[0_0_10px_2px_rgba(52,211,153,0.75)]" />
            )}
          </div>
        ))}
      </div>

      {/* Perspective grid floor - the "continuously flowing forward"
          element. A tight perspective() value + steep rotateX is what
          actually produces vanishing-point convergence (far lines
          compress together, near lines fan out) - transform-origin sits
          at the top edge (the horizon line above) so that's the point
          lines converge toward. */}
      <div
        className="city-grid-floor absolute inset-x-[-40%] bottom-[-10%] top-[42%]"
        style={{
          maskImage: 'linear-gradient(to bottom, transparent, black 8%, black 96%, transparent)',
          WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 8%, black 96%, transparent)',
        }}
      />

      {/* Soft top fade so the skyline meets the page content above it cleanly */}
      <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-white to-transparent dark:from-[#050708]" />
    </div>
  )
}
