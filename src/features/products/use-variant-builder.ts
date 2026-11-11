import { useState } from 'react';
import { combinations, type Combination } from './variants';

export interface Option {
  name: string;
  values: string[];
}

export interface RowFields {
  price: string;
  stock: string;
}

export type VariantRow = Combination & RowFields;

/**
 * The options and the variant rows built from them. Rows are derived from the option values,
 * so typed prices and stock stay with a combination while values are added or removed.
 */
export function useVariantBuilder() {
  const [options, setOptions] = useState<Option[]>([
    { name: '', values: [] },
    { name: '', values: [] },
  ]);
  const [fields, setFields] = useState<Record<string, RowFields>>({});
  const [removed, setRemoved] = useState<string[]>([]);

  const rows: VariantRow[] = combinations(options[0].values, options[1].values)
    .filter((combination) => !removed.includes(combination.key))
    .map((combination) => ({
      ...combination,
      ...(fields[combination.key] ?? { price: '', stock: '' }),
    }));

  function setOption(index: number, change: Partial<Option>) {
    setOptions((current) =>
      current.map((option, i) => (i === index ? { ...option, ...change } : option)),
    );
  }

  function setRow(key: string, change: Partial<RowFields>) {
    setFields((current) => ({
      ...current,
      [key]: { ...(current[key] ?? { price: '', stock: '' }), ...change },
    }));
  }

  function applyToAll(change: Partial<RowFields>) {
    setFields((current) => {
      const next = { ...current };
      for (const row of rows) next[row.key] = { price: row.price, stock: row.stock, ...change };
      return next;
    });
  }

  return {
    options,
    rows,
    setOption,
    setRow,
    applyToAll,
    removeRow: (key: string) => setRemoved((current) => [...current, key]),
    restoreRows: () => setRemoved([]),
    removedCount: removed.length,
  };
}

export type VariantBuilderState = ReturnType<typeof useVariantBuilder>;
