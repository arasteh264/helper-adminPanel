"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";

import { apiFetch } from "./api";
import type { ProviderRow } from "./data";

const KEY = ["providers", "pending"] as const;

export function usePendingProviders() {
  const { data: session, status } = useSession();
  const token = session?.accessToken;

  return useQuery({
    queryKey: KEY,
    enabled: !!token,
    queryFn: async () => {
      const json = await apiFetch<ProviderRow[] | { data: ProviderRow[] }>("/admin/providers/pending", token as string);
      return Array.isArray(json) ? json : json.data;
    },
    meta: { sessionStatus: status },
  });
}

export function useVerifyProvider() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status, note }: { id: string; status: "APPROVED" | "REJECTED"; note?: string }) =>
      apiFetch(`/admin/providers/${id}/verification`, session?.accessToken as string, {
        method: "PATCH",
        body: JSON.stringify({ status, note }),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}
