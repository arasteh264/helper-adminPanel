import { API_BASE_URL } from "@/lib/api-url";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function apiFetch<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...init?.headers,
    },
  });

  if (!res.ok) {
    const errorBody = (await res.json().catch(() => null)) as {
      message?: string | string[];
    } | null;
    const message = Array.isArray(errorBody?.message) ? errorBody.message.join("، ") : errorBody?.message;
    throw new ApiError(res.status, message || `درخواست ناموفق بود (${res.status})`);
  }
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}
