import { slugify } from './slug';

describe('slugify', () => {
  it('turns a title into lowercase words joined by single dashes', () => {
    expect(slugify('Returns & Refunds')).toBe('returns-refunds');
    expect(slugify('  Terms and Conditions!  ')).toBe('terms-and-conditions');
    expect(slugify('Paano Mag-order sa Piñas')).toBe('paano-mag-order-sa-pinas');
  });

  it('stays within 100 characters without a dash at the end', () => {
    const slug = slugify(`${'a'.repeat(99)} b`);
    expect(slug).toBe('a'.repeat(99));
  });
});
