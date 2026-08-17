const { buildSystemPrompt, REASONING_INSTRUCTIONS } = require('../../src/features/ai/llm/prompts');
const { buildReply } = require('../../src/features/ai/localEngine/templates');

describe('REASONING_INSTRUCTIONS (Phase 5)', () => {
  it('is present in every generated system prompt, regardless of role/persona/memory', () => {
    const prompt = buildSystemPrompt({ role: 'agent', memory: {}, persona: 'some persona text' });
    expect(prompt).toContain(REASONING_INSTRUCTIONS);
  });

  it('is present even with no persona or memory supplied', () => {
    const prompt = buildSystemPrompt({ role: 'customer', memory: {} });
    expect(prompt).toContain(REASONING_INSTRUCTIONS);
  });

  it('names the real breakdown fields this app actually computes, not illustrative placeholders', () => {
    // These are the literal field names from leadScoring.js/priceEstimate.js/
    // computeTrustScore - the model is told to cite these, not invent others.
    for (const realField of ['budgetMatch', 'urgency', 'interest', 'popularity', 'ratePerMarla', 'verified', 'rating', 'reviewCount', 'establishedYear', 'soldProperties']) {
      expect(REASONING_INSTRUCTIONS).toContain(realField);
    }
  });

  it('explicitly forbids the fabricated factors none of this app\'s real scoring computes', () => {
    expect(REASONING_INSTRUCTIONS).toMatch(/confidence.*percentage|fabricated.*confidence/i);
    expect(REASONING_INSTRUCTIONS).toMatch(/comparable sales/i);
    expect(REASONING_INSTRUCTIONS).toMatch(/ROI.*rental yield|rental yield/i);
    expect(REASONING_INSTRUCTIONS).toMatch(/lead volume/i);
  });

  it('states the general grounding rule: only cite numbers already present in a tool result', () => {
    expect(REASONING_INSTRUCTIONS).toMatch(/traceable to a tool result already returned/i);
  });
});

describe('buildReply - grounded bullet formatting (Phase 5)', () => {
  it('explain_lead_score cites only the real breakdown fields, with real numbers, no invented factors', () => {
    const reply = buildReply('explain_lead_score', {
      customer: 'Ali Khan',
      score: 86,
      status: 'hot',
      moveTimeline: 'immediate',
      breakdown: { budgetMatch: 28, urgency: 25, interest: 18, popularity: 15 },
    });

    expect(reply).toContain('Ali Khan scored 86/100 (hot).');
    expect(reply).toContain('Budget match: 28 points');
    expect(reply).toContain('Urgency: 25 points (immediate)');
    expect(reply).toContain('Interest signals: 18 points');
    expect(reply).toContain('Property popularity: 15 points');
    // Never invents a factor this app doesn't track.
    expect(reply).not.toMatch(/whatsapp/i);
    expect(reply).not.toMatch(/visited.*multiple times/i);
    expect(reply).not.toMatch(/confidence/i);
  });

  it('estimate_property_price cites only the real rate/area/premium breakdown, no invented factors', () => {
    const reply = buildReply('estimate_property_price', {
      estimate: 16600000,
      breakdown: {
        city: 'lahore', area: 5, ratePerMarla: 2800000, baseAmount: 14000000,
        bedrooms: 3, bedroomPremium: 300000, bedroomAmount: 900000,
        bathrooms: 2, bathroomPremium: 150000, bathroomAmount: 300000,
      },
    });

    expect(reply).toContain('Estimated price: PKR 1.66 Crore');
    expect(reply).toMatch(/Lahore rate: PKR 28\.00 Lakh per marla x 5 marla/);
    expect(reply).toContain('3 bedrooms: +PKR 9.00 Lakh');
    expect(reply).toContain('2 bathrooms: +PKR 3.00 Lakh');
    // Never invents factors this app's formula doesn't compute.
    expect(reply).not.toMatch(/confidence/i);
    expect(reply).not.toMatch(/comparable/i);
    expect(reply).not.toMatch(/market demand/i);
    expect(reply).not.toMatch(/historical appreciation/i);
  });

  it('estimate_property_price omits bedroom/bathroom lines when there are none, rather than showing a false "0 bedrooms: +PKR 0" line', () => {
    const reply = buildReply('estimate_property_price', {
      estimate: 14000000,
      breakdown: { city: 'lahore', area: 5, ratePerMarla: 2800000, baseAmount: 14000000, bedrooms: 0, bedroomAmount: 0, bathrooms: 0, bathroomAmount: 0 },
    });
    expect(reply).not.toMatch(/bedroom/i);
    expect(reply).not.toMatch(/bathroom/i);
  });

  it('never throws when breakdown is missing (safety net, matches buildReply\'s existing try/catch discipline)', () => {
    expect(() => buildReply('explain_lead_score', { customer: 'Test', score: 50, status: 'warm' })).not.toThrow();
    expect(() => buildReply('estimate_property_price', { estimate: 1000000 })).not.toThrow();
  });

  it('every other REPLIERS entry is completely unchanged by Phase 5', () => {
    expect(buildReply('search_properties', { count: 3 })).toBe('Found 3 properties matching that.');
    expect(buildReply('get_lead_stats', { totalInquiries: 10, hotLeads: 2, averageLeadScore: 55 })).toBe('10 total leads, 2 hot, averaging a score of 55/100.');
    expect(buildReply('move_lead_stage', { newStage: 'closed_won' })).toBe('Moved the lead to "closed won".');
  });
});
