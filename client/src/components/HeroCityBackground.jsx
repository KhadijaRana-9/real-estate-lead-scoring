// Homepage hero background only - isolated, presentational, no business
// logic. Built on the real photograph Home.jsx's hero already used (a
// verified Unsplash night skyline-over-water shot), not a hand-drawn
// illustration - a real photo is the only way to get genuinely
// realistic buildings/windows/water without an image-generation tool,
// which this project doesn't have access to. Everything on top of it
// (the green/gold color grade, the aurora glow, the water shimmer) is a
// CSS layer - see .hero-city-photo/.hero-aurora-tint/.hero-aurora-glow/
// .hero-water-shimmer in index.css for the day/night variants and
// keyframes. Reuses the existing `.dark` class theme mechanism (Navbar's
// useDarkMode) - no new toggle.
export default function HeroCityBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="hero-city-photo absolute inset-0 bg-cover bg-center bg-no-repeat" />
      <div className="hero-aurora-tint absolute inset-0" />
      <div className="hero-aurora-glow absolute inset-0" />
      <div className="hero-water-shimmer absolute inset-x-0 bottom-0 h-[32%]" />
      {/* Readability scrim - lighter in light mode (dark text needs a
          pale backdrop), darker in dark mode. Tuned lighter than the
          previous version now that the photo itself is brighter/less
          darkened in light mode, so the aurora tint stays visible
          through it instead of being washed out. */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/40 via-white/25 to-white/50 dark:from-black/50 dark:via-black/30 dark:to-black/55" />
    </div>
  )
}
