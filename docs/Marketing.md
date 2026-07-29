# Marketing Strategy

> Numbers in this document (pricing, conversion assumptions) are **stated hypotheses to validate**, not researched market data. Treat every `$`/`PKR` figure here as a starting point for a pricing experiment, not a forecast.

## Positioning

**"The real-estate CRM that shows its work."**
Every competing lead tool either doesn't score leads at all, or does it as an opaque number. DreamHomes' scoring breakdown (`budgetMatch`, `urgency`, `interest`, `popularity` — visible per lead) is a real, demonstrable difference, not a marketing claim — it's a screenshot away from proof in any demo. Lead with that in every piece of collateral.

## Ideal customer profile

Independent real-estate agencies (roughly 2–20 agents) in **Lahore, Islamabad, Karachi, Rawalpindi, Faisalabad** — the exact five cities already calibrated in `priceEstimate.js`. Reasoning: the product already has real, localized data for these markets, which is a credible reason to start there rather than an arbitrary choice. Avoid enterprise agencies initially (longer sales cycles, procurement overhead) and avoid solo agents (too price-sensitive to sustain a per-agent-seat model).

## The competitor reframe (see `FutureFeatures.md` for the full table)

Zameen/Graana/Lamudi are **listing portals**, not lead-management CRMs — they're closer to a distribution channel and referral source than a head-to-head competitor. The real competitive set is "nothing" (spreadsheets, WhatsApp groups) or generic CRMs mis-applied to real estate. Positioning against the correct category matters — pitching "we beat Zameen" would be pitching the wrong fight.

## Go-to-market

1. **Direct outreach** to agencies already listing on Zameen/Graana/Lamudi — their contact info is public, and the pitch is concrete: *"you're already generating leads on Zameen; here's what happens to them after the inquiry, and how you're currently losing the hot ones."*
2. **LinkedIn outreach** to agency owners/principals — decision-makers for a 2–20 agent shop are usually reachable directly, no gatekeeper.
3. **Free trial / freemium tier** — cap at 1 agent seat and N listings, remove signup friction entirely (no credit card at signup).
4. **Reuse existing assets** — the demo video and `DEMO_SCRIPT.md` already exist; don't rebuild this from scratch, just point outreach at it.
5. **SEO/content marketing** around "real estate CRM Pakistan," "lead scoring for agents," and — genuinely differentiated — "why is my Zameen lead not converting" style long-tail terms that a frustrated agent might actually search.
6. **Dogfooding as marketing**: the marketing site's own "book a demo" form should run through the product's actual inquiry/lead-scoring pipeline. Every prospect who fills it out experiences the product before you've said a word — this is a genuinely strong idea from the original brief and should be built early, not as an afterthought.

## Landing page recommendations

A dedicated marketing site (separate deploy from the app itself) needs, minimum: the positioning statement above front and center, a live/interactive scoring-breakdown demo (not a screenshot — let a visitor submit a fake inquiry and watch it get scored), the existing demo video embedded, and a "Book a Demo" form wired to the dogfood pipeline above.

## Pricing (hypothesis, to validate — not a forecast)

- **Free**: 1 agent, capped listings, DreamHomes branding on public pages.
- **Growth** (per-agent monthly): unlocks unlimited listings, WhatsApp notifications, removes branding.
- **Agency** (flat + per-agent): white-labeling, AI features (description generator, follow-up drafting), priority support.

Gate AI features specifically behind a paid tier — they have a real marginal cost (LLM API calls) unlike the deterministic core, so tying them to monetization is both a natural upsell and financially sound (don't give away a cost-bearing feature for free indefinitely).

## Channel priority (given a two-person/solo team and no ad budget)

Direct outreach and LinkedIn > content/SEO > paid ads. Direct outreach converts faster with zero cost-per-lead; content/SEO compounds but takes months to pay off; paid acquisition isn't worth testing until pricing is validated by the first cohort of direct-outreach customers.
