const { stripHtmlTags } = require('../../src/shared/utils/sanitizeText');

describe('stripHtmlTags (FIND-07)', () => {
  it('removes a script tag pair, leaving no live tag behind', () => {
    expect(stripHtmlTags('<script>alert(1)</script>')).not.toMatch(/<script/i);
  });

  it('removes a self-contained tag with attributes (img onerror)', () => {
    expect(stripHtmlTags('<img src=x onerror=alert(1)>')).toBe('');
  });

  it('removes simple markup while keeping surrounding text', () => {
    expect(stripHtmlTags('Hello <b>world</b>!')).toBe('Hello world!');
  });

  it('leaves an already-encoded payload untouched', () => {
    const encoded = '&lt;script&gt;alert(1)&lt;/script&gt;';
    expect(stripHtmlTags(encoded)).toBe(encoded);
  });

  it('leaves incidental angle brackets (not real tags) untouched', () => {
    expect(stripHtmlTags('5 < 10 > 3')).toBe('5 < 10 > 3');
  });

  it('passes through non-string values unchanged', () => {
    expect(stripHtmlTags(undefined)).toBeUndefined();
    expect(stripHtmlTags(null)).toBeNull();
  });

  it('leaves plain text with no markup completely unchanged', () => {
    const plain = 'Interested in this property, please call me back today.';
    expect(stripHtmlTags(plain)).toBe(plain);
  });
});
