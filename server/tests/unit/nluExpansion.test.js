const { extractPriceRange, extractBedrooms, detectUnsupportedFilters } = require('../../src/features/ai/localEngine/entities');
const { matchIntent } = require('../../src/features/ai/localEngine/matcher');
const { buildReply } = require('../../src/features/ai/localEngine/templates');
const { TOOL_INTENTS } = require('../../src/features/ai/localEngine/toolIntents');

const ALL_TOOLS = TOOL_INTENTS.map((i) => i.tool);

function scoreOf(message) {
  return matchIntent(message, ALL_TOOLS);
}

describe('extractPriceRange - expanded natural language coverage', () => {
  it.each([
    ['properties between 2 crore and 8 crore', 20000000, 80000000],
    ['houses from 2 crore to 8 crore', 20000000, 80000000],
    ['homes in the range of 2 to 8 crore', 20000000, 80000000],
    ['listings costing 2-8 crore', 20000000, 80000000],
    ['listings between 3 and 6 crore', 30000000, 60000000],
  ])('parses a real range from "%s"', (message, minPrice, maxPrice) => {
    expect(extractPriceRange(message)).toEqual({ minPrice, maxPrice });
  });

  it.each([
    ['under 5 crore', { maxPrice: 50000000 }],
    ['below 5 crore', { maxPrice: 50000000 }],
    ['maximum 8 crore', { maxPrice: 80000000 }],
    ['above 2 crore', { minPrice: 20000000 }],
    ['over 8 crore', { minPrice: 80000000 }],
    ['minimum 2 crore', { minPrice: 20000000 }],
  ])('parses a single bound from "%s"', (message, expected) => {
    expect(extractPriceRange(message)).toEqual(expected);
  });

  it('"minimum"/"maximum" require a price unit, so they never misfire on a bedroom/area figure', () => {
    expect(extractPriceRange('minimum 4 bedrooms')).toEqual({});
    expect(extractPriceRange('maximum 8 marla')).toEqual({});
  });

  it.each(['around 5 crore', 'approximately 5 crore', 'near 5 crore', 'about 5 crore'])('turns a proximity phrase "%s" into a real band around the stated figure', (message) => {
    const { minPrice, maxPrice } = extractPriceRange(message);
    const target = 50000000;
    expect(minPrice).toBeLessThan(target);
    expect(maxPrice).toBeGreaterThan(target);
    expect(minPrice).toBeGreaterThan(target * 0.8);
    expect(maxPrice).toBeLessThan(target * 1.2);
  });
});

describe('extractBedrooms - expanded coverage and a latent-bug fix', () => {
  it.each([
    ['minimum 3 bedrooms', 3],
    ['at least 4 bedrooms', 4],
    ['more than 5 bedrooms', 5],
    ['4 bedroom houses', 4],
    ['houses with 4 bedrooms', 4],
  ])('extracts the achievable minimum from "%s"', (message, expected) => {
    expect(extractBedrooms(message)).toBe(expected);
  });

  it('extracts only the lower bound of a range (no maxBedrooms parameter exists to apply the upper one)', () => {
    expect(extractBedrooms('between 2 and 4 bedrooms')).toBe(2);
  });

  it.each(['less than 3 bedrooms', 'fewer than 3 bedrooms', 'at most 3 bedrooms', 'maximum 3 bedrooms'])(
    'returns undefined for a pure upper bound "%s" - this is a latent-bug fix: the old bare-number fallback used to extract this as a wrong, backwards minimum',
    (message) => {
      expect(extractBedrooms(message)).toBeUndefined();
    }
  );
});

describe('detectUnsupportedFilters - honest degradation, never silent', () => {
  it('no longer reports an area range as unsupported - search_properties now has a real area filter', () => {
    const notes = detectUnsupportedFilters('Houses in Lahore between 5 and 10 marla under 4 crore');
    expect(notes).toEqual([]);
  });

  it('no longer reports a single-value area filter as unsupported', () => {
    expect(detectUnsupportedFilters('houses larger than 10 marla')).toEqual([]);
  });

  it('reports a bedroom upper bound as unsupported', () => {
    expect(detectUnsupportedFilters('houses with less than 3 bedrooms')).toEqual(['the "fewer than 3 bedrooms" limit']);
  });

  it('reports the dropped upper half of a bedroom range', () => {
    expect(detectUnsupportedFilters('houses between 2 and 4 bedrooms')).toEqual(['the 4-bedroom upper limit']);
  });

  it('reports nothing when every requested filter is achievable', () => {
    expect(detectUnsupportedFilters('houses in Lahore under 5 crore with minimum 3 bedrooms')).toEqual([]);
  });
});

describe('buildReply - surfaces unsupported filters honestly instead of dropping them', () => {
  it('appends a plain-English note when a filter could not be applied', () => {
    const reply = buildReply('search_properties', { count: 5 }, ['the 5-10 marla area range']);
    expect(reply).toBe("Found 5 properties matching that. I couldn't apply the 5-10 marla area range because that filter isn't currently supported.");
  });

  it('joins multiple unsupported notes in readable prose', () => {
    const reply = buildReply('search_properties', { count: 2 }, ['the 5-10 marla area range', 'the "fewer than 3 bedrooms" limit']);
    expect(reply).toContain('the 5-10 marla area range and the "fewer than 3 bedrooms" limit');
  });

  it('is byte-identical to before when there is nothing unsupported (default parameter, no regression)', () => {
    expect(buildReply('search_properties', { count: 5 })).toBe('Found 5 properties matching that.');
  });
});

describe('matchIntent - property search / bedroom price synonym coverage (deterministic)', () => {
  it.each([
    'properties between 2 crore and 8 crore',
    'houses from 2 crore to 8 crore',
    'homes around 5 crore',
    'apartments under 2 crore',
    'flats below 2 crore',
    'villas above 5 crore',
    'listings between 3 and 6 crore',
    'show me houses under 5 crore',
    'show me homes above 4 crore',
    'properties near 5 crore',
    'around 5 crore houses',
    'minimum 4 bedrooms',
    'at least 4 bedrooms',
    '4 bedroom houses',
    'houses with 4 bedrooms',
    'apartments with 3 bedrooms',
  ])('"%s" resolves deterministically to search_properties', (message) => {
    const { intent, score } = scoreOf(message);
    expect(intent?.tool).toBe('search_properties');
    expect(score).toBeGreaterThanOrEqual(9);
  });
});

describe('matchIntent - analytics synonym coverage (deterministic)', () => {
  it.each([
    'cheapest properties', 'cheapest houses', 'lowest priced homes', 'highest priced properties',
    'most expensive houses', 'latest properties', 'newest listings', 'recently added properties',
    'featured listings', 'top viewed properties', 'most viewed houses',
  ])('"%s" resolves deterministically to get_property_analytics', (message) => {
    const { intent, score } = scoreOf(message);
    expect(intent?.tool).toBe('get_property_analytics');
    expect(score).toBeGreaterThanOrEqual(9);
  });
});

describe('matchIntent - business-reasoning queries still escalate (confidence-gated architecture preserved)', () => {
  // "today's priorities" deliberately removed from this list - Phase 4
  // (Agency Admin AI) gave it a real, deterministic, non-invented answer
  // (get_agency_priorities, backed by actual hot-lead/task/appointment
  // data), so it no longer belongs in the "needs LLM reasoning" bucket.
  // The other two are untouched by Phase 4 and correctly still escalate.
  it.each(['which lead should I call first', 'which property needs attention'])(
    '"%s" does not deterministically resolve to a single tool (score below threshold)',
    (message) => {
      const { score } = scoreOf(message);
      expect(score).toBeLessThan(9);
    }
  );
});

describe('matchIntent - no regression on pre-existing phrasing', () => {
  it.each([
    ['houses in Lahore', 'search_properties'],
    ['my leads', 'get_lead_stats'],
    ['hot leads', 'get_lead_stats'],
    ['lead pipeline', 'get_lead_pipeline'],
    ['compare these properties', 'compare_properties'],
    ['trust score for Zameen', 'get_agency_details'],
  ])('"%s" still resolves to %s', (message, expectedTool) => {
    const { intent, score } = scoreOf(message);
    expect(intent?.tool).toBe(expectedTool);
    expect(score).toBeGreaterThanOrEqual(9);
  });

  it('"tell me about property <id>" still resolves to get_property_details, not search_properties (longer trigger wins despite the new "property" keyword)', () => {
    const { intent } = scoreOf('tell me about property 507f1f77bcf86cd799439011');
    expect(intent?.tool).toBe('get_property_details');
  });
});

describe('matchIntent - new CRM trigger coverage', () => {
  it.each(['hot leads', 'warm leads', 'cold leads'])('"%s" resolves deterministically to get_lead_stats', (message) => {
    const { intent, score } = scoreOf(message);
    expect(intent?.tool).toBe('get_lead_stats');
    expect(score).toBeGreaterThanOrEqual(9);
  });

  it('"overdue follow ups" resolves deterministically to get_upcoming_reminders', () => {
    const { intent, score } = scoreOf('overdue follow ups');
    expect(intent?.tool).toBe('get_upcoming_reminders');
    expect(score).toBeGreaterThanOrEqual(9);
  });
});
