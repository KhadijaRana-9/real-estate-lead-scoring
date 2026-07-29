# Prioritized Roadmap

Synthesizes `Audit.md`, `Architecture.md`, `Security.md`, `AI_Enhancements.md`, `FutureFeatures.md`, `Marketing.md`, and `GrowthStrategy.md` into sequenced phases. Complexity: S/M/L/XL. Impact and engineering value: Low/Med/High.

## Phase 0 — Security foundation (in progress this session)

| Item | Complexity | Business impact | Engineering value | Why first |
|---|---|---|---|---|
| Whitelist fields on property create/update | S | High | High | Live exploit path today; blocks nothing else, blocked by nothing |
| Zod validation on every route | M | High | High | Prerequisite for trusting any input the rest of the roadmap builds on |
| Rate limiting (auth + general API) | S | Med | High | Cheap, closes brute-force exposure |
| Refresh tokens + revocation | M | High | High | Required before real customer accounts exist |
| Automated test suite (auth/property/inquiry/scoring) | M | High | High | Without this, every later phase risks silent regressions |

**Why this phase blocks everything else:** multi-tenancy, billing, and AI features all mean *more* surface area handling *more* sensitive data. Shipping those before closing Phase 0 would multiply the exposure instead of fixing it.

## Phase 1 — High-leverage, low-complexity wins (0–4 weeks)

| Item | Complexity | Business impact | Engineering value | Why now |
|---|---|---|---|---|
| AI listing description generator | S | High | Med | Fastest visible "AI-native" proof point for a demo/pitch |
| AI natural-language search | S | High | Med | Zero new backend surface, translates to existing query API |
| Dashboard loading-state consistency (skeletons) | S | Med | Low | Cheapest, most visible polish gap identified in the UX audit |
| Optimistic UI on property mutations | S | Med | Med | Directly addresses "feels premium" evaluation criterion |
| Motion token extraction (`motion.config.js`) | S | Low | Med | Small now; expensive to retrofit once more components exist |
| TanStack Query adoption | M | Med | High | Replaces hand-rolled fetch pattern app-wide; unlocks optimistic UI properly |

## Phase 2 — SaaS foundations (1–2 months)

| Item | Complexity | Business impact | Engineering value | Why this phase |
|---|---|---|---|---|
| Multi-tenancy (agencyId on all models, tenant-scope middleware) | L | High | High | Structural — every day this is deferred makes the eventual migration riskier on live data |
| Billing (Stripe or local gateway) + pricing tiers | L | High | Med | Required to charge anyone at all |
| Real image upload (Cloudinary/S3) | M | High | Med | Already self-flagged as a gap in the README; blocks AI image analysis |
| WhatsApp/SMS notifications | M | High | Med | Named as more impactful than email for this specific market |
| Soft-delete on properties | S | Med | Med | Cheap now; prerequisite for the scoring feedback loop's historical accuracy |

## Phase 3 — Differentiation & retention (2–4 months)

| Item | Complexity | Business impact | Engineering value | Why this phase |
|---|---|---|---|---|
| Lead-outcome tracking + scoring feedback loop | M | High (strategic) | High | The single strongest long-term pitch line; needs Phase 2's data volume to be meaningful |
| Weekly digest email/WhatsApp | S | High | Med | Highest retention-per-effort item on the whole roadmap |
| White-labeling (agency logo/colors) | M | Med | Med | Needed to sell multi-agency, not needed for first paying customer |
| Referral program | S | Med | Low | Cheap growth loop once there's a retained customer base to refer from |
| AI follow-up drafting + lead insight summaries | M | Med | Med | Builds directly on Phase 0's validated data + Phase 3's outcome tracking |

## Phase 4 — Operational maturity (ongoing, parallelizable with the above)

| Item | Complexity | Business impact | Engineering value | Why ongoing |
|---|---|---|---|---|
| CI/CD (GitHub Actions: lint/test/build/deploy) | S | Med | High | Should start as soon as Phase 0's test suite exists, not wait for Phase 3 |
| Error monitoring (Sentry) | S | Med | High | Cheap, should land alongside Phase 2 (more surface area = more that can break) |
| Product analytics (PostHog) | S | Med | Med | Needed once there are real users to observe, not before |
| Structured logging + health checks | S | Med | Med | Pairs with Sentry; low effort |
| Docker + caching (Redis) + job queue (BullMQ) | M | Low (now) / High (at scale) | Med | Defer actual implementation until traffic justifies it; design for it now (Architecture.md's target diagram already accounts for this) |

## Sequencing logic, summarized

Security **must** precede multi-tenancy (don't multiply an open vulnerability across tenants). Multi-tenancy **must** precede billing (can't charge per-tenant without tenants). The scoring feedback loop **should** follow real usage volume (Phase 2/3), not precede it — there's no outcome data to learn from on day one. AI *product* features (Phase 1) are intentionally sequenced early because they're cheap, visible, and directly answer the "AI-first" evaluation criterion without waiting on the heavier architectural phases.
