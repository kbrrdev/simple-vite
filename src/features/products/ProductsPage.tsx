import { type FormEvent } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router';
import { NativeSelect } from '@/components/NativeSelect';
import { Pagination } from '@/components/Pagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { errorMessage } from '@/lib/api';
import { usePageParam } from '@/lib/use-page-param';
import { useCategoryTree } from '@/features/categories/api';
import { CategorySelect } from '@/features/categories/CategorySelect';
import { categoryOptions } from '@/features/categories/tree';
import { pageSize, useProducts, type Product, type ProductSort } from './api';
import { priceRange } from './variants';

function ProductRow({ product, categoryPath }: { product: Product; categoryPath?: string }) {
  const image = product.images[0];
  const count = product.variants.length;

  return (
    <li>
      <Link
        to={`/products/${product.id}`}
        className="flex items-center gap-3 border-t px-4 py-3 outline-none hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-inset"
      >
        {image ? (
          <img
            src={image.url}
            alt=""
            loading="lazy"
            className="size-12 shrink-0 rounded-md bg-muted object-cover"
          />
        ) : (
          <div className="size-12 shrink-0 rounded-md bg-muted" />
        )}
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2 font-medium">
            <span className="truncate">{product.name}</span>
            {!product.active && <Badge variant="secondary">Inactive</Badge>}
          </p>
          <p className="truncate text-sm text-muted-foreground">
            {categoryPath ?? ''}
            {categoryPath && ' · '}
            {count} {count === 1 ? 'variant' : 'variants'}
          </p>
        </div>
        <p className="shrink-0 text-right text-sm font-medium tabular-nums">
          {priceRange(product)}
        </p>
      </Link>
    </li>
  );
}

export function ProductsPage() {
  const [page, setPage] = usePageParam();
  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.get('search')?.trim() || undefined;
  const categoryId = searchParams.get('categoryId') || undefined;
  const sort: ProductSort = searchParams.get('sort') === 'name' ? 'name' : 'newest';
  const products = useProducts({ page, search, categoryId, sort });
  const tree = useCategoryTree();

  const paths = new Map(
    categoryOptions(tree.data?.data ?? []).map((option) => [option.id, option.label]),
  );
  const totalPages = Math.max(1, Math.ceil((products.data?.meta.total ?? 0) / pageSize));
  const filtered = Boolean(search || categoryId);

  // A change can empty the last page, so step back to the new last page.
  if (products.data && !products.isPlaceholderData && page > totalPages) {
    const params = new URLSearchParams(searchParams);
    params.set('page', String(totalPages));
    return <Navigate to={`?${params}`} replace />;
  }

  /** Sets one filter and goes back to the first page. */
  function setFilter(name: 'search' | 'categoryId' | 'sort', value: string) {
    setSearchParams((params) => {
      if (value) params.set(name, value);
      else params.delete(name);
      params.delete('page');
      return params;
    });
  }

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = new FormData(event.currentTarget).get('search');
    setFilter('search', typeof value === 'string' ? value.trim() : '');
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Products</h1>
        <Button asChild>
          <Link to="/products/new">New product</Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-[1fr_14rem_10rem] md:items-end">
        <form role="search" onSubmit={handleSearch} className="space-y-2">
          <Label htmlFor="product-search">Search</Label>
          <div className="flex gap-2">
            {/* Keyed by the URL, so that Back and Clear filters reset the box. */}
            <Input
              key={search ?? ''}
              id="product-search"
              name="search"
              type="search"
              enterKeyHint="search"
              defaultValue={search ?? ''}
              placeholder="Product name"
            />
            <Button type="submit" variant="outline">
              Search
            </Button>
          </div>
        </form>
        <div className="space-y-2">
          <Label htmlFor="product-category">Category</Label>
          <CategorySelect
            id="product-category"
            emptyLabel="All categories"
            value={categoryId ?? ''}
            onChange={(event) => setFilter('categoryId', event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="product-sort">Sort</Label>
          <NativeSelect
            id="product-sort"
            value={sort}
            onChange={(event) => setFilter('sort', event.target.value === 'name' ? 'name' : '')}
          >
            <option value="newest">Newest</option>
            <option value="name">Name</option>
          </NativeSelect>
        </div>
      </div>

      {filtered && (
        <Button variant="ghost" onClick={() => setSearchParams({})} className="-mt-2">
          Clear filters
        </Button>
      )}

      {products.isPending && (
        <p role="status" className="text-muted-foreground">
          Loading…
        </p>
      )}

      {products.isError && (
        <div className="space-y-4">
          <p role="alert">{errorMessage(products.error)}</p>
          <Button variant="outline" onClick={() => products.refetch()}>
            Try again
          </Button>
        </div>
      )}

      {products.data?.meta.total === 0 && (
        <p className="text-muted-foreground">
          {filtered
            ? 'No products match these filters.'
            : 'No products yet. Create one to start selling.'}
        </p>
      )}

      {products.data && products.data.meta.total > 0 && (
        <>
          <ul
            aria-label="Products"
            className="overflow-hidden rounded-lg border [&>li:first-child>a]:border-t-0"
          >
            {products.data.data.map((product) => (
              <ProductRow
                key={product.id}
                product={product}
                categoryPath={paths.get(product.categoryId)}
              />
            ))}
          </ul>

          <Pagination
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
            loading={products.isPlaceholderData}
          />
        </>
      )}
    </div>
  );
}
