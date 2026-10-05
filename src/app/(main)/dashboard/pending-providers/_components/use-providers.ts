"use client";

import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";

import { apiFetch } from "./api";
import type { ProviderRow } from "./data";

type PendingProviderFilters = {
  page: number;
  pageSize: number;
  search: string;
  availability: "All" | "available" | "unavailable";
};

export function usePendingProviders(
  filters: PendingProviderFilters = {
    page: 1,
    pageSize: 1,
    search: "",
    availability: "All",
  },
) {
  const { data: session, status } = useSession();
  const token = session?.accessToken;
  const params = new URLSearchParams({
    page: String(filters.page),
    pageSize: String(filters.pageSize),
  });
  if (filters.search) params.set("search", filters.search);
  if (filters.availability !== "All") {
    params.set("available", String(filters.availability === "available"));
  }

  return useQuery({
    queryKey: ["providers", "pending", filters] as const,
    enabled: !!token,
    queryFn: async () => {
      const json = await apiFetch<{ items: ProviderRow[]; total: number }>(
        `/admin/providers/pending?${params}`,
        token as string,
      );
      return json;
    },
    meta: { sessionStatus: status },
  });
}
