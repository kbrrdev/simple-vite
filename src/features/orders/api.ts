import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { request, type Schemas } from '@/lib/api';

export type Order = Schemas['AdminOrder'];
export type OrderStatus = Order['status'];
export type PaymentStatus = Order['paymentStatus'];

export interface OrderFilters {
  page: number;
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
  /** Order number, customer email, recipient name, or payment reference. */
  search?: string;
}

export const pageSize = 20;

export function useOrders({ page, status, paymentStatus, search }: OrderFilters) {
  return useQuery({
    queryKey: ['orders', 'list', { page, status, paymentStatus, search }],
    queryFn: () =>
      request<{ data: Order[]; meta: Schemas['PageMeta'] }>('/api/orders/admin', {
        query: { page, limit: pageSize, status, paymentStatus, search },
      }),
    placeholderData: keepPreviousData,
  });
}

export function useOrder(id: string) {
  return useQuery({
    queryKey: ['orders', 'detail', id],
    queryFn: () => request<{ data: Order }>(`/api/orders/admin/${id}`),
  });
}

/** A change to one order. Callers show errors themselves, next to the action. */
function useOrderMutation<T>(send: (variables: T) => Promise<unknown>) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: send,
    meta: { toast: false },
    // The order page shows its audit entries, and the list tabs and Dashboard count orders by
    // status, so a change refreshes those too.
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ['orders'] }),
        queryClient.invalidateQueries({ queryKey: ['audit-log'] }),
        queryClient.invalidateQueries({ queryKey: ['reports'] }),
      ]),
  });
}

export function useUpdateOrderStatus() {
  return useOrderMutation(({ id, status }: { id: string; status: OrderStatus }) =>
    request(`/api/orders/admin/${id}/status`, { method: 'PATCH', body: { status } }),
  );
}

export function useConfirmPayment() {
  return useOrderMutation((id: string) =>
    request(`/api/orders/admin/${id}/payment/confirm`, { method: 'POST' }),
  );
}

export function useRejectPayment() {
  return useOrderMutation((id: string) =>
    request(`/api/orders/admin/${id}/payment/reject`, { method: 'POST' }),
  );
}

export function useRefundPayment() {
  return useOrderMutation((id: string) =>
    request(`/api/orders/admin/${id}/payment/refund`, { method: 'POST' }),
  );
}
