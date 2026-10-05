"use client";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";

import { apiFetch } from "./api";
import { buildServiceRequestsQuery, type ServiceRequestFilters, type ServiceRequestRow } from "./data";

type ServiceRequestsResponse =
  | ServiceRequestRow[]
  | { data: ServiceRequestRow[] }
  | { items: ServiceRequestRow[]; total: number };

function extractPage(json: ServiceRequestsResponse) {
  if (Array.isArray(json)) return { rows: json, total: json.length };
  if ("items" in json) return { rows: json.items, total: json.total };
  if ("data" in json) return { rows: json.data, total: json.data.length };
  return { rows: [], total: 0 };
}

export function useServiceRequests(filters: ServiceRequestFilters) {
  const { data: session, status } = useSession();
  const token = session?.accessToken as string | undefined;
  const query = buildServiceRequestsQuery(filters);

  return useQuery({
    queryKey: ["service-requests", filters] as const,
    enabled: !!token,
    queryFn: async () => {
      const json = await apiFetch<ServiceRequestsResponse>(`/admin/service-requests?${query}`, token as string);
      return extractPage(json);
    },
    meta: { sessionStatus: status },
  });
}
