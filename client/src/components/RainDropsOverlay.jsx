import { useEffect, useRef, useState } from 'react'

// Small, fixed-seed set (same deterministic-pseudo-random approach used
// elsewhere in this codebase, e.g. AmbientBackground.jsx's SPARKLES) -
// ~20 elements total, cheap regardless of how this overlay is sized.
const DROPS = Array.from({ length: 20 }, (_, i) => {
  const seed = (i * 37 + 11) % 100
  return {
    left: ((i / 20) * 100 + (seed % 4)).toFixed(1),
    width: 2 + (seed % 2),
    height: 14 + (seed % 3) * 4,
    duration: 2.4 + (seed % 5) * 0.35,
    delay: (seed % 10) * 0.3,
  }
})

// Confines a very subtle falling-droplet effect to whatever container
// renders this - intended for the "Why Agencies Choose Us" card grid
// only (see Home.jsx), not the whole section or the page. Drops stay
// mounted (cheap, ~20 elements) but only animate while in the
// viewport - IntersectionObserver toggles a class that both fades the
// layer in/out and pauses/resumes the per-drop CSS animation (see
// .rain-drops-layer/.rain-drop in index.css), so nothing is computed
// while scrolled away and the transition in/out is gradual, not a cut.
export default function RainDropsOverlay() {
  const containerRef = useRef(null)
  const [active, setActive] = useState(false)

  useEffect(() => {
    const el = containerRef.current
    if (!el || typeof IntersectionObserver === 'undefined') return undefined

    const observer = new IntersectionObserver(([entry]) => setActive(entry.isIntersecting), { threshold: 0.15 })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={containerRef}
      className={`rain-drops-layer pointer-events-none absolute inset-0 overflow-hidden ${active ? 'rain-drops-active' : ''}`}
    >
      {DROPS.map((d, i) => (
        <span
          key={i}
          className="rain-drop"
          style={{
            left: `${d.left}%`,
            width: `${d.width}px`,
            height: `${d.height}px`,
            animationDuration: `${d.duration}s`,
            animationDelay: `${d.delay}s`,
          }}
        />
      ))}
    </div>
  )
}
