import { formatCents, parsePesos } from './money';

describe('parsePesos', () => {
  it.each([
    ['199.99', 19999],
    ['199.9', 19990],
    ['199', 19900],
    [' 0.05 ', 5],
    ['0', 0],
  ])('turns %j into %i cents', (text, cents) => {
    expect(parsePesos(text)).toBe(cents);
  });

  it.each(['', '1.999', '-5', '1,000', 'abc', '1.', '.5', '99999999999999999'])(
    'rejects %j',
    (text) => {
      expect(parsePesos(text)).toBeNull();
    },
  );
});

describe('formatCents', () => {
  it('formats cents as pesos', () => {
    expect(formatCents(19999)).toBe('₱199.99');
  });
});
