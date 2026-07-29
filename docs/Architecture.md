# Architecture Audit & Target Design

## Current state (as-is)

```
React + Vite (client)
       │  Axios REST calls (/api/*)
Express (Node.js)
       │  JWT auth middleware → Role (RBAC) middleware
Controllers → Services → Utils (leadScoring, priceEstimate)
       │  Mongoose ODM
    MongoDB
```

Backend is organized **by feature** (`auth`, `property`, `inquiry`, `dashboard`), each owning its own model/service/controller/routes, with `shared/` for cross-cutting middleware and utils. This is the right call at this scale — it's the same shape enterprise Node services converge on, and it's rare for a portfolio project to already have it. Keep this structure; don't flatten it back to `/models`, `/controllers`, `/routes`.

## Backend: what's missing for production

- **No response-shaping layer.** Controllers do `res.json(property)` directly on Mongoose documents (`property.controller.js:24`). It happens to be safe today because no model has a secret field, but there's no structural guarantee against that — the day someone adds `stripeCustomerId` to `User`, it leaks unless someone remembers to scrub it. Add a `toPublic()` / DTO mapper per model, the way `auth.controller.js:4` already does for users (`toPublicUser`) — that pattern should be everywhere, not just auth.
- **No centralized error types.** Errors are built ad hoc (`const err = new Error(...); err.status = 404; throw err;`, repeated in `property.service.js`, `inquiry.service.js`) . Replace with an `AppError` class hierarchy (`NotFoundError`, `ForbiddenError`, `ValidationError`) so `error.js` can branch on type instead of a bolted-on `.status` property, and so validation errors (once Zod lands) serialize consistently.
- **No API versioning.** `/api/properties` should be `/api/v1/properties` before external agencies build integrations against it — breaking changes are free right now and won't be once you have paying customers with webhooks/integrations.
- **No repository layer.** Services call Mongoose models directly. Fine at this scale (don't add a repository abstraction prematurely — that's the kind of premature layering that actually hurts a small codebase); revisit only if you add a second datastore (e.g., Redis cache, read replicas) where the service needs to be datastore-agnostic.
- **No structured logging.** `console.error(err)` in `error.js:6` is the only server-side logging in the whole app. Nothing distinguishes a 404 from a 500 in logs, nothing includes a request ID, nothing is queryable. Minimum bar: `pino` with request-id correlation before this goes to a second real customer.
- **No health/readiness distinction.** `/api/health` (`app.js:17`) returns `ok` unconditionally — it never actually checks the Mongo connection. A DB outage would still show green.

## Database design

- Only one compound index exists (`property.model.js:22`, `{city, price, type}`). Missing:
  - `Inquiry`: no index on `{property, score}` despite `listInquiriesForAgent` sorting by exactly that (`inquiry.service.js:42`) — every agent's lead list currently does a full collection scan once data volume grows.
  - `User.email` gets an index for free from `unique: true` (`auth.model.js:6`) — that one's fine.
- **Hard deletes everywhere.** `deleteProperty` (`property.service.js:76`) permanently removes the document. Once inquiries feed a scoring feedback loop (see AI_Enhancements.md), you need the historical property price/state to explain why an old lead scored the way it did — a deleted property breaks that. Switch to soft-delete (`status: 'archived'`, filtered out of default queries) before that feature lands.
- **No schema for tenancy.** Every model needs an `agencyId`/`tenant` field before multi-tenancy is possible — this is a migration you want to do early, because retrofitting tenant scoping onto live data is the most error-prone migration a SaaS does (miss one query filter and agency A sees agency B's leads).

## Frontend architecture

- **Data fetching is hand-rolled everywhere.** `Home.jsx:19-44` and `AgentDashboard.jsx:36-51` both reimplement the same `loading/error/cancelled` `useEffect` pattern. This isn't a style nitpick — it means there's no shared cache, no request deduplication, and no automatic revalidation after mutations (`AgentDashboard.jsx:56-58` does a full `loadAll()` re-fetch after every single delete instead of updating local state). Introduce **TanStack Query** (React Query): it replaces this whole pattern, gives you cache invalidation on mutation, background refetch, and optimistic updates for free. This is the single highest-leverage frontend architecture change available.
- **No code splitting.** `App.jsx` almost certainly imports every page eagerly (worth confirming) — `AgentDashboard` pulls in Recharts, Framer Motion, and multiple chart components that a customer visitor never needs. Route-level `React.lazy` + `Suspense` is a 30-minute change with a real bundle-size payoff.
- **No shared motion tokens.** Animation durations/delays are magic numbers scattered per component: `duration: 0.25` (`PropertyCard.jsx:21`), `delay: 0.15`, `duration: 1.4` (`Home.jsx:89,95`). Extract a `motion.config.js` (`{ fast: 0.15, base: 0.25, slow: 0.4 }` + shared easing curve) — this is exactly the kind of detail that reads as senior engineering vs. "AI-generated CRUD app," because it shows the animation system was designed, not sprinkled.
- **Context-only state management is fine today** (`AuthContext.jsx`) but won't survive real-time features (live lead notifications, WhatsApp status) — that's a Phase 2+ concern, not now; don't add Redux/Zustand preemptively.

## Scalability & operations (DevOps folded in here)

- No Docker — `docker-compose.yml` with app + Mongo + Redis (once added) would make onboarding a new contributor a `docker compose up` instead of a multi-step README.
- No caching layer — the dashboard summary (`dashboard.service.js`, not yet audited in depth) likely re-aggregates on every request; a Redis cache with short TTL is the standard fix once traffic is real.
- No background job runner — the roadmap's "digest emails" and "scoring feedback loop" both need async, scheduled work. Introduce **BullMQ + Redis** when those features land rather than cron-in-process, which doesn't survive serverless deploys (this app is on Vercel per `vercel.json`).
- No graceful shutdown in `server.js` — worth a 10-line fix (`process.on('SIGTERM', ...)`) so in-flight requests aren't dropped on redeploy.

## Target architecture (multi-tenant SaaS shape)

```
React (client, per-tenant theming)
       │
TanStack Query cache ── Axios (access token, auto-refresh)
       │
Express API (/api/v1/*)
       │
Auth (short-lived JWT) → Tenant-scope middleware → RBAC
       │
Controllers → Services → AppError types
       │
Mongoose (all queries tenant-scoped by default)
       │
MongoDB ── Redis (cache + BullMQ queues)
       │
Background workers (digest emails, score re-weighting, WhatsApp)
```

This is a straight evolution of what exists today, not a rewrite — the feature-based backend structure and the deterministic scoring/pricing core survive unchanged; what's added is validation, tenancy, caching, and a job runner around them.
