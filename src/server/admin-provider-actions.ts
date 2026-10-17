"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { API_BASE_URL } from "@/lib/api-url";
import { normalizeIranianMobile } from "@/lib/iranian-phone";

type ActionResult = { ok: true } | { ok: false; message: string };
type ProviderInvitationResult = { ok: true; message: string; expiresAt: string } | { ok: false; message: string };

export type ProviderInvitation = {
  id: string;
  phone: string;
  name: string | null;
  specialty: string | null;
  invitedAt: string;
  smsSentAt: string | null;
  expiresAt: string;
  registeredAt: string | null;
  verificationStatus: string | null;
  status: "REGISTERED" | "INVITED";
  canRemind: boolean;
};

export type ProviderInvitationBatchItem = {
  phone: string;
  name?: string;
  specialty?: string;
};

export type ProviderInvitationBatchResult = {
  total: number;
  sent: number;
  failed: number;
  items: { id?: string; phone: string; success: boolean; message: string; expiresAt?: string }[];
};

export async function getProviderInvitations(): Promise<ProviderInvitation[]> {
  const session = await auth();
  if (!session?.accessToken) {
    throw new Error("برای دریافت فهرست دعوت‌ها وارد حساب ادمین شوید.");
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/admin/providers/invitations`, {
      cache: "no-store",
      headers: { Authorization: `Bearer ${session.accessToken}` },
    });
  } catch {
    throw new Error("ارتباط با سرویس دعوت متخصص برقرار نشد.");
  }

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string | string[] } | null;
    const message = Array.isArray(body?.message) ? body.message.join("، ") : body?.message;
    throw new Error(message || `دریافت فهرست دعوت‌ها ناموفق بود (${response.status}).`);
  }

  const data = (await response.json()) as { items?: ProviderInvitation[] };
  if (!Array.isArray(data.items)) throw new Error("پاسخ فهرست دعوت‌ها معتبر نیست.");
  return data.items;
}

export async function createProviderInvitationBatch(items: ProviderInvitationBatchItem[]) {
  if (items.length < 1 || items.length > 100) {
    throw new Error("فایل باید بین ۱ تا ۱۰۰ ردیف دعوت داشته باشد.");
  }

  const session = await auth();
  if (!session?.accessToken) {
    throw new Error("برای ارسال دعوت‌ها وارد حساب ادمین شوید.");
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/admin/providers/invitations/batch`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.accessToken}`,
      },
      body: JSON.stringify({ items }),
      cache: "no-store",
    });
  } catch {
    throw new Error("ارتباط با سرویس دعوت متخصص برقرار نشد.");
  }

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string | string[] } | null;
    const message = Array.isArray(body?.message) ? body.message.join("، ") : body?.message;
    throw new Error(message || `ارسال گروهی دعوت‌ها ناموفق بود (${response.status}).`);
  }

  return (await response.json()) as ProviderInvitationBatchResult;
}

export async function remindProviderInvitations(invitationIds: string[]) {
  if (invitationIds.length < 1 || invitationIds.length > 100) {
    throw new Error("برای یادآوری، بین ۱ تا ۱۰۰ دعوت را انتخاب کنید.");
  }

  const session = await auth();
  if (!session?.accessToken) {
    throw new Error("برای ارسال یادآوری وارد حساب ادمین شوید.");
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/admin/providers/invitations/remind-batch`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.accessToken}`,
      },
      body: JSON.stringify({ invitationIds }),
      cache: "no-store",
    });
  } catch {
    throw new Error("ارتباط با سرویس دعوت متخصص برقرار نشد.");
  }

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string | string[] } | null;
    const message = Array.isArray(body?.message) ? body.message.join("، ") : body?.message;
    throw new Error(message || `ارسال یادآوری ناموفق بود (${response.status}).`);
  }

  return (await response.json()) as ProviderInvitationBatchResult;
}

export async function createProviderInvitation(phone: string): Promise<ProviderInvitationResult> {
  const normalizedPhone = normalizeIranianMobile(phone);
  if (!normalizedPhone) {
    return { ok: false, message: "شماره موبایل معتبر وارد کنید." };
  }

  const session = await auth();
  if (!session?.accessToken) {
    return { ok: false, message: "برای این عملیات وارد حساب ادمین شوید." };
  }

  const response = await fetch(`${API_BASE_URL}/admin/providers/invitations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.accessToken}`,
    },
    body: JSON.stringify({ phone: normalizedPhone }),
    cache: "no-store",
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string | string[] } | null;
    const message = Array.isArray(body?.message) ? body.message.join("، ") : body?.message;
    return {
      ok: false,
      message: message || `ارسال دعوت‌نامه ناموفق بود (${response.status}).`,
    };
  }

  const body = (await response.json()) as { message?: unknown; expiresAt?: unknown };
  if (typeof body.message !== "string" || typeof body.expiresAt !== "string") {
    throw new Error("پاسخ سرویس دعوت متخصص معتبر نیست.");
  }

  return { ok: true, message: body.message, expiresAt: body.expiresAt };
}

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
