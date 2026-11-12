import { actionLabel, fieldLabel, formatValue } from './labels';

describe('labels', () => {
  it('names known actions, and turns new ones into words', () => {
    expect(actionLabel('payment_confirm')).toBe('Payment confirmed');
    expect(actionLabel('stock_count')).toBe('Stock count');
  });

  it('turns field names into words', () => {
    expect(fieldLabel('priceCents')).toBe('Price');
    expect(fieldLabel('option1Value')).toBe('Option 1 value');
    expect(fieldLabel('coverAssetId')).toBe('Cover asset ID');
  });
});

describe('formatValue', () => {
  it('shows money in pesos, and other values as plain text', () => {
    expect(formatValue('priceCents', 99900)).toBe('₱999.00');
    expect(formatValue('stock', 12)).toBe('12');
    expect(formatValue('active', false)).toBe('No');
    expect(formatValue('description', '')).toBe('(empty)');
    expect(formatValue('categoryId', null)).toBe('—');
    expect(formatValue('permissions', ['orders.view', 'orders.manage'])).toBe(
      'orders.view, orders.manage',
    );
    expect(formatValue('accountNumber', '[redacted]')).toBe('[redacted]');
  });
});
