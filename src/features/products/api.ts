import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { request, type Schemas } from '@/lib/api';

export type Product = Schemas['Product'];
export type ProductVariant = Schemas['ProductVariant'];
export type CreateProductBody = Schemas['CreateProduct'];
export type UpdateProductBody = Schemas['UpdateProduct'];

export type ProductSort = 'newest' | 'name';

export interface ProductFilters {
  page: number;
  search?: string;
  categoryId?: string;
  sort: ProductSort;
}

export const pageSize = 20;

export function useProducts({ page, search, categoryId, sort }: ProductFilters) {
  return useQuery({
    queryKey: ['products', 'list', { page, search, categoryId, sort }],
    queryFn: () =>
      request<{ data: Product[]; meta: Schemas['PageMeta'] }>('/api/products/admin', {
        query: { page, limit: pageSize, search, categoryId, sort },
      }),
    placeholderData: keepPreviousData,
  });
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: ['products', 'detail', id],
    queryFn: () => request<{ data: Product }>(`/api/products/admin/${id}`),
  });
}

/** A product change. Forms show their own errors next to the fields. */
function useProductMutation<T, R>(send: (variables: T) => Promise<R>) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: send,
    meta: { toast: false },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['products'] }),
  });
}

export function useCreateProduct() {
  return useProductMutation((body: CreateProductBody) =>
    request<{ data: Product }>('/api/products', { method: 'POST', body }),
  );
}

export function useUpdateProduct() {
  return useProductMutation(({ id, body }: { id: string; body: UpdateProductBody }) =>
    request<{ data: Product }>(`/api/products/${id}`, { method: 'PATCH', body }),
  );
}

/** Deactivating keeps the product for past orders. Turning it back on is a plain update. */
export function useSetProductActive() {
  return useProductMutation(({ id, active }: { id: string; active: boolean }) =>
    active
      ? request(`/api/products/${id}`, { method: 'PATCH', body: { active: true } })
      : request(`/api/products/${id}`, { method: 'DELETE' }),
  );
}
