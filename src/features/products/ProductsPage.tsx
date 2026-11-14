import { type FormEvent } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { IndexCard, IndexError, IndexList, type IndexColumn } from '@/components/IndexCard';
import { SearchIcon, TagIcon } from 'lucide-react';
import { NativeSelect } from '@/components/NativeSelect';
import { Pagination } from '@/components/Pagination';
import { ViewTabs } from '@/components/ViewTabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCan } from '@/lib/auth';
import { usePageParam } from '@/lib/use-page-param';
import { useCategoryTree } from '@/features/categories/api';
import { CategorySelect } from '@/features/categories/CategorySelect';
import { categoryOptions } from '@/features/categories/tree';
import { ListSkeleton } from '@/components/Loading';
import { pageSize, useProducts, type Product, type ProductSort } from './api';
import { priceRange } from './variants';

// The widths match the row's below, so the headings sit over their values.
const columns: IndexColumn[] = [
  { label: 'Product', className: 'md:flex-1' },
  { label: 'Category', className: 'md:w-48' },
  { label: 'Variants', className: 'md:w-20' },
  { label: 'Price', className: 'md:w-36 md:text-right' },
];

function ProductRow({ product, categoryPath }: { product: Product; categoryPath?: string }) {
  const image = product.images[0];
  const count = product.variants.length;

  return (
    <li>
      <Link
        to={`/products/${product.id}`}
        className="flex items-center gap-3 px-4 py-3 outline-none hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-inset md:gap-4"
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
        <div className="min-w-0 flex-1 md:flex md:items-center md:gap-4">
          <p className="flex flex-wrap items-center gap-2 font-medium md:min-w-0 md:flex-1">
            <span className="truncate">{product.name}</span>
            {!product.active && <Badge variant="secondary">Inactive</Badge>}
          </p>
          {/* One line under the name on phones, and two columns from md up. */}
          <p className="truncate text-sm text-muted-foreground md:contents">
            {categoryPath && (
              <>
                <span className="md:w-48 md:truncate">{categoryPath}</span>
                <span className="md:hidden"> · </span>
              </>
            )}
            {!categoryPath && <span className="hidden md:block md:w-48" />}
            <span className="tabular-nums md:w-20">
              {count} {count === 1 ? 'variant' : 'variants'}
            </span>
          </p>
        </div>
        <p className="shrink-0 text-right text-sm font-medium tabular-nums md:w-36">
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
  const activeParam = searchParams.get('active');
  const active = activeParam === 'true' ? true : activeParam === 'false' ? false : undefined;
  const products = useProducts({ page, search, categoryId, sort, active });
  const tree = useCategoryTree();
  const canManage = useCan('products.manage');

  const paths = new Map(
    categoryOptions(tree.data?.data ?? []).map((option) => [option.id, option.label]),
  );
  const totalPages = Math.max(1, Math.ceil((products.data?.meta.total ?? 0) / pageSize));
  const filtered = Boolean(search || categoryId || active !== undefined);

  /** A view keeps the search, category, and sort, and goes back to the first page. */
  function viewHref(value?: boolean) {
    const params = new URLSearchParams(searchParams);
    if (value === undefined) params.delete('active');
    else params.set('active', String(value));
    params.delete('page');
    return `?${params}`;
  }
  const views = [
    { label: 'All', value: undefined },
    { label: 'Active', value: true },
    { label: 'Inactive', value: false },
  ].map((view) => ({
    label: view.label,
    to: viewHref(view.value),
    selected: view.value === active,
  }));

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
      <PageHeader
        title="Products"
        actions={
          canManage && (
            <Button asChild>
              <Link to="/products/new">New product</Link>
            </Button>
          )
        }
      />

      <IndexCard
        tabs={<ViewTabs label="Product views" tabs={views} />}
        filters={
          <>
            <form role="search" onSubmit={handleSearch} className="flex gap-2 md:flex-1">
              <Label htmlFor="product-search" className="sr-only">
                Search
              </Label>
              {/* Keyed by the URL, so that Back and Clear filters reset the box. */}
              <Input
                key={search ?? ''}
                id="product-search"
                name="search"
                type="search"
                enterKeyHint="search"
                defaultValue={search ?? ''}
                placeholder="Search products by name"
              />
              <Button type="submit" variant="outline">
                Search
              </Button>
            </form>
            <div className="grid grid-cols-2 gap-2 md:flex">
              <Label htmlFor="product-category" className="sr-only">
                Category
              </Label>
              <CategorySelect
                id="product-category"
                className="md:w-56"
                emptyLabel="All categories"
                value={categoryId ?? ''}
                onChange={(event) => setFilter('categoryId', event.target.value)}
              />
              <Label htmlFor="product-sort" className="sr-only">
                Sort
              </Label>
              <NativeSelect
                id="product-sort"
                className="md:w-40"
                value={sort}
                onChange={(event) => setFilter('sort', event.target.value === 'name' ? 'name' : '')}
              >
                <option value="newest">Newest first</option>
                <option value="name">Name A to Z</option>
              </NativeSelect>
            </div>
            {filtered && (
              <Button variant="ghost" onClick={() => setSearchParams({})}>
                Clear filters
              </Button>
            )}
          </>
        }
        columns={products.data?.meta.total ? columns : undefined}
        footer={
          products.data &&
          products.data.meta.total > 0 && (
            <Pagination
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
              loading={products.isPlaceholderData}
            />
          )
        }
      >
        {products.isPending && <ListSkeleton bare media />}

        {products.isError && (
          <IndexError error={products.error} onRetry={() => products.refetch()} />
        )}

        {products.data?.meta.total === 0 &&
          (filtered ? (
            <EmptyState bare icon={SearchIcon} title="No products match these filters">
              Try another search, category, or view, or clear the filters.
            </EmptyState>
          ) : (
            <EmptyState
              bare
              icon={TagIcon}
              title="No products yet"
              action={
                canManage && (
                  <Button asChild>
                    <Link to="/products/new">New product</Link>
                  </Button>
                )
              }
            >
              Create one to start selling.
            </EmptyState>
          ))}

        {products.data && products.data.meta.total > 0 && (
          <IndexList label="Products">
            {products.data.data.map((product) => (
              <ProductRow
                key={product.id}
                product={product}
                categoryPath={paths.get(product.categoryId)}
              />
            ))}
          </IndexList>
        )}
      </IndexCard>
    </div>
  );
}
