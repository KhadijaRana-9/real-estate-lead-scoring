const { pickAllowedFields } = require('../../src/shared/utils/whitelist');

describe('pickAllowedFields', () => {
  it('keeps only fields present in the allow-list', () => {
    const result = pickAllowedFields({ title: 'A', price: 100, agent: 'attacker-id' }, ['title', 'price']);
    expect(result).toEqual({ title: 'A', price: 100 });
    expect(result.agent).toBeUndefined();
  });

  it('is the core mass-assignment defense: privileged fields never survive even if present', () => {
    const maliciousInput = {
      title: 'Nice House',
      status: 'sold',
      views: 999999,
      agent: 'someone-elses-id',
      role: 'admin',
      agencyId: 'attacker-controlled-tenant',
    };
    const result = pickAllowedFields(maliciousInput, ['title', 'price', 'city']);
    expect(result).toEqual({ title: 'Nice House' });
  });

  it('does not invent keys that are absent from the source, even if allow-listed', () => {
    const result = pickAllowedFields({ title: 'A' }, ['title', 'price']);
    expect(result).toEqual({ title: 'A' });
    expect('price' in result).toBe(false);
  });

  it('retains falsy-but-present values (0, false, empty string)', () => {
    const result = pickAllowedFields({ bedrooms: 0, featured: false, description: '' }, ['bedrooms', 'featured', 'description']);
    expect(result).toEqual({ bedrooms: 0, featured: false, description: '' });
  });

  it('returns an empty object for a non-object source', () => {
    expect(pickAllowedFields(null, ['title'])).toEqual({});
    expect(pickAllowedFields(undefined, ['title'])).toEqual({});
  });

  it('returns an empty object when the allow-list is empty', () => {
    expect(pickAllowedFields({ title: 'A', price: 100 }, [])).toEqual({});
  });
});
