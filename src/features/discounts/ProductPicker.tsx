import { useState } from 'react';
import { useQueries } from '@tanstack/react-query';
import { XIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { request } from '@/lib/api';
import { useProducts, type Product } from '@/features/products/api';

interface Props {
  /** The legend, such as "Products". */
  legend: string;
  value: string[];
  onChange: (ids: string[]) => void;
  error?: string;
  /** Most products allowed, as bundles have a limit. */
  max?: number;
}

/**
 * Picks products by searching their names, as the Products list does, and shows the chosen
 * ones as chips. Sales and promotions share it.
 */
export function ProductPicker({ legend, value, onChange, error, max }: Props) {
  const [search, setSearch] = useState('');
  const [term, setTerm] = useState('');
  const results = useProducts({ page: 1, search: term || undefined, sort: 'name' });
  // shortcut: one request per chosen product for its name, as the list cannot filter by ids.
  // Fine for the few products a discount has; upgrade if the backend adds an ids filter.
  const chosen = useQueries({
    queries: value.map((id) => ({
      queryKey: ['products', 'detail', id],
      queryFn: () => request<{ data: Product }>(`/api/products/admin/${id}`),
    })),
  });
  const full = max !== undefined && value.length >= max;

  function toggle(id: string, checked: boolean) {
    onChange(checked ? [...value, id] : value.filter((item) => item !== id));
  }

  return (
    <fieldset className="space-y-3">
      <legend className="text-sm leading-none font-medium">{legend}</legend>

      {value.length > 0 && (
        <ul aria-label={`Chosen ${legend.toLowerCase()}`} className="flex flex-wrap gap-2">
          {value.map((id, index) => {
            const name = chosen[index]?.data?.data.name;
            const label = name ?? (chosen[index]?.isError ? 'Product not found' : 'Loading…');
            return (
              <li
                key={id}
                className="flex items-center gap-1 rounded-full border bg-muted/50 py-0.5 pr-1 pl-3 text-sm"
              >
                {label}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="size-7 rounded-full"
                  aria-label={`Remove ${label}`}
                  onClick={() => toggle(id, false)}
                >
                  <XIcon />
                </Button>
              </li>
            );
          })}
        </ul>
      )}

      <div className="flex gap-2">
        <Input
          type="search"
          aria-label={`Search ${legend.toLowerCase()}`}
          placeholder="Product name"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          onKeyDown={(event) => {
            // Searches here rather than submitting the page's form.
            if (event.key === 'Enter') {
              event.preventDefault();
              setTerm(search.trim());
            }
          }}
        />
        <Button type="button" variant="outline" onClick={() => setTerm(search.trim())}>
          Search
        </Button>
      </div>

      {results.isPending && <p className="text-sm text-muted-foreground">Loading products…</p>}
      {results.isError && <p className="text-sm text-destructive">Products could not be loaded.</p>}
      {results.data?.meta.total === 0 && (
        <p className="text-sm text-muted-foreground">No products match “{term}”.</p>
      )}
      {results.data && results.data.data.length > 0 && (
        <div
          role="group"
          aria-label={`${legend} to choose from`}
          className="max-h-56 overflow-y-auto rounded-lg border"
        >
          {results.data.data.map((product) => {
            const checked = value.includes(product.id);
            return (
              <label
                key={product.id}
                className="flex min-h-11 items-center gap-3 border-t px-3 text-sm first:border-t-0 md:min-h-9"
              >
                <input
                  type="checkbox"
                  className="size-5 shrink-0 accent-primary"
                  checked={checked}
                  disabled={!checked && full}
                  onChange={(event) => toggle(product.id, event.target.checked)}
                />
                <span className="min-w-0 truncate">{product.name}</span>
                {!product.active && <span className="text-xs text-muted-foreground">Inactive</span>}
              </label>
            );
          })}
        </div>
      )}
      {results.data && results.data.meta.total > results.data.data.length && (
        <p className="text-xs text-muted-foreground">
          Showing the first {results.data.data.length}. Search to find others.
        </p>
      )}
      {full && <p className="text-xs text-muted-foreground">Up to {max} products.</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </fieldset>
  );
}
