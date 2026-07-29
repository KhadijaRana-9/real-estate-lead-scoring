const { calculateLeadScore } = require('../../src/shared/utils/leadScoring');

describe('calculateLeadScore', () => {
  describe('budget match component (0-30)', () => {
    it('scores 30 when budget exactly matches price', () => {
      const { breakdown } = calculateLeadScore({ budget: 5000000, price: 5000000, moveTimeline: 'exploring', message: '', phone: null, propertyViews: 0 });
      expect(breakdown.budgetMatch).toBe(30);
    });

    it('scores lower the further budget is from price', () => {
      const close = calculateLeadScore({ budget: 4800000, price: 5000000, moveTimeline: 'exploring', message: '', phone: null, propertyViews: 0 });
      const far = calculateLeadScore({ budget: 1000000, price: 5000000, moveTimeline: 'exploring', message: '', phone: null, propertyViews: 0 });
      expect(close.breakdown.budgetMatch).toBeGreaterThan(far.breakdown.budgetMatch);
    });

    it('never goes negative for a budget far below price', () => {
      const { breakdown } = calculateLeadScore({ budget: 1, price: 5000000, moveTimeline: 'exploring', message: '', phone: null, propertyViews: 0 });
      expect(breakdown.budgetMatch).toBeGreaterThanOrEqual(0);
    });

    it('is 0 when price is missing (division-by-zero guard)', () => {
      const { breakdown } = calculateLeadScore({ budget: 5000000, price: 0, moveTimeline: 'exploring', message: '', phone: null, propertyViews: 0 });
      expect(breakdown.budgetMatch).toBe(0);
    });
  });

  describe('urgency component (0-25)', () => {
    it.each([
      ['immediate', 25],
      ['1-3m', 15],
      ['3-6m', 8],
      ['exploring', 3],
    ])('maps %s to %i', (moveTimeline, expected) => {
      const { breakdown } = calculateLeadScore({ budget: 0, price: 0, moveTimeline, message: '', phone: null, propertyViews: 0 });
      expect(breakdown.urgency).toBe(expected);
    });

    it('defaults to 0 for an unrecognized timeline value', () => {
      const { breakdown } = calculateLeadScore({ budget: 0, price: 0, moveTimeline: 'not-a-real-value', message: '', phone: null, propertyViews: 0 });
      expect(breakdown.urgency).toBe(0);
    });
  });

  describe('interest component (0-25)', () => {
    it('is 0 for an empty message and no phone', () => {
      const { breakdown } = calculateLeadScore({ budget: 0, price: 0, moveTimeline: 'exploring', message: '', phone: null, propertyViews: 0 });
      expect(breakdown.interest).toBe(0);
    });

    it('adds a phone bonus even with an empty message', () => {
      const { breakdown } = calculateLeadScore({ budget: 0, price: 0, moveTimeline: 'exploring', message: '', phone: '03001234567', propertyViews: 0 });
      expect(breakdown.interest).toBe(5);
    });

    it('caps at 25 even with a very long message plus phone', () => {
      const longMessage = 'x'.repeat(1000);
      const { breakdown } = calculateLeadScore({ budget: 0, price: 0, moveTimeline: 'exploring', message: longMessage, phone: '03001234567', propertyViews: 0 });
      expect(breakdown.interest).toBeLessThanOrEqual(25);
    });
  });

  describe('popularity component (0-20)', () => {
    it('is 0 with zero views', () => {
      const { breakdown } = calculateLeadScore({ budget: 0, price: 0, moveTimeline: 'exploring', message: '', phone: null, propertyViews: 0 });
      expect(breakdown.popularity).toBe(0);
    });

    it('increases with view count but never exceeds 20', () => {
      const low = calculateLeadScore({ budget: 0, price: 0, moveTimeline: 'exploring', message: '', phone: null, propertyViews: 5 });
      const high = calculateLeadScore({ budget: 0, price: 0, moveTimeline: 'exploring', message: '', phone: null, propertyViews: 100000 });
      expect(high.breakdown.popularity).toBeGreaterThan(low.breakdown.popularity);
      expect(high.breakdown.popularity).toBeLessThanOrEqual(20);
    });
  });

  describe('total and status', () => {
    it('never exceeds 100 even at maximum on every component', () => {
      const { total } = calculateLeadScore({
        budget: 5000000, price: 5000000, moveTimeline: 'immediate',
        message: 'x'.repeat(1000), phone: '03001234567', propertyViews: 100000,
      });
      expect(total).toBeLessThanOrEqual(100);
    });

    it('classifies >=70 as hot', () => {
      const { status } = calculateLeadScore({
        budget: 5000000, price: 5000000, moveTimeline: 'immediate',
        message: 'Very interested, please call.', phone: '03001234567', propertyViews: 50,
      });
      expect(status).toBe('hot');
    });

    it('classifies 40-69 as warm', () => {
      const { total, status } = calculateLeadScore({
        budget: 4500000, price: 5000000, moveTimeline: '1-3m',
        message: 'Interested, please share more details', phone: '03001234567', propertyViews: 10,
      });
      expect(total).toBeGreaterThanOrEqual(40);
      expect(total).toBeLessThan(70);
      expect(status).toBe('warm');
    });

    it('classifies <40 as cold', () => {
      const { status } = calculateLeadScore({
        budget: 100, price: 50000000, moveTimeline: 'exploring', message: '', phone: null, propertyViews: 0,
      });
      expect(status).toBe('cold');
    });

    it('is deterministic - identical input always produces identical output', () => {
      const input = { budget: 4500000, price: 5000000, moveTimeline: '1-3m', message: 'Looking to buy soon', phone: '03001234567', propertyViews: 12 };
      const a = calculateLeadScore(input);
      const b = calculateLeadScore(input);
      expect(a).toEqual(b);
    });
  });
});
