import type { UserRow } from "./data";

type ApiUsersResponse = {
  items: UserRow[];
  total: number;
};

export async function getUsers({
  page,
  pageSize,
  search,
}: {
  page: number;
  pageSize: number;
  search: string;
}): Promise<{ items: UserRow[]; total: number }> {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
    ...(search ? { search } : {}),
  });
  const response = await fetch(`/api/admin/users?${params}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    const error = (await response.json()) as { message?: string };
    throw new Error(error.message ?? `دریافت کاربران ناموفق بود (${response.status})`);
  }

  const data: ApiUsersResponse = await response.json();
  return data;
}
