# DreamHomes — Executive Audit

**Scope:** full-stack audit of the current codebase (React/Vite client, Express/MongoDB server) against the bar of "production SaaS thousands of agencies will use," not "student project."
**Method:** every finding below is tied to a real file/line in this repo — nothing here is generic checklist filler.

## Scorecard

| Dimension | Score (1–5) | Why |
|---|---|---|
| Product thinking | 2 | Solid CRUD core with one genuine differentiator (explainable scoring), but no retention, monetization, or multi-tenant plumbing yet — see [FutureFeatures.md](FutureFeatures.md) |
| Architecture | 3 | Clean feature-based backend structure (rare for a project this size to get right); frontend has no data layer, no caching, no code-splitting — see [Architecture.md](Architecture.md) |
| Security | 1.5 | Mass assignment, no validation layer, no rate limiting, no revocation — real, exploitable gaps — see [Security.md](Security.md) |
| AI-readiness | 1 | Zero AI in the product today. The "smart" features are deterministic (which is a feature, not a bug — see below) | 
| UX / motion | 3 | Framer Motion is used with restraint and taste already; dashboard has plain-text loading states and no optimistic UI — see [FutureFeatures.md](FutureFeatures.md) |
| Scalability | 1.5 | Single-tenant, no caching, no queues, no indexes beyond one compound index |
| Automation | 1 | No CI, no tests, no monitoring, no analytics |
| Business understanding | 2.5 | Pricing table already localized to 5 Pakistani cities is a real asset; no billing, no pricing tiers, no ICP articulated until now |

## Top 10 findings, ranked

1. **Mass assignment on properties** — `property.controller.js:32,41` pass raw `req.body` into `Property.create`/`Object.assign`. An agent can PUT arbitrary fields onto their own listing, including `agent` (reassign ownership) and `views`. [Security.md](Security.md)
2. **No input validation layer** — every route trusts the client beyond null checks. [Security.md](Security.md)
3. **JWT never expires meaningfully and can't be revoked** — 7-day token, no refresh/blacklist. [Security.md](Security.md)
4. **No rate limiting anywhere**, including `/auth/login` — brute-forceable. [Security.md](Security.md)
5. **Regex built from unescaped user input** — `property.service.js:10`, `new RegExp(city)` on the public search endpoint. ReDoS/unexpected-match vector. [Security.md](Security.md)
6. **Zero automated tests** — any refactor (including everything else in this audit) is currently unverifiable by anything but manual click-through.
7. **Single-tenant data model** — every collection assumes one agency; there is no `tenant`/`agencyId` field anywhere in the schema.
8. **No AI in the product** — the scoring/pricing engines are deterministic and explainable, which is genuinely good (see AI_Enhancements.md for why this should stay the trust anchor), but there is no AI-assisted layer on top of it anywhere yet.
9. **No production observability** — errors go to `console.error` (`error.js:6`) and nowhere else; no Sentry, no structured logs, no uptime signal beyond a bare `/api/health`.
10. **No CI/CD** — nothing runs lint/tests/build automatically; deploys are manual.

## The framing that matters for this evaluation

Your mentor's claim — "simple CRUD apps are outdated because AI can generate them easily" — is correct about the *code*, and wrong about the *product*. An LLM can absolutely scaffold this exact CRUD app in an hour. What it can't generate for you is:

- A **scoring model whose weights are visible and defensible** (`leadScoring.js`) — that's product judgment, not boilerplate.
- A **security posture built for other people's customer data** — judgment about trust boundaries, not syntax.
- **Multi-tenant, billable SaaS architecture** — a business decision expressed in code.
- An **AI layer that augments an explainable core instead of replacing it with a black box** — see [AI_Enhancements.md](AI_Enhancements.md) for why this hybrid approach is the actual differentiator, both technically and as a pitch against Zameen/Graana-style tools.

The rest of this audit (`Architecture.md`, `Security.md`, `AI_Enhancements.md`, `FutureFeatures.md`, `Marketing.md`, `GrowthStrategy.md`) breaks each dimension down; `Roadmap.md` sequences all of it into phases with complexity/impact estimates.
