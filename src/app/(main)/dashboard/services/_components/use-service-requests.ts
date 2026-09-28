"use client";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";

import { apiFetch } from "./api";
import { buildServiceRequestsQuery, type ServiceRequestFilters, type ServiceRequestRow } from "./data";

type ServiceRequestsResponse =
  | ServiceRequestRow[]
  | { data: ServiceRequestRow[] }
  | { items: ServiceRequestRow[]; total: number };

function extractRows(json: ServiceRequestsResponse): ServiceRequestRow[] {
  if (Array.isArray(json)) return json;
  if ("items" in json) return json.items;
  if ("data" in json) return json.data;
  return [];
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
      return extractRows(json);
    },
    meta: { sessionStatus: status },
  });
}
