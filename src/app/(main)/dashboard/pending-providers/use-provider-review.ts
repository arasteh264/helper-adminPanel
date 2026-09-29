"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";

import { apiFetch } from "./_components/api";
import type { DocumentReviewDecision, ProviderDocument } from "./_components/documents";

const PENDING_KEY = ["providers", "pending"] as const;
const documentsKey = (providerProfileId: string) => ["providers", "documents", providerProfileId] as const;

// GET /admin/providers/:providerProfileId/documents
export function useProviderDocuments(providerProfileId: string | undefined) {
  const { data: session } = useSession();
  const token = session?.accessToken;

  return useQuery({
    queryKey: documentsKey(providerProfileId ?? "idle"),
    enabled: !!token && !!providerProfileId,
    queryFn: () => apiFetch<ProviderDocument[]>(`/admin/providers/${providerProfileId}/documents`, token as string),
  });
}

type ReviewDocumentInput = {
  documentId: string;
  providerProfileId: string;
} & DocumentReviewDecision;

// PATCH /admin/providers/documents/:documentId/review
export function useReviewDocument() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ documentId, providerProfileId, ...decision }: ReviewDocumentInput) =>
      apiFetch(`/admin/providers/documents/${documentId}/review`, session?.accessToken as string, {
        method: "PATCH",
        body: JSON.stringify(decision),
      }),
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: PENDING_KEY }),
        queryClient.invalidateQueries({
          queryKey: documentsKey(variables.providerProfileId),
        }),
      ]);
    },
  });
}

type ReviewProviderInput = {
  providerId: string;
} & ({ status: "APPROVED" } | { status: "REJECTED"; note?: string });

// PATCH /admin/providers/:providerId/review
export function useReviewProvider() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ providerId, ...body }: ReviewProviderInput) =>
      apiFetch(`/admin/providers/${providerId}/review`, session?.accessToken as string, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PENDING_KEY }),
  });
}
