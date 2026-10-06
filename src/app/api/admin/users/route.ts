import type { UserRole, UserRow, UserStatus } from "@/app/(main)/dashboard/users/_components/data";
import { auth } from "@/auth";
import { API_BASE_URL } from "@/lib/api-url";

type ApiUser = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
};

type ApiUsersResponse = {
  items: ApiUser[];
  total: number;
};

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.accessToken) {
    return Response.json({ message: "برای دریافت کاربران وارد حساب ادمین شوید." }, { status: 401 });
  }

  const requested = new URL(request.url).searchParams;
  const page = Number(requested.get("page") ?? "1");
  const pageSize = Number(requested.get("pageSize") ?? "10");
  const search = requested.get("search")?.trim() ?? "";

  const invalidPagination =
    !Number.isSafeInteger(page) || page < 1 || !Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > 100;
  if (invalidPagination) {
    return Response.json({ message: "مقادیر صفحه‌بندی معتبر نیستند." }, { status: 400 });
  }

  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
    ...(search ? { search } : {}),
  });
  const response = await fetch(`${API_BASE_URL}/users?${params}`, {
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${session.accessToken}`,
    },
  });

  if (!response.ok) {
    return Response.json({ message: "دریافت اطلاعات کاربران از سرویس ناموفق بود." }, { status: response.status });
  }

  const data: ApiUsersResponse = await response.json();
  const items: UserRow[] = data.items.map((user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    status: user.status,
    joinedDate: user.createdAt,
  }));

  return Response.json({ items, total: data.total }, { headers: { "Cache-Control": "no-store" } });
}
