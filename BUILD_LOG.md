# Build Log

A chronological account of building DreamHomes — planning, decisions, problems
hit, fixes, and learnings. Kept separate from the README so the README stays a
reference document and this stays a story.

## Planning

Started from a feature wishlist (listings, search, inquiries, agent dashboard,
lead scoring/price estimate) plus a "nice-to-have" list (wishlist, compare,
maps, Cloudinary, charts, pagination, skeletons, toasts, search suggestions).
Rather than build everything at once, scope was split into a **core MVP** pass
(auth, listings CRUD, search/filter, inquiries, dashboard, lead scoring, price
estimate, pagination, skeletons, toasts, responsive UI) with wishlist/compare/
maps/Cloudinary/autosuggest deferred — the judging criteria reward a solid,
well-documented core over a half-finished feature checklist.

Architecture was planned before writing code: a feature-based backend
(`auth/`, `property/`, `inquiry/`, `dashboard/` each owning their own model,
service, controller, routes) instead of one flat `controllers/` + `routes/`
pair, since it scales better as features grow. Lead scoring and price
estimation were deliberately designed as **deterministic, explainable
formulas** with a documented weight breakdown — not random numbers, and not a
black-box ML model that would be hard to justify in a demo.

## Problems & Fixes

- **MongoDB wasn't actually installed.** An early `Get-Command mongod` check
  reported a false positive (a scripting mistake — checking `$?` after `Out-Null`
  reflected the wrong command's exit code). Once caught, MongoDB Community
  Server was installed properly via `winget` and verified with a real
  connection before writing any code that depended on it.
- **Git wasn't installed either**, for the same reason it went unnoticed at
  first — same fix, installed via `winget`.
- **Route ordering in Express**: `/api/properties/:id` would have swallowed
  `/api/properties/mine` and `/api/properties/estimate-price` if declared
  first. Fixed by declaring the specific routes before the `:id` wildcard.
- **Tailwind v4** dropped the old `postcss.config.js` + `tailwind.config.js`
  content-glob setup in favor of a Vite plugin (`@tailwindcss/vite`) and an
  `@import "tailwindcss"` in the stylesheet — simpler, but required checking
  which major version actually shipped before writing config that would have
  been silently ignored.

## Learnings

- Deciding scope *before* writing code (MVP vs. stretch features) avoided the
  classic trap of ending up with five half-built features instead of one
  polished one.
- Persisting the lead-score **breakdown**, not just the total, on the Inquiry
  document made the "explainable scoring" requirement almost free on the
  frontend — the UI just renders fields that were already being computed.
- Validating environment assumptions (is Mongo actually running? is git
  actually installed?) before relying on them saved a much more confusing
  failure later in the build.
