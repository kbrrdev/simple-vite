import type { ComponentProps } from 'react';
import { NativeSelect } from '@/components/NativeSelect';
import { useCategoryTree } from './api';
import { categoryOptions } from './tree';

type Props = Omit<ComponentProps<'select'>, 'children'> & {
  /** The first option, for no category, such as "All categories" or "Choose a category". */
  emptyLabel: string;
};

/** A select of every category, labelled with its path. */
export function CategorySelect({ emptyLabel, ...props }: Props) {
  const tree = useCategoryTree();
  const options = tree.data ? categoryOptions(tree.data.data) : [];

  return (
    <NativeSelect {...props} disabled={props.disabled || tree.isPending}>
      <option value="">{tree.isPending ? 'Loading categories…' : emptyLabel}</option>
      {options.map((option) => (
        <option key={option.id} value={option.id}>
          {option.label}
        </option>
      ))}
    </NativeSelect>
  );
}
