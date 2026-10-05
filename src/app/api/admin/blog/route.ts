import { auth } from "@/auth";
import { API_BASE_URL } from "@/lib/api-url";

async function forward(request: Request, method: "GET" | "POST") {
  const session = await auth();
  if (!session?.accessToken) {
    return Response.json({ message: "برای مدیریت وبلاگ وارد حساب ادمین شوید." }, { status: 401 });
  }
  const requestUrl = new URL(request.url);
  const targetUrl = new URL("/admin/blog", API_BASE_URL);
  targetUrl.search = requestUrl.search;
  try {
    const response = await fetch(targetUrl, {
      method,
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        ...(method === "POST" ? { "Content-Type": "application/json" } : {}),
      },
      ...(method === "POST" ? { body: await request.text() } : {}),
    });
    const body = await response.text();
    return new Response(body, {
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

export function GET(request: Request) {
  return forward(request, "GET");
}

export function POST(request: Request) {
  return forward(request, "POST");
}
