const { extractListingPrice, extractListingArea } = require('../../src/features/ai/localEngine/entities');
const { suggestLeadAction } = require('../../src/features/ai/localEngine/leadActions');
const { extractFields } = require('../../src/features/ai/propertyAssist.service');
const { buildReply } = require('../../src/features/ai/localEngine/templates');

describe('Phase 3 (Listing AI) - extractListingPrice', () => {
  it.each([
    ['3 bed house in DHA Lahore, 2 kanal, asking 4.5 crore', 45000000],
    ['priced at 80 lakh, near the market', 8000000],
    ['flat for 25 lac, negotiable', 2500000],
    ['nice plot, 2.5 crore', 25000000],
  ])('extracts a single asking price from "%s"', (text, expected) => {
    expect(extractListingPrice(text)).toBe(expected);
  });

  it('returns undefined when no price is present', () => {
    expect(extractListingPrice('3 bed house in Lahore, 2 kanal')).toBeUndefined();
  });
});

describe('Phase 3 (Listing AI) - extractListingArea', () => {
  it('extracts a marla figure directly', () => {
    expect(extractListingArea('10 marla house')).toEqual({ area: 10, areaUnit: 'marla' });
  });

  it('converts kanal to marla, same real-world constant as extractAreaRange', () => {
    expect(extractListingArea('2 kanal plot')).toEqual({ area: 40, areaUnit: 'marla' });
  });

  it('extracts sqft as its own stored unit, unconverted', () => {
    expect(extractListingArea('1200 sqft flat')).toEqual({ area: 1200, areaUnit: 'sqft' });
  });

  it('returns undefined when no area is present', () => {
    expect(extractListingArea('a nice house in Lahore')).toBeUndefined();
  });
});

describe('Phase 3 (Listing AI) - propertyAssist.extractFields (reuses existing extractors end to end)', () => {
  it('extracts every recognizable field from a real rough listing description', () => {
    const { fields, foundFields } = extractFields('3 bed 2 bath house in Lahore, 2 kanal, asking 4.5 crore');
    expect(fields.city).toBe('Lahore');
    expect(fields.type).toBe('house');
    expect(fields.bedrooms).toBe(3);
    expect(fields.bathrooms).toBe(2);
    expect(fields.area).toBe(40); // 2 kanal -> 40 marla
    expect(fields.areaUnit).toBe('marla');
    expect(fields.price).toBe(45000000);
    expect(foundFields.sort()).toEqual(['area', 'areaUnit', 'bathrooms', 'bedrooms', 'city', 'price', 'type'].sort());
  });

  it('never invents a value for a field it could not find - genuinely sparse text stays sparse', () => {
    const { fields, foundFields } = extractFields('a property somewhere');
    expect(fields.city).toBeUndefined();
    expect(fields.price).toBeUndefined();
    expect(fields.bedrooms).toBeUndefined();
    expect(foundFields).toEqual([]);
  });
});

describe('Phase 3 (Agent/Agency Admin AI) - suggestLeadAction (pure rule table, no invented data)', () => {
  it('closed leads need no further action', () => {
    expect(suggestLeadAction({ pipelineStage: 'closed_won' })).toMatch(/won.*no further action/i);
    expect(suggestLeadAction({ pipelineStage: 'closed_lost' })).toMatch(/lost.*no further action/i);
  });

  it('an already-scheduled appointment/task is reported instead of a duplicate suggestion', () => {
    expect(suggestLeadAction({ pipelineStage: 'contacted', hasUpcomingAppointment: true })).toMatch(/already scheduled/i);
    expect(suggestLeadAction({ pipelineStage: 'new', hasOpenTask: true })).toMatch(/already open/i);
  });

  it('a fresh hot lead with no follow-up gets an urgent nudge', () => {
    const result = suggestLeadAction({ pipelineStage: 'new', status: 'hot', createdAt: new Date() });
    expect(result).toMatch(/hot lead.*reach out now/i);
  });

  it('a stale "new" lead (untouched for 3+ days) is flagged regardless of score', () => {
    const oldDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
    const result = suggestLeadAction({ pipelineStage: 'new', status: 'cold', createdAt: oldDate });
    expect(result).toMatch(/5 days without contact/i);
  });

  it('walks through the remaining real pipeline stages', () => {
    expect(suggestLeadAction({ pipelineStage: 'contacted', createdAt: new Date() })).toMatch(/scheduling a viewing/i);
    expect(suggestLeadAction({ pipelineStage: 'viewing_scheduled', createdAt: new Date() })).toMatch(/follow up after the viewing/i);
    expect(suggestLeadAction({ pipelineStage: 'negotiation', createdAt: new Date() })).toMatch(/continue the negotiation/i);
  });
});

describe('Phase 3 - templates reuse the new data without altering the existing breakdown', () => {
  it('explain_lead_score still shows the full existing breakdown, plus the new suggestion appended', () => {
    const reply = buildReply('explain_lead_score', {
      customer: 'Ali', score: 82, status: 'hot',
      breakdown: { budgetMatch: 30, urgency: 25, interest: 20, popularity: 7 },
      moveTimeline: 'immediate',
      suggestedAction: 'Reach out to this lead to gauge interest.',
    });
    expect(reply).toMatch(/Ali scored 82\/100 \(hot\)/);
    expect(reply).toMatch(/Budget match: 30 points/);
    expect(reply).toMatch(/Suggested next step: Reach out to this lead to gauge interest\./);
  });

  it('explain_lead_score reply is unchanged (no stray suggestion line) when the executor did not compute one', () => {
    const reply = buildReply('explain_lead_score', {
      customer: 'Ali', score: 82, status: 'hot',
      breakdown: { budgetMatch: 30, urgency: 25, interest: 20, popularity: 7 },
    });
    expect(reply).not.toMatch(/Suggested next step/);
  });

  it('recommend_properties states the real match criteria instead of a bare count', () => {
    const reply = buildReply('recommend_properties', {
      count: 2,
      properties: [{ city: 'Karachi', type: 'flat' }, { city: 'Karachi', type: 'flat' }],
    });
    expect(reply).toBe('Found 2 similar properties in Karachi (same type, closest in price).');
  });
});
