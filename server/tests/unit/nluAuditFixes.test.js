const { matchIntent } = require('../../src/features/ai/localEngine/matcher');
const { detectUnsupportedFilters, extractPriceRange, extractAreaRange } = require('../../src/features/ai/localEngine/entities');
const { TOOL_INTENTS } = require('../../src/features/ai/localEngine/toolIntents');

const ALL_TOOLS = TOOL_INTENTS.map((i) => i.tool);

function scoreOf(message) {
  return matchIntent(message, ALL_TOOLS);
}

describe('Production audit fixes - deterministic coverage gaps found via live testing', () => {
  it('"housing" (shares no word-boundary substring with "house") now resolves, combined with a city', () => {
    const { intent, score } = scoreOf('housing in lahore');
    expect(intent?.tool).toBe('search_properties');
    expect(score).toBeGreaterThanOrEqual(9);
  });

  it.each(['apartments in DHA', 'villas in Bahria Town'])('"%s" resolves via the "TYPE in" trigger even for a non-KNOWN_CITIES locality', (message) => {
    const { intent, score } = scoreOf(message);
    expect(intent?.tool).toBe('search_properties');
    expect(score).toBeGreaterThanOrEqual(9);
  });

  it.each(['5 marla houses', '10 marla plots'])('"%s" resolves deterministically and now applies a real area filter (not just honestly flagged as unsupported)', (message) => {
    const { intent, score } = scoreOf(message);
    expect(intent?.tool).toBe('search_properties');
    expect(score).toBeGreaterThanOrEqual(9);
    expect(detectUnsupportedFilters(message).length).toBe(0);
  });

  it('a bare area mention with no qualifier word extracts a real tolerance-band range around the stated figure', () => {
    const range = extractAreaRange('5 marla houses');
    expect(range.areaUnit).toBe('marla');
    expect(range.minArea).toBeLessThan(5);
    expect(range.maxArea).toBeGreaterThan(5);
  });

  it('"luxury homes" routes to the real featured slice (get_property_analytics), not a fabricated search filter', () => {
    const { intent, score } = scoreOf('luxury homes');
    expect(intent?.tool).toBe('get_property_analytics');
    expect(score).toBeGreaterThanOrEqual(9);
  });

  it('"luxury houses under 5 crore" (a real constraint also present) routes to search_properties instead, with luxury honestly flagged as unsupported', () => {
    const message = 'luxury houses under 5 crore';
    const { intent, score } = scoreOf(message);
    expect(intent?.tool).toBe('search_properties');
    expect(score).toBeGreaterThanOrEqual(9);
    expect(detectUnsupportedFilters(message)).toEqual(['the "luxury/premium" tier']);
  });

  it('"featured properties under 5 crore" now correctly routes to search_properties (real price filter) instead of get_property_analytics (which would have silently ignored the price)', () => {
    const { intent, score } = scoreOf('featured properties under 5 crore');
    expect(intent?.tool).toBe('search_properties');
    expect(score).toBeGreaterThanOrEqual(9);
  });

  it.each(['featured houses', 'newest houses', 'latest flats', 'cheapest homes', 'expensive flats', 'featured homes', 'newest flats'])(
    'the generated adjective x noun matrix covers "%s" deterministically (not just the couple of combinations manually tested before)',
    (message) => {
      const { intent, score } = scoreOf(message);
      expect(intent?.tool).toBe('get_property_analytics');
      expect(score).toBeGreaterThanOrEqual(9);
    }
  );

  it('"budget X crore" is now a recognized price ceiling (previously unrecognized by any pattern)', () => {
    expect(extractPriceRange('budget 5 crore')).toEqual({ maxPrice: 50000000 });
    expect(extractPriceRange('my budget is 3 crore')).toEqual({ maxPrice: 30000000 });
  });

  it.each([
    'contact agent about property 507f1f77bcf86cd799439011, my budget is around 8 crore',
    'submit inquiry for property 507f1f77bcf86cd799439011, budget 5 crore',
  ])('a clear contact/inquiry phrase "%s" still wins over search_properties even with price language also present', (message) => {
    const { intent, score } = scoreOf(message);
    expect(intent?.tool).toBe('submit_inquiry');
    expect(score).toBeGreaterThanOrEqual(9);
  });

  it.each(['my favorites', 'show my favourite properties', 'saved properties', 'saved listings'])('"%s" resolves deterministically to get_favorite_properties', (message) => {
    const { intent, score } = scoreOf(message);
    expect(intent?.tool).toBe('get_favorite_properties');
    expect(score).toBeGreaterThanOrEqual(9);
  });

  it('regression: every previously-verified phrase from the original NLU expansion still resolves correctly after all these additional fixes', () => {
    const cases = [
      ['houses in Lahore', 'search_properties'],
      ['properties between 2 crore and 8 crore', 'search_properties'],
      ['cheapest properties', 'get_property_analytics'],
      ['hot leads', 'get_lead_stats'],
      ['compare these properties', 'compare_properties'],
      ['tell me about property 507f1f77bcf86cd799439011', 'get_property_details'],
      ['trust score for Zameen', 'get_agency_details'],
    ];
    for (const [message, expectedTool] of cases) {
      const { intent, score } = scoreOf(message);
      expect(intent?.tool).toBe(expectedTool);
      expect(score).toBeGreaterThanOrEqual(9);
    }
  });

  it('business-reasoning queries are unaffected by any of these additions and still escalate', () => {
    // "today's priorities" deliberately removed - Phase 4 (Agency Admin
    // AI) gave it a real deterministic answer (get_agency_priorities).
    // See nluExpansion.test.js for the dedicated test of that.
    for (const message of ['which lead should I call first']) {
      expect(scoreOf(message).score).toBeLessThan(9);
    }
  });
});
