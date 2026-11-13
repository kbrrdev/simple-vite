import { useCategoryTree } from '@/features/categories/api';
import { categoryOptions } from '@/features/categories/tree';

interface Props {
  value: string[];
  onChange: (ids: string[]) => void;
  error?: string;
}

/** Picks categories from the whole tree. Each covers its subcategories, as the backend counts them. */
export function CategoryPicker({ value, onChange, error }: Props) {
  const tree = useCategoryTree();
  const options = categoryOptions(tree.data?.data ?? []);

  return (
    <fieldset className="space-y-2">
      <legend className="text-sm leading-none font-medium">Categories</legend>
      <p className="text-xs text-muted-foreground">A category includes its subcategories.</p>
      {tree.isPending && <p className="text-sm text-muted-foreground">Loading categories…</p>}
      {tree.isError && <p className="text-sm text-destructive">Categories could not be loaded.</p>}
      {tree.data && options.length === 0 && (
        <p className="text-sm text-muted-foreground">No categories yet.</p>
      )}
      {options.length > 0 && (
        <div className="max-h-56 overflow-y-auto rounded-lg border">
          {options.map((option) => (
            <label
              key={option.id}
              className="flex min-h-11 items-center gap-3 border-t px-3 text-sm first:border-t-0 md:min-h-9"
            >
              <input
                type="checkbox"
                className="size-5 shrink-0 accent-primary"
                checked={value.includes(option.id)}
                onChange={(event) =>
                  onChange(
                    event.target.checked
                      ? [...value, option.id]
                      : value.filter((id) => id !== option.id),
                  )
                }
              />
              {option.label}
            </label>
          ))}
        </div>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </fieldset>
  );
}
