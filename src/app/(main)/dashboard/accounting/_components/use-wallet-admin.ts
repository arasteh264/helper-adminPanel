"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";

import { apiFetch } from "../../services/_components/api";
import type {
  AccountingSummary,
  CustomerPayment,
  PageResult,
  PaymentStatus,
  PayoutRequest,
  PayoutStatus,
  WalletConfiguration,
  WalletTransaction,
  WalletTransactionType,
} from "./data";

export type PaginationParams = { page: number; pageSize: number };
export type TransactionFilters = PaginationParams & {
  type?: WalletTransactionType;
  direction?: "in" | "out";
  createdFrom?: string;
  createdTo?: string;
};

export type MonthlyCommission = {
  month: Date;
  amount: number;
};

const ACCOUNTING_KEY = ["admin-wallet-accounting"] as const;
const CONFIGURATION_KEY = ["admin-wallet-configuration"] as const;
const TRANSACTIONS_KEY = ["admin-wallet-transactions"] as const;
const PAYMENTS_KEY = ["admin-payments"] as const;
const PAYOUTS_KEY = ["admin-wallet-payouts"] as const;
const COMMISSION_TREND_KEY = ["admin-wallet-commission-trend"] as const;
const MAX_COMMISSION_TRANSACTIONS = 10_000;
const TRANSACTION_PAGE_SIZE = 100;
const persianDatePartsFormatter = new Intl.DateTimeFormat("en-u-ca-persian-nu-latn", {
  day: "numeric",
  month: "numeric",
  year: "numeric",
  timeZone: "Asia/Tehran",
});

function getPersianMonthParts(date: Date) {
  const parts = persianDatePartsFormatter.formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  if (!year || !month || !day) throw new Error("تبدیل تاریخ به تقویم شمسی ناموفق بود.");
  return { year, month, day };
}

function useAdminToken() {
  const { data: session, status } = useSession();
  return { token: session?.accessToken as string | undefined, status };
}

function buildQuery(values: Record<string, string | number | undefined>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined && value !== "") params.set(key, String(value));
  }
  return params.toString();
}

async function fetchMonthlyCommissions(token: string): Promise<MonthlyCommission[]> {
  const now = new Date();
  const monthStarts: Date[] = [];
  for (let daysBack = 0; daysBack <= 400 && monthStarts.length < 12; daysBack += 1) {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - daysBack, 12));
    if (getPersianMonthParts(date).day === "1") monthStarts.push(date);
  }
  if (monthStarts.length !== 12) {
    throw new Error("محاسبه‌ی بازه‌ی ۱۲ ماه شمسی برای گزارش مالی ناموفق بود.");
  }

  const months = monthStarts.reverse();
  const createdFrom = new Date(months[0].getTime() - 24 * 60 * 60 * 1000).toISOString();
  const createdTo = now.toISOString();
  const monthlyTotals = new Map<string, number>();
  for (const month of months) {
    const parts = getPersianMonthParts(month);
    monthlyTotals.set(`${parts.year}-${parts.month}`, 0);
  }

  let page = 1;
  let total: number | undefined;
  let loaded = 0;

  while (total === undefined || loaded < total) {
    if (loaded >= MAX_COMMISSION_TRANSACTIONS) {
      throw new Error("تعداد تراکنش‌های کمیسیون از سقف گزارش بیشتر است؛ بازه‌ی گزارش را محدود کنید.");
    }

    const query = buildQuery({
      page,
      pageSize: TRANSACTION_PAGE_SIZE,
      type: "COMMISSION",
      createdFrom,
      createdTo,
    });
    const result = await apiFetch<PageResult<WalletTransaction>>(`/admin/wallets/transactions?${query}`, token);

    if (
      !Array.isArray(result.items) ||
      !Number.isInteger(result.total) ||
      result.total < 0 ||
      result.items.length > TRANSACTION_PAGE_SIZE
    ) {
      throw new Error("سرویس دفترکل پاسخ صفحه‌بندی‌شده‌ی معتبری برنگرداند.");
    }

    total ??= result.total;
    if (result.items.length === 0 && loaded < total) {
      throw new Error("دریافت همه‌ی تراکنش‌های کمیسیون کامل نشد.");
    }

    for (const transaction of result.items) {
      const date = new Date(transaction.createdAt);
      if (Number.isNaN(date.getTime()) || !Number.isFinite(transaction.amount)) {
        throw new Error("یکی از تراکنش‌های کمیسیون داده‌ی نامعتبر دارد.");
      }
      const parts = getPersianMonthParts(date);
      const monthKey = `${parts.year}-${parts.month}`;
      if (monthlyTotals.has(monthKey)) {
        monthlyTotals.set(monthKey, (monthlyTotals.get(monthKey) ?? 0) + Math.abs(transaction.amount));
      }
    }

    loaded += result.items.length;
    page += 1;
  }

  return months.map((month) => {
    const parts = getPersianMonthParts(month);
    return { month, amount: monthlyTotals.get(`${parts.year}-${parts.month}`) ?? 0 };
  });
}

export function useAccountingSummary() {
  const { token } = useAdminToken();
  return useQuery({
    queryKey: ACCOUNTING_KEY,
    enabled: !!token,
    queryFn: () => apiFetch<AccountingSummary>("/admin/wallets/accounting", token as string),
  });
}

export function useMonthlyCommissions() {
  const { token } = useAdminToken();
  return useQuery({
    queryKey: COMMISSION_TREND_KEY,
    enabled: !!token,
    queryFn: () => fetchMonthlyCommissions(token as string),
    refetchInterval: 60_000,
  });
}

export function useWalletConfiguration() {
  const { token } = useAdminToken();
  return useQuery({
    queryKey: CONFIGURATION_KEY,
    enabled: !!token,
    queryFn: () => apiFetch<WalletConfiguration>("/admin/wallets/configuration", token as string),
  });
}

export function useWalletTransactions(filters: TransactionFilters) {
  const { token } = useAdminToken();
  const query = buildQuery({
    page: filters.page,
    pageSize: filters.pageSize,
    type: filters.type,
    direction: filters.direction,
    createdFrom: filters.createdFrom,
    createdTo: filters.createdTo,
  });
  return useQuery({
    queryKey: [...TRANSACTIONS_KEY, filters] as const,
    enabled: !!token,
    queryFn: () => apiFetch<PageResult<WalletTransaction>>(`/admin/wallets/transactions?${query}`, token as string),
    refetchInterval: 15_000,
  });
}

export function useCustomerPayments(filters: PaginationParams & { status?: PaymentStatus }) {
  const { token } = useAdminToken();
  const query = buildQuery({
    page: filters.page,
    pageSize: filters.pageSize,
    status: filters.status,
  });
  return useQuery({
    queryKey: [...PAYMENTS_KEY, filters] as const,
    enabled: !!token,
    queryFn: () => apiFetch<PageResult<CustomerPayment>>(`/admin/payments?${query}`, token as string),
  });
}

export function usePayoutRequests(filters: PaginationParams & { status?: PayoutStatus }) {
  const { token } = useAdminToken();
  const query = buildQuery({
    page: filters.page,
    pageSize: filters.pageSize,
    status: filters.status,
  });
  return useQuery({
    queryKey: [...PAYOUTS_KEY, filters] as const,
    enabled: !!token,
    queryFn: () => apiFetch<PageResult<PayoutRequest>>(`/admin/wallets/payouts?${query}`, token as string),
  });
}

export function useReviewPayout() {
  const { token } = useAdminToken();
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      decision,
      referenceCode,
      rejectReason,
    }: {
      id: string;
      decision: "PAID" | "REJECTED";
      referenceCode?: string;
      rejectReason?: string;
    }) =>
      apiFetch<PayoutRequest>(`/admin/wallets/payouts/${id}/review`, token as string, {
        method: "PATCH",
        body: JSON.stringify({ decision, referenceCode, rejectReason }),
      }),
    onSuccess: () =>
      Promise.all([
        client.invalidateQueries({ queryKey: PAYOUTS_KEY }),
        client.invalidateQueries({ queryKey: ACCOUNTING_KEY }),
        client.invalidateQueries({ queryKey: TRANSACTIONS_KEY }),
      ]),
  });
}

export function useUpdateCommission() {
  const { token } = useAdminToken();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (commissionRate: number) =>
      apiFetch<WalletConfiguration>("/admin/wallets/configuration/commission", token as string, {
        method: "PUT",
        body: JSON.stringify({ commissionRate }),
      }),
    onSuccess: () =>
      Promise.all([
        client.invalidateQueries({ queryKey: CONFIGURATION_KEY }),
        client.invalidateQueries({ queryKey: ACCOUNTING_KEY }),
      ]),
  });
}
