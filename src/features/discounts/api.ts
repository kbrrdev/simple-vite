import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { request, type Schemas } from '@/lib/api';

export type Sale = Schemas['Sale'];
export type Coupon = Schemas['Coupon'];
export type Promotion = Schemas['Promotion'];
export type CreateSaleBody = Schemas['CreateSale'];
export type SaleChanges = Schemas['UpdateSale'];

/** The three kinds the backend keeps apart, and the route each lives under. */
export type DiscountKind = 'sales' | 'coupons' | 'promotions';

// Each list returns everything, newest first, as stores have few.
function useList<T>(kind: DiscountKind) {
  return useQuery({
    queryKey: ['discounts', kind],
    queryFn: () => request<{ data: T[] }>(`/api/${kind}`),
  });
}

export const useSales = () => useList<Sale>('sales');
export const useCoupons = () => useList<Coupon>('coupons');
export const usePromotions = () => useList<Promotion>('promotions');

/** A change to any discount. Callers show errors themselves, next to the action. */
function useDiscountMutation<T, R>(send: (variables: T) => Promise<R>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: send,
    meta: { toast: false },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['discounts'] }),
  });
}

export function useSetDiscountActive() {
  return useDiscountMutation(
    ({ kind, id, isActive }: { kind: DiscountKind; id: string; isActive: boolean }) =>
      request(`/api/${kind}/${id}`, { method: 'PATCH', body: { isActive } }),
  );
}

/** Deletes a discount. The backend refuses a coupon that orders used, which can be turned off. */
export function useDeleteDiscount() {
  return useDiscountMutation(({ kind, id }: { kind: DiscountKind; id: string }) =>
    request(`/api/${kind}/${id}`, { method: 'DELETE' }),
  );
}

export function useSale(id: string) {
  return useQuery({
    queryKey: ['discounts', 'sales', id],
    queryFn: () => request<{ data: Sale }>(`/api/sales/${id}`),
  });
}

export function useCreateSale() {
  return useDiscountMutation((body: CreateSaleBody) =>
    request<{ data: Sale }>('/api/sales', { method: 'POST', body }),
  );
}

export function useUpdateSale() {
  return useDiscountMutation(({ id, body }: { id: string; body: SaleChanges }) =>
    request(`/api/sales/${id}`, { method: 'PATCH', body }),
  );
}
