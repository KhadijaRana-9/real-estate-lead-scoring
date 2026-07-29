const { estimatePrice } = require('../../src/shared/utils/priceEstimate');

describe('estimatePrice', () => {
  it.each([
    ['islamabad', 3500000],
    ['lahore', 2800000],
    ['karachi', 2600000],
    ['rawalpindi', 2200000],
    ['faisalabad', 1800000],
  ])('uses the correct rate per marla for %s', (city, ratePerMarla) => {
    const { breakdown } = estimatePrice({ city, area: 5, bedrooms: 0, bathrooms: 0 });
    expect(breakdown.ratePerMarla).toBe(ratePerMarla);
  });

  it('is case-insensitive and trims whitespace on city', () => {
    const a = estimatePrice({ city: '  Lahore  ', area: 5 });
    const b = estimatePrice({ city: 'lahore', area: 5 });
    expect(a.estimate).toBe(b.estimate);
  });

  it('falls back to the default rate for an unlisted city', () => {
    const { breakdown } = estimatePrice({ city: 'Multan', area: 5 });
    expect(breakdown.ratePerMarla).toBe(1500000);
  });

  it('computes base amount as rate x area', () => {
    const { breakdown } = estimatePrice({ city: 'lahore', area: 5 });
    expect(breakdown.baseAmount).toBe(2800000 * 5);
  });

  it('adds bedroom and bathroom premiums', () => {
    const { estimate, breakdown } = estimatePrice({ city: 'lahore', area: 5, bedrooms: 3, bathrooms: 2 });
    expect(breakdown.bedroomAmount).toBe(300000 * 3);
    expect(breakdown.bathroomAmount).toBe(150000 * 2);
    expect(estimate).toBe(breakdown.baseAmount + breakdown.bedroomAmount + breakdown.bathroomAmount);
  });

  it('treats missing bedrooms/bathrooms as 0, not NaN', () => {
    const { estimate } = estimatePrice({ city: 'lahore', area: 5 });
    expect(Number.isNaN(estimate)).toBe(false);
    expect(estimate).toBe(2800000 * 5);
  });

  it('is deterministic', () => {
    const input = { city: 'karachi', area: 8, bedrooms: 4, bathrooms: 3 };
    expect(estimatePrice(input)).toEqual(estimatePrice(input));
  });
});
