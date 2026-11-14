import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { request, type Schemas } from '@/lib/api';

export type ReportSummary = Schemas['ReportSummary'];
export type ReportSales = Schemas['ReportSales'];
export type SalesInterval = ReportSales['interval'];
export type ReportTopProducts = Schemas['ReportTopProducts'];
export type TopProductsSort = ReportTopProducts['sort'];
export type LowStockVariant = Schemas['LowStockVariant'];
export type ReportSalesBy = Schemas['ReportSalesBy'];
export type SalesByDimension = ReportSalesBy['dimension'];

/** Calendar days in Manila time, both included. Left out, the backend uses the last 30 days. */
export interface DateRange {
  from?: string;
  to?: string;
}

export const topProductsLimit = 10;
export const lowStockPageSize = 10;

/**
 * The range's query, asking the backend for the same figures over the days just before it when
 * `compare` is on. The backend picks those days and works out each change.
 */
function rangeQuery(range: DateRange, compare: boolean) {
  return compare ? { ...range, compare: 'previous_period' as const } : { ...range };
}

/** `enabled` is false for roles without sales reports, which the backend would refuse. */
export function useSummary(range: DateRange, compare: boolean, enabled = true) {
  return useQuery({
    queryKey: ['reports', 'summary', { ...range, compare }],
    enabled,
    queryFn: () =>
      request<{ data: ReportSummary }>('/api/reports/summary', {
        query: rangeQuery(range, compare),
      }),
    placeholderData: keepPreviousData,
  });
}

export function useSales(
  range: DateRange,
  interval: SalesInterval,
  compare: boolean,
  enabled = true,
) {
  return useQuery({
    queryKey: ['reports', 'sales', { ...range, interval, compare }],
    enabled,
    queryFn: () =>
      request<{ data: ReportSales }>('/api/reports/sales', {
        query: { ...rangeQuery(range, compare), interval },
      }),
    placeholderData: keepPreviousData,
  });
}

export function useSalesBy(range: DateRange, dimension: SalesByDimension) {
  return useQuery({
    queryKey: ['reports', 'sales-by', { ...range, dimension }],
    queryFn: () =>
      request<{ data: ReportSalesBy }>('/api/reports/sales-by', {
        query: { ...range, dimension },
      }),
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
/** `enabled` is false for roles without `reports.operations`, which the report needs. */
export function useOrderStatus(enabled = true) {
  return useQuery({
    queryKey: ['reports', 'order-status'],
    enabled,
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
