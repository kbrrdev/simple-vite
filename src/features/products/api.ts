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
  /** True for products on sale, false for inactive ones, and left out for both. */
  active?: boolean;
}

export const pageSize = 20;

export function useProducts({ page, search, categoryId, sort, active }: ProductFilters) {
  return useQuery({
    queryKey: ['products', 'list', { page, search, categoryId, sort, active }],
    queryFn: () =>
      request<{ data: Product[]; meta: Schemas['PageMeta'] }>('/api/products/admin', {
        query: { page, limit: pageSize, search, categoryId, sort, active },
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
    // Settled, not success: a reorder can fail halfway, and the page must show what was saved.
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['products'] }),
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

export function useAddImage() {
  return useProductMutation(
    ({ productId, assetId, altText }: { productId: string; assetId: string; altText: string }) =>
      request(`/api/products/${productId}/images`, {
        method: 'POST',
        body: { assetId, altText } satisfies Schemas['AddProductImage'],
      }),
  );
}

export function useUpdateImageAltText() {
  return useProductMutation(
    ({ productId, imageId, altText }: { productId: string; imageId: string; altText: string }) =>
      request(`/api/products/${productId}/images/${imageId}`, {
        method: 'PATCH',
        body: { altText } satisfies Schemas['UpdateProductImage'],
      }),
  );
}

/** Removes an image from the product. The file stays in Files. */
export function useRemoveImage() {
  return useProductMutation(({ productId, imageId }: { productId: string; imageId: string }) =>
    request(`/api/products/${productId}/images/${imageId}`, { method: 'DELETE' }),
  );
}

/**
 * Saves a new image order by numbering the images 0, 1, 2, and so on. Only the images whose
 * number changes are sent, one at a time, as the backend updates one image per request.
 */
export function useReorderImages() {
  return useProductMutation(
    async ({ product, imageIds }: { product: Product; imageIds: string[] }) => {
      for (const [position, imageId] of imageIds.entries()) {
        const image = product.images.find((item) => item.id === imageId);
        if (image?.position === position) continue;

        await request(`/api/products/${product.id}/images/${imageId}`, {
          method: 'PATCH',
          body: { position } satisfies Schemas['UpdateProductImage'],
        });
      }
    },
  );
}

export type VariantChanges = Partial<Schemas['UpdateVariant']>;

export function useAddVariant() {
  return useProductMutation(
    ({ productId, body }: { productId: string; body: Schemas['CreateVariant'] }) =>
      request(`/api/products/${productId}/variants`, { method: 'POST', body }),
  );
}

export function useUpdateVariant() {
  return useProductMutation(
    ({
      productId,
      variantId,
      body,
    }: {
      productId: string;
      variantId: string;
      body: VariantChanges;
    }) => request(`/api/products/${productId}/variants/${variantId}`, { method: 'PATCH', body }),
  );
}

/** Deactivating keeps the variant for past orders. Turning it back on is a plain update. */
export function useSetVariantActive() {
  return useProductMutation(
    ({
      productId,
      variantId,
      active,
    }: {
      productId: string;
      variantId: string;
      active: boolean;
    }) =>
      active
        ? request(`/api/products/${productId}/variants/${variantId}`, {
            method: 'PATCH',
            body: { active: true },
          })
        : request(`/api/products/${productId}/variants/${variantId}`, { method: 'DELETE' }),
  );
}
