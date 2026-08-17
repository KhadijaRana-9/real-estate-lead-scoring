const { extractCompanyName } = require('../../src/features/ai/localEngine/entities');
const { matchIntent } = require('../../src/features/ai/localEngine/matcher');

const ALL_TOOLS = require('../../src/features/ai/localEngine/toolIntents').TOOL_INTENTS.map((i) => i.tool);

describe('extractCompanyName', () => {
  it.each([
    ['Tell me about DreamHomes', 'DreamHomes'],
    ['Give me information about DreamHomes', 'DreamHomes'],
    ['What kind of company is DreamHomes?', 'DreamHomes'],
    ['what kind of company are Zameen Estates', 'Zameen Estates'],
    ['Tell me about the DreamHomes agency', 'DreamHomes'],
  ])('extracts the company name from "%s"', (message, expected) => {
    expect(extractCompanyName(message)).toBe(expected);
  });

  it.each([
    'tell me about it',
    'tell me about this property',
    'tell me about agency called Zameen', // lowercase "agency" right after - falls back to the older, unchanged extractor
    'what kind of company is this',
  ])('does not extract a name from a pronoun/generic reference: "%s"', (message) => {
    expect(extractCompanyName(message)).toBeUndefined();
  });

  it('returns undefined when none of the known phrases are present', () => {
    expect(extractCompanyName('houses in Lahore under 5 crore')).toBeUndefined();
  });
});

describe('get_agency_details deterministic matching for conversational phrasings', () => {
  it.each([
    ['Tell me about DreamHomes', 9],
    ['Give me information about DreamHomes', 9],
    ['What kind of company is DreamHomes?', 9],
  ])('matches get_agency_details with a confident score for "%s"', (message, threshold) => {
    const { intent, score } = matchIntent(message, ALL_TOOLS);
    expect(intent?.tool).toBe('get_agency_details');
    expect(score).toBeGreaterThanOrEqual(threshold);
  });

  it('still matches the pre-existing phrasing "trust score for X" unchanged', () => {
    const { intent } = matchIntent('trust score for Zameen', ALL_TOOLS);
    expect(intent?.tool).toBe('get_agency_details');
  });

  it('a bare "tell me about property X" still resolves to get_property_details, not the agency tool (longer, more specific trigger wins)', () => {
    const { intent } = matchIntent('tell me about property 507f1f77bcf86cd799439011', ALL_TOOLS);
    expect(intent?.tool).toBe('get_property_details');
  });
});
