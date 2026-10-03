"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";

import { apiFetch, type Specialty, type SpecialtyGroup, unwrapData } from "./api";

const GROUPS_KEY = ["admin-specialty-groups"] as const;
const SPECIALTIES_KEY = ["admin-specialties"] as const;

function useAdminToken() {
  const { data: session, status } = useSession();
  return { token: session?.accessToken as string | undefined, status };
}

export function useSpecialtyGroups() {
  const { token } = useAdminToken();

  return useQuery({
    queryKey: GROUPS_KEY,
    enabled: !!token,
    queryFn: async () =>
      unwrapData(
        await apiFetch<SpecialtyGroup[] | { data: SpecialtyGroup[] }>("/admin/specialties/groups", token as string),
      ),
  });
}

export function useSpecialtiesByGroup(groupId?: string) {
  const { token } = useAdminToken();

  return useQuery({
    queryKey: [...SPECIALTIES_KEY, groupId],
    enabled: !!token && !!groupId,
    queryFn: async () =>
      unwrapData(
        await apiFetch<Specialty[] | { data: Specialty[] }>(
          `/admin/specialties/groups/${groupId}/specialties`,
          token as string,
        ),
      ),
  });
}

export function useSaveSpecialtyGroup() {
  const { token } = useAdminToken();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, formData }: { id?: string; formData: FormData }) =>
      apiFetch<SpecialtyGroup>(id ? `/admin/specialties/groups/${id}` : "/admin/specialties/groups", token!, {
        method: id ? "PATCH" : "POST",
        body: formData,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: GROUPS_KEY }),
  });
}

export function useSaveSpecialty() {
  const { token } = useAdminToken();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, formData }: { id?: string; formData: FormData }) =>
      apiFetch<Specialty>(id ? `/admin/specialties/${id}` : "/admin/specialties", token!, {
        method: id ? "PATCH" : "POST",
        body: formData,
      }),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: SPECIALTIES_KEY }),
        queryClient.invalidateQueries({ queryKey: GROUPS_KEY }),
      ]),
  });
}

export function useDeleteSpecialtyGroup() {
  const { token } = useAdminToken();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<void>(`/admin/specialties/groups/${id}`, token!, {
        method: "DELETE",
      }),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: GROUPS_KEY }),
        queryClient.invalidateQueries({ queryKey: SPECIALTIES_KEY }),
      ]),
  });
}

export function useDeleteSpecialty() {
  const { token } = useAdminToken();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiFetch<void>(`/admin/specialties/${id}`, token!, { method: "DELETE" }),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: SPECIALTIES_KEY }),
        queryClient.invalidateQueries({ queryKey: GROUPS_KEY }),
      ]),
  });
}
