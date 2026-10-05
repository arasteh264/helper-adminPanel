"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { API_BASE_URL } from "@/lib/api-url";

type ActionResult = { ok: true } | { ok: false; message: string };

async function updateProviderVerification(
  providerId: string,
  status: "APPROVED" | "REJECTED",
  note?: string,
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.accessToken) {
    return { ok: false, message: "برای این عملیات وارد حساب ادمین شوید." };
  }

  const response = await fetch(`${API_BASE_URL}/admin/providers/${encodeURIComponent(providerId)}/review`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.accessToken}`,
    },
    body: JSON.stringify({ status, note }),
    cache: "no-store",
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string | string[] } | null;
    const message = Array.isArray(body?.message) ? body.message.join("، ") : body?.message;
    return {
      ok: false,
      message: message || `بررسی متخصص ناموفق بود (${response.status}).`,
    };
  }

  revalidatePath("/dashboard/pending-providers");
  revalidatePath("/dashboard/providers");
  return { ok: true };
}

export async function approveProvider(providerId: string): Promise<ActionResult> {
  return updateProviderVerification(providerId, "APPROVED");
}

export async function rejectProvider(providerId: string, note: string): Promise<ActionResult> {
  return updateProviderVerification(providerId, "REJECTED", note);
}
