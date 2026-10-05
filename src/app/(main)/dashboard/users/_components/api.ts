import type { UserRole, UserRow, UserStatus } from "./data";

type ApiUser = {
  id: string;
  _name: string;
  _email: string;
  _phone: string;
  _role: UserRole;
  _status: UserStatus;
  createdAt: string;
};

type ApiUsersResponse = {
  items: ApiUser[];
  total: number;
};

function mapUser(user: ApiUser): UserRow {
  return {
    id: user.id,
    name: user._name,
    email: user._email,
    phone: user._phone,
    role: user._role,
    status: user._status,
    joinedDate: user.createdAt,
  };
}

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
  return { items: data.items.map(mapUser), total: data.total };
}
