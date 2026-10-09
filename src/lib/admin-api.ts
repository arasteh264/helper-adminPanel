import { API_BASE_URL } from "@/lib/api-url";

export async function adminApiFetch<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...init?.headers,
    },
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string | string[] } | null;
    const message = Array.isArray(body?.message) ? body.message.join("، ") : body?.message;
    throw new Error(message || `درخواست ناموفق بود (${response.status})`);
  }
  return response.status === 204 ? (undefined as T) : ((await response.json()) as T);
}

export async function downloadAdminCsv(dataset: string, token: string): Promise<{ truncated: boolean }> {
  const response = await fetch(`${API_BASE_URL}/admin/exports?type=${encodeURIComponent(dataset)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error(`دریافت خروجی ناموفق بود (${response.status})`);

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${dataset}-${new Date().toISOString().slice(0, 10)}.csv`;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  return { truncated: response.headers.get("X-Export-Truncated") === "true" };
}
