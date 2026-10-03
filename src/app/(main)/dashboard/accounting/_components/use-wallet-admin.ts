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

const ACCOUNTING_KEY = ["admin-wallet-accounting"] as const;
const CONFIGURATION_KEY = ["admin-wallet-configuration"] as const;
const TRANSACTIONS_KEY = ["admin-wallet-transactions"] as const;
const PAYMENTS_KEY = ["admin-payments"] as const;
const PAYOUTS_KEY = ["admin-wallet-payouts"] as const;

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

export function useAccountingSummary() {
  const { token } = useAdminToken();
  return useQuery({
    queryKey: ACCOUNTING_KEY,
    enabled: !!token,
    queryFn: () => apiFetch<AccountingSummary>("/admin/wallets/accounting", token as string),
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
