const { extractCity } = require('../../src/features/ai/localEngine/entities');
const { matchIntent } = require('../../src/features/ai/localEngine/matcher');
const { buildReply } = require('../../src/features/ai/localEngine/templates');
const { TOOL_INTENTS } = require('../../src/features/ai/localEngine/toolIntents');
const { FAQ_TOPICS, matchFaqTopic } = require('../../src/features/ai/localEngine/faq');

const ALL_TOOLS = TOOL_INTENTS.map((i) => i.tool);
function scoreOf(message) {
  return matchIntent(message, ALL_TOOLS);
}

describe('Phase 2 (Customer AI) - extractCity fuzzy fallback', () => {
  it.each([
    ['3 bed house in Lahor', 'Lahore'],
    ['flats in Karrachi', 'Karachi'],
    ['houses in Islamabaad', 'Islamabad'],
    ['plot in Rawalpindy', 'Rawalpindi'],
  ])('tolerates a one-character typo: "%s" -> %s', (message, expectedCity) => {
    expect(extractCity(message)).toBe(expectedCity);
  });

  it('correctly-spelled cities still match via the exact path (unaffected)', () => {
    expect(extractCity('houses in Lahore')).toBe('Lahore');
    expect(extractCity('flats in Karachi')).toBe('Karachi');
  });

  it('does not fuzzy-match short or unrelated words', () => {
    expect(extractCity('a nice cozy home')).toBeUndefined();
    expect(extractCity('DHA')).toBeUndefined();
  });

  it('a non-KNOWN_CITIES locality after "in" still falls through to the existing capitalized-word capture, unaffected', () => {
    expect(extractCity('apartments in DHA')).toBe('DHA');
    expect(extractCity('villas in Bahria Town')).toBe('Bahria Town');
  });

  it('a typo more than one edit away from any known city falls through to the existing generic capture rather than a wrong fuzzy guess', () => {
    // "Lhr" is too short (< 4 chars) for the fuzzy step to touch at all,
    // so this exercises the pre-existing, unrelated "in X" capitalized-
    // word fallback (same path "in DHA" already used) - not a fuzzy
    // match, and correctly not "Lahore".
    expect(extractCity('flats in Lhr')).toBe('Lhr');
  });
});

describe('Phase 2 (Customer AI) - get_faq_answer intent + tool', () => {
  it('get_faq_answer is only offered to the customer role', () => {
    const def = require('../../src/features/ai/ai.tools').TOOL_DEFINITIONS.get_faq_answer;
    expect(def.roles).toEqual(['customer']);
  });

  it.each([
    ['how do I contact an agent?', 'contact_agent'],
    ['how do favorites work?', 'favorites'],
    ['how do inquiries work?', 'inquiries'],
    ['how do I buy a property?', 'buy_property'],
    ['do I need an account to browse?', 'account_required'],
    ['how do I schedule a viewing?', 'schedule_viewing'],
  ])('"%s" confidently matches get_faq_answer with topic %s', (message, expectedTopic) => {
    const { intent, score } = scoreOf(message);
    expect(intent?.tool).toBe('get_faq_answer');
    expect(score).toBeGreaterThanOrEqual(9);
    expect(intent.extract(message)).toEqual({ topic: expectedTopic });
  });

  it('does not steal a genuine submit_inquiry/favorite request (no regression on existing action intents)', () => {
    expect(scoreOf('contact the agent about this property').intent?.tool).toBe('submit_inquiry');
    expect(scoreOf('save this property').intent?.tool).toBe('add_favorite_property');
  });

  it('every FAQ topic has a real, non-empty answer, and buildReply passes it through unchanged', () => {
    for (const [topic, entry] of Object.entries(FAQ_TOPICS)) {
      expect(entry.answer.length).toBeGreaterThan(20);
      const reply = buildReply('get_faq_answer', { topic, question: entry.question, answer: entry.answer });
      expect(reply).toBe(entry.answer);
    }
  });

  it('matchFaqTopic returns undefined for unrelated text (defensive - executor already guards this too)', () => {
    expect(matchFaqTopic('houses in Lahore')).toBeUndefined();
  });

  it('"how does the platform work" still resolves to the generic help message, not the FAQ tool (deliberately unchanged)', () => {
    const { intent } = scoreOf('how does the platform work?');
    expect(intent?.tool).not.toBe('get_faq_answer');
  });
});
