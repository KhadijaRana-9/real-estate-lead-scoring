# Growth Strategy

Complements `Marketing.md` (positioning/acquisition) with what happens *after* signup: activation, retention, and loops that grow the product without paid spend.

## Onboarding funnel → first "aha moment"

The real aha moment isn't signup — it's the first time an agent sees a lead arrive **already scored with a visible reason why it matters**. Design onboarding to reach that moment as fast as possible:

1. Signup (existing flow, `auth.controller.js:7-20`).
2. Guided checklist: add first listing → set notification preference → (optional) invite a teammate.
3. **Seed a demo inquiry automatically** on signup, scored against the agent's first real listing, so a new agent sees a hot lead in their dashboard within the first session — don't make them wait for a real customer to trigger the "wow" moment.
4. Nudge toward the next real action once the demo lead is dismissed: "add another listing" or "share your listing link."

## Retention levers, ranked by leverage

1. **Weekly digest (email/WhatsApp)** — *"You had 12 new leads this week, 4 hot."* Highest-leverage single item on the whole roadmap: it's a retention driver (pulls agents back in) **and** a passive marketing artifact (agencies forward internal-performance emails to their own principals, who might not know the product exists yet).
2. **Lead SLA nudges** — *"This hot lead hasn't been contacted in 2 hours"* — turns the scoring system into an active loop instead of a passive dashboard widget, and directly improves the agency's own close rate, which is the actual value proposition.
3. **Monthly scoring-accuracy report** — once the AI feedback loop (`AI_Enhancements.md`) has outcome data, a monthly *"your lead scoring got X% more accurate this month based on your team's outcomes"* email is a uniquely strong retention message — it's a claim no static-weight competitor tool can make.

## Referral / viral loops

- **Agency-to-agency referral**: free month of service for a successful referral — self-serve, no sales involvement needed to execute, and agencies in the same city cluster tend to know each other.
- **Consumer-facing loop**: every public property page is already a shareable landing page. A subtle "powered by DreamHomes" mark plus a WhatsApp share button turns every buyer who shares a listing into a small distribution event for the platform itself — cheap to add, compounds with listing volume.

## Email/message funnel (post-signup)

- Day 0: welcome + onboarding checklist.
- Day 1: tip on getting the most out of lead scoring (drives them back to the dashboard).
- Day 3: *"Did you get your first real lead?"* — nudge if the demo lead hasn't been replaced by a real one yet.
- Day 7: upgrade prompt, but only if they've actually hit a free-tier cap (listing limit) — don't upsell before there's a reason to.

## Content marketing (compounds slower than outreach, but free)

Blog/SEO content built from the product's own price-estimate data (e.g., "What's driving property prices in Lahore this quarter") is simultaneously content marketing *and* a live demonstration of the price estimator — reuse the product as the content engine rather than writing generic thought-leadership.

## What growth work to explicitly defer

Paid acquisition, affiliate programs, and a public API/marketplace are all premature before the first 10–20 paying agencies validate retention. Don't build growth infrastructure for a scale the product hasn't reached — the highest-leverage work right now is the digest email and the demo-seeded onboarding flow, both of which are small builds with outsized effect on activation and retention.
