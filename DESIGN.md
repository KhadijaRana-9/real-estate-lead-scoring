# DreamHomes — Design Reference

This document records the information architecture and design system actually
implemented in DreamHomes, plus the reasoning behind it. Where something is a
forward-looking direction rather than shipped code, it's labeled **(future)**
explicitly — this file is a reference to work from, not a marketing brochure.

## 1. Information Architecture

Navigation is role-aware because the app itself is role-aware (JWT + RBAC) —
a static marketing-site nav (Home/About/Contact) would misrepresent what the
product actually is: an authenticated platform with distinct workflows per role.

| Role | Nav items | Why |
|---|---|---|
| **Guest** | Buy · For Agents · About · Login · Sign Up | "Buy" is the core discovery workflow and gets top billing. "For Agents" (→ signup) is the acquisition path for the supply side of the marketplace — every listing exists because an agent signed up. "About" builds trust before someone hands over contact info in an inquiry. |
| **Customer** (logged in, role `customer`) | Buy · For Agents · About + name/logout | Currently identical to guest nav plus an identity indicator. **(future)**: "Saved" (wishlist) and "Profile" are real workflows a customer would want, but wishlist was explicitly descoped for this MVP pass — so the nav doesn't promise a feature that isn't there. Adding a dead "Saved" link would be worse than not having one. |
| **Agent** (role `agent`) | Dashboard · Listings · Leads | These are deep-links into the dashboard's own tabs (`/dashboard`, `/dashboard?tab=My%20Listings`, `/dashboard?tab=Leads`), not separate pages — the underlying data and layout are already unified, so real top-level routes would just be a thinner wrapper around the same component. "Analytics" isn't a separate link because the Overview tab *is* the analytics view; a redundant fourth link would just be noise. |
| **Admin** (role `admin`) | Same as Agent, but data is unscoped (sees all agents' properties/leads, not just their own) | **(future)**: a distinct Users-management and Settings screen is a real admin need, but no user-management backend exists yet (no endpoints to promote/demote/ban a user). Rather than ship "Users"/"Settings" nav items that 404 or show nothing, admin currently rides the same dashboard with a wider data scope, enforced server-side in `dashboard.service.js` / `property.service.js` (`role === 'admin' ? {} : { agent: requester.id }`). |

## 2. Design Tokens

**Color** — `client/src/index.css` `@theme`. A teal→emerald ramp (`brand-50`
through `brand-900`, anchored near `#0f766e`/`#10b981`) rather than a generic
"real-estate green," chosen to read closer to Linear/Stripe/Vercel than to a
property-portal template. Status colors for lead scoring (hot/warm/cold) are a
**separate, fixed** red/orange/blue trio — validated for colorblind-safe
separation and contrast with the project's `dataviz` skill validator, not
picked by eye, and never reused as generic "series" colors elsewhere.

**Typography** — Plus Jakarta Sans for headings (`font-heading`, weights
600–800), Inter for body text (`font-sans`, weights 400–600). Two families,
not four — Jakarta Sans reads as more distinctive than Inter alone for a
hero/H1, Inter stays maximally legible for body copy and form labels.

**Radius** — `rounded-2xl` (1rem) is the default for cards, modals, and
buttons of consequence (CTA buttons); `rounded-lg` (0.5rem) for form inputs
and small buttons. Two steps, not five — consistency over a token for every
possible curve.

**Shadow** — `shadow-sm` at rest, `shadow-lg`/`shadow-xl` on hover for
interactive cards (property cards, stat cards). Flat elsewhere. Shadow is a
hover/interaction signal, not decoration on static content.

**Spacing** — Tailwind's default scale, used consistently: `p-4`–`p-6` inside
cards, `py-16`/`py-20` between page sections, `gap-4`/`gap-6` in grids. No
one-off pixel values.

**Icons** — react-icons, Feather set (`react-icons/fi`) as the default for UI
chrome (nav, search, empty states), Phosphor (`react-icons/pi`) for bed/bath
glyphs, one Font Awesome icon (`FaFire`) where Feather has no equivalent.
Consistency matters more than a single icon pack — the rule is "one pack
unless it's missing the glyph," not "match icons to my mood."

**Layout grid** — `max-w-7xl` container for content pages, `max-w-5xl` for
the property-detail two-column layout, `max-w-md`/`max-w-lg` for auth forms.
Responsive grid steps: 1 column → `sm:` 2 columns → `lg:` 3 columns for card
grids; nav collapses to a hamburger below `md:`.

**Cards** — `rounded-2xl border border-gray-200 shadow-sm` (light) /
`border-gray-800 bg-gray-900` (dark), hover state adds `shadow-xl` + a
`translateY(-6px)` lift via Framer Motion `whileHover`. Stat cards additionally
get a 1px gradient accent bar on the left edge (`bg-gradient-to-b from-brand-400
to-brand-600`) to visually group "this is a metric" without a heavier redesign.

**Forms** — `rounded-lg border border-gray-300 px-3 py-2 text-sm`, inline
error text in `text-red-500` directly under the field via React Hook Form,
no floating labels **(future — not implemented; plain placeholders now)**.

**Buttons** — three tiers, consistently applied: primary (`bg-brand-600
text-white`, solid, for the one action per screen that matters — Search,
Send Inquiry, Sign Up), secondary (`border border-gray-300`, for Cancel/Clear
Filters), ghost/text (`hover:bg-gray-100`, for nav-adjacent actions like
Login or Edit in a table row).

## 3. Homepage

**First five seconds:** a slow, subtle gradient-mesh background (radial
teal/blue blooms behind the hero, `animate-gradient-mesh`, 18s loop) signals
"this is a designed product," not a static template — without being loud or
looping fast enough to distract from the search bar, which stays the visual
anchor. Real numbers (live count of properties/cities/agents, animated via
`CountUpNumber`) sit below the search as a trust indicator — deliberately
**not** the "12,450+ Properties / 98% Satisfied Buyers" style of fabricated
stat that's common in template hero sections; if the count is honestly small
right now, it stays honestly small.

**Search** → popular-city pills → featured listings (skeleton → real cards →
empty state, never a blank gap or a spinner).

## 4. Listings Experience

Filters (city, type, min/max price) sit in one row above the grid, not a
sidebar — the filter set is small enough that a sidebar would be pure
overhead. Pagination is real (9/page, matching the 3-column grid) rather than
infinite scroll, so "page 2 of 4" is always legible. Cards hover-lift + zoom
their image + deepen their shadow — a card is the single most-repeated
element on this page, so its hover state does the most work toward "premium."
Empty/error states are distinct and actionable (clear-filters button on no
results, retry button on network failure) rather than a bare "No data."

## 5. Property Detail

Two-column layout: images + info + description on the left (2/3 width),
sticky-feeling inquiry form on the right (1/3 width) — the inquiry form is
the conversion point, so it stays visible without scrolling past it.
**(future, explicitly deferred)**: multi-image gallery with a fullscreen
modal, a dedicated agent-credibility card, and "related listings" — the
model currently stores an array of image URLs but the UI only surfaces the
first one, and there's no related-listings query yet. On submit, the form
transforms into a success state showing the real computed lead score via
`ScoreRing` (not just a toast) — the score is data the customer's own
inquiry produced, so showing it back to them closes the loop instead of
leaving it agent-side only.

## 6. Agent Dashboard

Tab-based (Overview / Leads / My Listings) rather than a persistent sidebar
**(future: sidebar layout was in the original brief; tabs were kept because
the app currently has three destinations, not the seven-plus that justify a
sidebar's overhead)**. Overview holds: six stat cards (properties, inquiries,
hot leads, avg score, highest-scoring lead, most-viewed property) with a
gradient accent + icon + animated count, three charts (monthly inquiries
line, lead-status pie, top-properties bar — all built against the validated
categorical/status palette, never ad-hoc colors), and a real Recent Activity
feed derived from actual property/inquiry timestamps (property added, inquiry
received, hot lead created) — grouped by Today/Yesterday/date, not a mocked
list. Leads tab shows the full score breakdown (`ScoreRing` + four animated
bars) per lead, so "why is this lead hot" is always one glance away, not
hidden behind a tooltip.

## 7. Motion System

Every animation exists to communicate state, not to decorate:

| Motion | Where | Purpose |
|---|---|---|
| Page fade + 8px slide | Route changes (`AnimatedPage` + `AnimatePresence`) | Signals navigation happened; 0.2s, short enough to never feel like a wait |
| Card fade-in + hover lift | Property cards, stat cards | Entrance on load; lift on hover confirms interactivity before a click |
| Score ring stroke draw | `ScoreRing` | Draws attention to *this specific number* right when it becomes relevant (lead created, inquiry submitted) |
| Progress bar fill | Lead score breakdown | Same purpose at the sub-score level — the four factors visibly "add up" |
| Scale-in success card + confetti | Inquiry submitted (hot leads only) | Confetti is reserved for the hot-lead case specifically, so it stays a signal ("this lead matters") rather than firing on every form submit and becoming noise |
| Count-up | Hero stats, dashboard stat cards | Makes a static number register as "live data," not a hardcoded label |
| Navbar blur/shadow transition | Scroll | Standard scroll-affordance pattern; 300ms, no bounce |

Explicitly **not** implemented: cursor-follow/magnetic buttons, mouse
parallax on the hero, per-mark chart animation beyond load-in — these read as
novelty rather than signal at this app's scale, and every one of them is a
maintenance cost (extra event listeners, extra layout thrash) for a
borderline-perceptible payoff.

## 8. Common Student-Project Mistakes — and How DreamHomes Avoids Them

- **Spinner instead of skeleton.** A bare spinner tells the user "wait," a
  skeleton tells them "this is what's coming." Every list view here renders
  shape-matched skeleton cards, not a spinner.
- **No empty/error states, or one generic "No data."** Every list here has a
  distinct empty message and, where actionable, a real button (Clear
  Filters, Retry) — not a dead end.
- **Colors chosen by eye, inconsistently, per component.** The brand ramp and
  the lead-status trio are defined once as tokens and validated for
  colorblind-safe contrast; nothing downstream picks its own hex.
  Dashboard charts especially: no rainbow palettes, no cycled hues past the
  fixed set, one hue per magnitude series.
- **Fabricated trust signals.** "500+ agents" style stats with no data
  behind them. This app's hero stats hit a real endpoint
  (`/api/dashboard/public-stats`) and show the real count, even when small.
- **Dead links / features implied but not built.** The nav here does not
  promise Saved, Profile, or admin User-management screens that don't exist
  — see the IA table above.
  Every nav item resolves to a real page with real data.
  Author's note: a project that looks 90% done because every icon and label
  exists, but a third of them go nowhere, reads worse under scrutiny than one
  that's honest about a smaller, fully-working surface.
- **Inconsistent spacing/radius/shadow "vibes" per page.** Tokens in section
  2 are applied the same way on every page — the homepage hero and the
  dashboard stat card use the same card radius and shadow scale.
- **No dark mode, or dark mode as an afterthought that breaks contrast.**
  Implemented via a single `dark` class + Tailwind's `@custom-variant`, and
  chart colors carry an explicit dark-mode step (not just a CSS filter)
  because chart contrast against a dark surface is a real, separate
  computation, not "invert and hope."
  Enable it now for a genuinely nice touch — recruiters do look for it, and
  it's already load-bearing here, not bolted on.
- **Commit history of `final`, `fix`, `update`, `final2`.** This repo's
  history uses specific, milestone-scoped messages ("Implement JWT
  authentication," "Add deterministic lead scoring," etc.) — see
  `BUILD_LOG.md` for the reasoning trail behind each one.
- **A README that lists features but not *why* or *how*.** This project's
  README includes the actual lead-scoring formula and price-estimate formula
  with their weights, not just "smart lead scoring" as a bullet point.
