# Build Log

## What was built

DreamHomes — a full-stack MERN real-estate portal: property listings with
create/search/filter, an inquiry flow that captures leads, an agent dashboard
with analytics, and two explainable "smart" features rather than one — a
**deterministic lead-scoring formula** (budget match, urgency, interest,
popularity → 0–100, hot/warm/cold) and an **itemized price estimator**. JWT
auth with three roles (admin/agent/customer), a feature-based Express backend,
a React/Vite frontend with Tailwind v4 and Framer Motion, deployed live on
Vercel (frontend + backend as separate projects, unified behind one domain via
a rewrite) against a MongoDB Atlas database.

## Which AI tools were used, and how

Built end-to-end with **Claude Code** (Anthropic's agentic CLI), used as a
pair-programmer with full read/write/execute access to the project, not just
for autocomplete or isolated snippets. Concretely:

- **Planning first**: before any code, Claude Code was put into plan mode to
  scope the build (MVP vs. stretch features), design the data model, the
  lead-scoring formula, and the API surface — reviewed and approved before
  implementation started.
- **Full-stack implementation**: every backend feature module (auth, property,
  inquiry, dashboard), every React page/component, the Tailwind design tokens,
  and the seed script were written by the agent from the approved plan.
- **Environment setup and debugging**: the agent installed MongoDB and Git via
  winget when it discovered they were missing, diagnosed a MongoDB 8.x/Windows
  DLL incompatibility and fell back to a compatible version, tracked down a
  `react-countup` bundler-interop crash and replaced it with a small custom
  Framer Motion counter, and diagnosed a local DNS SRV-lookup failure during
  Atlas seeding by resolving the standard (non-SRV) connection string manually.
- **Deployment**: the agent adapted the Express app into a Vercel serverless
  function, drove the MongoDB Atlas and Vercel dashboard setup interactively
  (screenshot-by-screenshot, since it has no direct browser control), then
  switched to the Vercel CLI with a personal access token to manage
  environment variables and trigger redeploys directly once that became more
  reliable than click-by-click guidance.
- **Design iteration**: a first UI pass was built and verified, then a second,
  explicitly curated round of polish (animated lead-score ring, confetti
  success state, hero stats, page transitions) was added on top — deliberately
  scoped down from a much larger animation wishlist to avoid churn on an
  already-working app.
- **Documentation**: this file, the README, and a separate `DESIGN.md`
  (information architecture + design-token reference) were all written by the
  agent, reflecting what was actually shipped rather than aspirational copy.

Every step was reviewed in the loop — nothing was merged or deployed
unattended; the human made the scope, deployment-target, and account
decisions, and verified functionality by exercising the running app directly.

## What was learned

- **Deciding scope before writing code** (MVP vs. stretch features, explicitly
  written down and agreed) avoided ending up with five half-built features
  instead of one polished one — and made it easy to say "no, not now" to later
  scope-creep requests without it feeling arbitrary.
- **Persisting the lead-score breakdown**, not just the total, on the Inquiry
  document made "explainable scoring" almost free on the frontend — the UI
  just renders fields that were already being computed and stored.
- **Verify environment assumptions before relying on them.** Both MongoDB and
  Git were assumed installed based on a flawed check early on; the actual gap
  only surfaced once something tried to use them. Cheap to check up front,
  expensive to discover mid-build.
- **Fabricated data is a real trust problem, not just a style choice.**
  Template-style stats ("500+ agents", hardcoded counts) were rejected in
  favor of a real `/api/dashboard/public-stats` endpoint — even when the real
  number is small, it's honest.
- **A dependency can be "correct" and still break your bundler.**
  `react-countup`'s CJS export shape was valid but didn't interop cleanly with
  this project's Vite version; a small custom component using a library
  already in the project (Framer Motion) was more reliable than fighting an
  external package's build output.
- **DNS/SRV connection strings are a real deployment gotcha.** A machine that
  can resolve DNS fine in general can still fail on `mongodb+srv://` lookups;
  falling back to the standard `mongodb://host1,host2,host3/...` form (built
  from the SRV/TXT records directly) is a reliable escape hatch.
