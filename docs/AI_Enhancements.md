# AI Enhancement Audit

## The core design decision, stated up front

`leadScoring.js` and `priceEstimate.js` are deterministic, and the README already brands them as "explainable rather than black boxes." **That is the product's real moat, and the AI strategy below is built to protect it, not replace it.** Bolting a generic LLM chatbot onto this app would actually *destroy* the differentiator — it would make DreamHomes look like every other "AI CRM" that can't explain its own outputs. The correct move is a **hybrid architecture**: the deterministic core stays the trust anchor and system of record; AI is layered on top as an assistive, reviewable, non-authoritative layer. Every recommendation below follows that rule.

**Guardrail that applies to all of the below:** AI never silently overwrites the deterministic score, never auto-sends anything to a customer without a human clicking send, and every AI output is logged so a bad output is debuggable. This is both a trust requirement and a liability one (an AI-drafted message sent to a real customer without review is a support/legal problem waiting to happen).

## Product AI features, prioritized

| Feature | What it does | Complexity | Business impact | Why it fits |
|---|---|---|---|---|
| **AI listing description generator** | Agent fills structured fields (city, type, price, bedrooms) → one LLM call drafts a description in English/Urdu for the agent to edit | S | High | Agents hate writing copy; this is the single fastest perceived "wow" feature for a demo |
| **AI natural-language search** | "3 bed house in Lahore under 2 crore" → LLM parses to the *existing* `/api/properties` query params | S | High | Zero new backend surface — it's a translation layer in front of an endpoint that already exists |
| **AI follow-up message drafting** | Given a lead's score breakdown + message, draft a WhatsApp/email follow-up for the agent to review-and-send | S–M | High | Directly serves the "WhatsApp matters more than email in Pakistan" insight from the original roadmap |
| **AI lead insight summary** | One sentence next to the existing 0–100 score: *"Why this lead matters + suggested next action,"* generated from the same `scoreBreakdown` already computed and stored | S | High | Augments the explainable score instead of replacing it — this is the hybrid model in its purest form |
| **AI image analysis / auto-tagging** | Once real image upload lands (Cloudinary/S3), run vision analysis to detect room type, flag blurry/low-quality photos, generate alt text | M | Medium | Depends on the image-upload feature landing first; real SEO/accessibility value |
| **AI property chat assistant** | Customer-facing chat scoped narrowly to *one property's* structured data (RAG over that property + price-estimate breakdown only) | M | Medium | Deliberately narrow scope avoids hallucinating legal/financial claims — do not let this answer general real-estate-law questions |
| **AI weekly digest narrative** | Turns the dashboard's structured summary numbers into a short narrative ("Inquiries up 20% this week, mostly from Listing X") for the digest email | S | Medium | Pairs directly with the "digest email" retention feature; grounded in real numbers so it can't fabricate stats |
| **AI-assisted price adjustment** | Keep `priceEstimate.js`'s transparent formula as the base explanation; layer a learned "+/- X% market adjustment" once real closed-sale outcome data exists | M–L | Medium (long-term High) | Explicitly *not* a black-box replacement — the itemized breakdown stays, an adjustment factor is added and labeled |
| **AI-assisted score re-weighting** | Once the outcome-feedback field exists (hot lead → did it convert?), an AI/analysis step proposes weight changes for `leadScoring.js` — a human approves before weights actually change | M | High (strategic) | This is the single most defensible pitch line available: *"our scoring provably gets more accurate over time, and you can see exactly why."* |

## What NOT to build (and why)

- **A fully autonomous AI CRM agent that auto-replies to leads.** Real liability and trust risk in a market (real estate) where a wrong promise in a message has financial consequences. Keep a human in the loop on anything customer-facing.
- **Replacing the deterministic score with a raw ML model today.** There's no training data yet (no outcome labels), and doing this before the feedback loop exists would trade a defensible, explainable system for an unverified black box — the opposite of the stated differentiator.

## AI tooling for *building* the product (distinct from product features)

| Tool | Use it for | Why this tool specifically | Sample prompt | Expected output |
|---|---|---|---|---|
| **Claude / Claude Code** | Multi-file refactors, security audits (this document), test generation | Largest practical context window for reasoning across a whole feature slice (model/service/controller/routes together) rather than one file at a time | *"Audit `property.service.js` and `property.controller.js` for mass-assignment and propose a Zod-based fix that preserves current behavior"* | A diff-ready fix plus an explanation of the trust boundary being closed |
| **GitHub Copilot / Cursor** | In-editor autocomplete for mechanical, repetitive code (new Zod schemas that mirror existing Mongoose schemas, new route boilerplate) | Fastest for pattern-completion once the *first* instance of a pattern exists — not for architectural decisions | Inline: start typing `const createPropertySchema = z.object({` and accept the completion | Boilerplate schema matching the existing Mongoose field types |
| **v0 / Lovable / Bolt** | Rapid UI *exploration* for net-new screens (agency onboarding flow, pricing page) before hand-porting into the real Tailwind component system | Fast divergent visual exploration; **not** for production code — treat output as a mockup to reference, not to merge | *"Design a SaaS pricing page with 3 tiers for a real-estate CRM, Tailwind, light/dark"* | A throwaway HTML/React mockup to steal layout ideas from |
| **Figma AI** | Generating design-token variations for the white-label theming system (agency logo/color customization) | Purpose-built for design-system variation generation, which is exactly what white-labeling needs | *"Generate 5 accent-color palettes derived from this base brand color, WCAG AA compliant on white and dark backgrounds"* | Palette variants to feed into the theming system |
| **Perplexity** | Competitor/market research (verifying what Zameen/Graana/Lamudi actually offer today) | Citation-grounded answers matter more than fluency for competitive research — reduces the risk of confidently wrong competitor claims | *"What lead-management features does Zameen.com currently offer to listing agents, with sources"* | Cited feature list to validate or correct `Marketing.md`'s competitor table |
| **Playwright + Claude** | Generating and maintaining E2E tests from real user flows (signup → list property → receive inquiry → view scored lead) | Claude can read the actual page components and generate selectors that match real DOM structure, not guessed ones | *"Write a Playwright test for the flow in `AgentDashboard.jsx`: create a property via the modal, then verify it appears in the My Listings tab"* | A runnable E2E test file |
| **MCP servers (GitHub, Mongo read-only)** | Wiring Claude Code directly into PR review and into a read-only view of real (sanitized/staging) data for debugging | Keeps the AI-assisted workflow inside the actual dev loop instead of copy-pasting context between tools | N/A — infrastructure, not a single prompt | PRs get automated review comments; debugging sessions can query real staging data directly |

This table is itself worth including in a mentor presentation — it directly answers the "AI Tool Usage" evaluation criterion with a *reasoned* tool-per-job mapping instead of "I used ChatGPT for everything."
