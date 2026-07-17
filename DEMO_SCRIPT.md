# Demo Script (3-5 minutes)

Record your screen at https://real-estate-lead-scoring.vercel.app. Talk
through it like you're explaining your own thinking, not reading a script.
The timings below are a guide, not a stopwatch requirement.

## 0:00-0:20: Intro

> "Hi, I'm Khadija. This is DreamHomes, a real-estate listings portal with
> lead scoring that I built end-to-end: React frontend, Node/Express
> backend, MongoDB database, deployed live. I'll walk through it as a
> customer, then as an agent, then touch on the code and how I built it."

## 0:20-1:00: Customer flow, search and browse

- Show the homepage: point out the real stats row ("these aren't fake
  numbers, that's a live count from the database").
- Search a city (e.g. "Faisalabad") or click a city pill.
- Show filters (price, type) narrowing results.
- Open a property detail page.

> "Search and filters hit the real API with pagination. This isn't loading
> everything at once."

## 1:00-2:00: Inquiry and the lead-scoring smart feature

- Fill out the inquiry form on a property detail page with a realistic
  budget close to the asking price, "Immediately" timeline, and a real
  message.
- Submit it. Show the success card with the animated score ring and
  hot/warm/cold badge (and confetti if it lands "hot").

> "This is the core smart feature: budget match, urgency, message interest,
> and property popularity combine into a 0-100 score with a hot/warm/cold
> label. It's a deterministic formula, not a random number, and I can show
> exactly why a lead scored the way it did."

## 2:00-3:00: Agent dashboard

- Log in as `ahmed.agent@dreamhomes.pk` / `Password123!`.
- Overview tab: stat cards, the three charts (monthly inquiries, lead status
  pie, top properties), and the Recent Activity feed.
- Leads tab: click into the inquiry you just submitted, show the full score
  breakdown (budget/urgency/interest/popularity bars).
- My Listings tab: show "+ Add Property," and the price-estimate helper
  (fill in city/area/bedrooms/bathrooms, click "Estimate Price," show the
  itemized breakdown).

> "The dashboard is scoped to this agent's own properties. An admin account
> would see everything. And the price estimator is the second smart
> feature, also itemized, not a black box."

## 3:00-3:45: Code structure and architecture (brief)

- Switch to the GitHub repo or your editor.
- Show the feature-based backend structure (`auth/`, `property/`, `inquiry/`,
  `dashboard/`, each with model/service/controller/routes) and
  `shared/utils/leadScoring.js`.
- Mention: JWT + role middleware, MongoDB via Mongoose, React/Vite frontend,
  Tailwind v4.

> "Backend's organized by feature rather than by layer, so each domain owns
> its own model, service, controller and routes. The lead-scoring and
> price-estimate logic live as pure functions in `shared/utils`, so they're
> easy to test and easy to point to."

## 3:45-4:30: How it was built and deployment

> "I built this with Claude Code as a pair-programmer, planning the
> architecture and lead-scoring formula first, then implementing the full
> stack, debugging environment issues like a MongoDB/Windows compatibility
> problem, and driving the actual deployment to Vercel with a MongoDB Atlas
> database. That process is written up in BUILD_LOG.md in the repo if you
> want the details, including what broke and what I learned."

- Show BUILD_LOG.md or DESIGN.md briefly if time allows.

## 4:30-5:00: Close

> "Everything you saw is live at [the URL], the code's on GitHub with a full
> commit history and documentation, and both the lead scoring and price
> estimation are real, explainable formulas, not hardcoded numbers. Thanks
> for watching."

## Recording tips

- Use OBS Studio, or Windows' built-in Xbox Game Bar (Win+G) for a quick
  screen recording. Both are free.
- Do one dry run first so the inquiry-submission "hot lead" moment actually
  lands (pick a budget close to the property's price and "Immediately" as
  the timeline beforehand, so you know it'll score hot on camera).
- If you stumble, keep going. A natural take beats a perfect scripted one.
