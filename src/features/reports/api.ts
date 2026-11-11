import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { request, type Schemas } from '@/lib/api';

export type ReportSummary = Schemas['ReportSummary'];
export type ReportSales = Schemas['ReportSales'];
export type SalesInterval = ReportSales['interval'];
export type ReportTopProducts = Schemas['ReportTopProducts'];
export type TopProductsSort = ReportTopProducts['sort'];
export type LowStockVariant = Schemas['LowStockVariant'];

/** Calendar days in Manila time, both included. Left out, the backend uses the last 30 days. */
export interface DateRange {
  from?: string;
  to?: string;
}

export const topProductsLimit = 10;
export const lowStockPageSize = 10;

export function useSummary(range: DateRange) {
  return useQuery({
    queryKey: ['reports', 'summary', range],
    queryFn: () =>
      request<{ data: ReportSummary }>('/api/reports/summary', { query: { ...range } }),
    placeholderData: keepPreviousData,
  });
}

export function useSales(range: DateRange, interval: SalesInterval) {
  return useQuery({
    queryKey: ['reports', 'sales', { ...range, interval }],
    queryFn: () =>
      request<{ data: ReportSales }>('/api/reports/sales', { query: { ...range, interval } }),
    placeholderData: keepPreviousData,
  });
}

export function useTopProducts(range: DateRange, sort: TopProductsSort) {
  return useQuery({
    queryKey: ['reports', 'top-products', { ...range, sort }],
    queryFn: () =>
      request<{ data: ReportTopProducts }>('/api/reports/top-products', {
        query: { ...range, sort, limit: topProductsLimit },
      }),
    placeholderData: keepPreviousData,
  });
}

/** The store as it is now: orders per status, and the work waiting for staff. */
export function useOrderStatus() {
  return useQuery({
    queryKey: ['reports', 'order-status'],
    queryFn: () => request<{ data: Schemas['ReportOrderStatus'] }>('/api/reports/order-status'),
  });
}

export function useLowStock(page: number, threshold: number) {
  return useQuery({
    queryKey: ['reports', 'low-stock', { page, threshold }],
    queryFn: () =>
      request<{ data: LowStockVariant[]; meta: Schemas['PageMeta'] }>('/api/reports/low-stock', {
        query: { page, limit: lowStockPageSize, threshold },
      }),
    placeholderData: keepPreviousData,
  });
}
