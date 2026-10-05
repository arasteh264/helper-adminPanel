import { auth } from "@/auth";

const API_URL = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL;

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  return forward(await params, "GET");
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return forward(await params, "PATCH", await request.text());
}

async function forward({ id }: { id: string }, method: "GET" | "PATCH", body?: string) {
  const session = await auth();
  if (!session?.accessToken) {
    return Response.json({ message: "برای مدیریت وبلاگ وارد حساب ادمین شوید." }, { status: 401 });
  }
  if (!API_URL) {
    return Response.json({ message: "نشانی API در تنظیمات سرور تعریف نشده است." }, { status: 500 });
  }

  try {
    const response = await fetch(`${API_URL.replace(/\/$/, "")}/admin/blog/${encodeURIComponent(id)}`, {
      method,
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      ...(body ? { body } : {}),
    });
    const responseBody = await response.text();
    return new Response(responseBody, {
      status: response.status,
      headers: {
        "Content-Type": response.headers.get("content-type") ?? "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return Response.json({ message: "ارتباط با سرویس وبلاگ برقرار نشد." }, { status: 502 });
  }
}
