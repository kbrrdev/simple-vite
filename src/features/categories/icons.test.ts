import { describe, expect, it } from 'vitest';
import { categoryIcons } from './icons';

describe('categoryIcons', () => {
  it('has unique names and labels, as names are stored and labels name the radios', () => {
    const names = categoryIcons.map((item) => item.name);
    const labels = categoryIcons.map((item) => item.label);
    expect(new Set(names).size).toBe(names.length);
    expect(new Set(labels).size).toBe(labels.length);
  });

  it('keeps names in the format the backend accepts', () => {
    for (const { name } of categoryIcons) expect(name).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });
});
