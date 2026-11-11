import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { request, type Schemas } from '@/lib/api';

export type PaymentMethod = Schemas['PaymentMethod'];
export type CreatePaymentMethodBody = Schemas['CreatePaymentMethod'];
export type PaymentMethodChanges = Partial<CreatePaymentMethodBody>;

/** Every method, on or off. Stores have few, so the backend returns them all at once. */
export function usePaymentMethods() {
  return useQuery({
    queryKey: ['payment-methods'],
    queryFn: () => request<{ data: PaymentMethod[] }>('/api/payment-methods/admin'),
  });
}

/** A change to one method. Callers show errors themselves, next to the action. */
function usePaymentMethodMutation<T>(send: (variables: T) => Promise<unknown>) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: send,
    meta: { toast: false },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['payment-methods'] }),
  });
}

export function useCreatePaymentMethod() {
  return usePaymentMethodMutation((body: CreatePaymentMethodBody) =>
    request('/api/payment-methods', { method: 'POST', body }),
  );
}

export function useUpdatePaymentMethod() {
  return usePaymentMethodMutation(({ id, body }: { id: string; body: PaymentMethodChanges }) =>
    request(`/api/payment-methods/${id}`, { method: 'PATCH', body }),
  );
}

/** Deletes a method. The backend refuses when orders use it, as those must keep it. */
export function useDeletePaymentMethod() {
  return usePaymentMethodMutation((id: string) =>
    request(`/api/payment-methods/${id}`, { method: 'DELETE' }),
  );
}
