# Investor Pitch — Structure

> This is pre-revenue, portfolio-stage software with no committed pilot customers as of this writing. Every market-size and pricing figure below is a **stated hypothesis for validation**, not sourced research or a forecast — flagged explicitly rather than presented as data, because presenting placeholder numbers as researched figures would be the opposite of the "business understanding" this exercise is meant to demonstrate.

## Problem

Independent real-estate agencies in Pakistan generate leads through listing portals (Zameen, Graana, Lamudi) but manage what happens *after* the inquiry manually — spreadsheets or WhatsApp groups, with no way to tell which of today's ten leads is actually worth calling first. Hot leads go cold from response delay, not from bad leads existing.

## Solution

DreamHomes: a lead-management layer for agencies, with **transparent, explainable lead scoring** (not a black-box AI number) and a **hybrid AI layer** (description generation, natural-language search, follow-up drafting) built on top of that explainable core rather than replacing it.

## Why now

- LLM API costs have dropped enough to make per-lead AI assistance (description drafting, follow-up generation) economically viable at agency price points, which wasn't true two years ago.
- WhatsApp Business API access has matured enough to make a WhatsApp-native notification/digest workflow realistic for a small team to build, which is the channel this specific market actually uses.

## Product

- Explainable lead scoring (budget match, urgency, interest, popularity — visible breakdown per lead).
- Transparent, itemized price estimation, calibrated to five major Pakistani cities.
- Agent dashboard: pipeline, analytics, listings management.
- Roadmap: multi-tenancy, billing, WhatsApp notifications, AI-assisted follow-ups, and a scoring feedback loop that improves accuracy from real outcome data over time (see `AI_Enhancements.md`, `Roadmap.md`).

## Market (hypothesis, not researched — see caveat above)

Target: independent agencies (2–20 agents) in Lahore, Islamabad, Karachi, Rawalpindi, Faisalabad. Sizing this credibly requires actual outreach data (how many agencies exist, how many are currently unmanaged) that does not yet exist — the honest next step is a discovery-call count from the direct-outreach motion in `Marketing.md`, not a top-down TAM slide.

## Business model

Per-agent-seat SaaS pricing with a free tier, gated AI features on paid tiers (AI has real marginal cost; the deterministic core doesn't) — see `Marketing.md` for the tier structure.

## Traction

None yet beyond a working demo and a recorded walkthrough (`DEMO_SCRIPT.md`). The honest ask at this stage is validation (pilot agencies), not funding — a pitch built on fabricated traction numbers would be a bigger risk to credibility than admitting the stage plainly.

## Competitive landscape

See `Marketing.md`'s competitor table and reframe: listing portals (Zameen/Graana/Lamudi) are channels, not competitors; the real competitive set is "no tool at all" or generic CRMs mis-applied to a vertical they don't understand. That gap, correctly named, is the opportunity.

## Team

[Founder background — fill in directly; not something to fabricate on your behalf.]

## The ask

At this stage, the realistic ask is design-partner agencies for a free pilot in exchange for feedback and (eventually) an outcome-data feed for the scoring loop — not capital. A capital ask is premature before that validation exists.
