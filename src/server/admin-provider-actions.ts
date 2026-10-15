"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { API_BASE_URL } from "@/lib/api-url";
import { normalizeIranianMobile } from "@/lib/iranian-phone";

type ActionResult = { ok: true } | { ok: false; message: string };
type ProviderInvitationResult =
  | { ok: true; id: string; phone: string; message: string; expiresAt: string }
  | { ok: false; message: string };
export type ProviderInvitationInput = {
  phone: string;
  name: string;
  specialty: string;
};
export type ProviderInvitationListItem = {
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
export type ProviderInvitationBatchResult = {
  total: number;
  sent: number;
  failed: number;
  items: {
    id?: string;
    phone: string;
    success: boolean;
    message: string;
    expiresAt?: string;
  }[];
};
export type ProviderInvitationReminderBatchResult = {
  total: number;
  sent: number;
  failed: number;
  items: {
    id: string;
    phone: string;
    success: boolean;
    message: string;
  }[];
};

async function getAdminAccessToken() {
  const session = await auth();
  return session?.accessToken ?? null;
}

async function getApiErrorMessage(response: Response, fallback: string) {
  const body = (await response.json().catch(() => null)) as {
    message?: string | string[];
  } | null;
  const message = Array.isArray(body?.message) ? body.message.join("، ") : body?.message;
  return message || `${fallback} (${response.status}).`;
}

export async function createProviderInvitation(input: ProviderInvitationInput): Promise<ProviderInvitationResult> {
  const normalizedPhone = normalizeIranianMobile(input.phone);
  if (!normalizedPhone) {
    return { ok: false, message: "شماره موبایل معتبر وارد کنید." };
  }

  const accessToken = await getAdminAccessToken();
  if (!accessToken) {
    return { ok: false, message: "برای این عملیات وارد حساب ادمین شوید." };
  }

  const response = await fetch(`${API_BASE_URL}/admin/providers/invitations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      ...input,
      phone: normalizedPhone,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    return {
      ok: false,
      message: await getApiErrorMessage(response, "ارسال دعوت‌نامه ناموفق بود"),
    };
  }

  const body = (await response.json()) as {
    id?: unknown;
    phone?: unknown;
    message?: unknown;
    expiresAt?: unknown;
  };
  if (
    typeof body.id !== "string" ||
    typeof body.phone !== "string" ||
    typeof body.message !== "string" ||
    typeof body.expiresAt !== "string"
  ) {
    throw new Error("پاسخ سرویس دعوت متخصص معتبر نیست.");
  }

  revalidatePath("/dashboard/providers/invitations");
  return {
    ok: true,
    id: body.id,
    phone: body.phone,
    message: body.message,
    expiresAt: body.expiresAt,
  };
}

export async function getProviderInvitations(): Promise<ProviderInvitationListItem[]> {
  const accessToken = await getAdminAccessToken();
  if (!accessToken) {
    throw new Error("برای مشاهده دعوت‌ها وارد حساب ادمین شوید.");
  }

  const response = await fetch(`${API_BASE_URL}/admin/providers/invitations`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(await getApiErrorMessage(response, "دریافت فهرست دعوت‌ها ناموفق بود"));
  }

  const body = (await response.json()) as {
    items?: ProviderInvitationListItem[];
  };
  if (!Array.isArray(body.items)) {
    throw new Error("پاسخ فهرست دعوت‌های متخصص معتبر نیست.");
  }
  return body.items;
}

export async function createProviderInvitationBatch(
  items: ProviderInvitationInput[],
): Promise<ProviderInvitationBatchResult> {
  if (items.length < 1 || items.length > 100) {
    return {
      total: items.length,
      sent: 0,
      failed: items.length,
      items: items.map(({ phone }) => ({
        phone,
        success: false,
        message: "در هر نوبت بین ۱ تا ۱۰۰ دعوت‌نامه ارسال کنید.",
      })),
    };
  }

  const accessToken = await getAdminAccessToken();
  if (!accessToken) {
    throw new Error("برای این عملیات وارد حساب ادمین شوید.");
  }

  const response = await fetch(`${API_BASE_URL}/admin/providers/invitations/batch`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ items }),
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(await getApiErrorMessage(response, "ارسال گروهی دعوت‌ها ناموفق بود"));
  }

  const result = (await response.json()) as ProviderInvitationBatchResult;
  revalidatePath("/dashboard/providers/invitations");
  return result;
}

export async function remindProviderInvitation(invitationId: string) {
  const accessToken = await getAdminAccessToken();
  if (!accessToken) {
    return { ok: false as const, message: "برای این عملیات وارد حساب ادمین شوید." };
  }

  const response = await fetch(
    `${API_BASE_URL}/admin/providers/invitations/${encodeURIComponent(invitationId)}/remind`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    },
  );
  if (!response.ok) {
    return {
      ok: false as const,
      message: await getApiErrorMessage(response, "ارسال یادآوری دعوت‌نامه ناموفق بود"),
    };
  }

  revalidatePath("/dashboard/providers/invitations");
  return { ok: true as const, message: "یادآوری دعوت‌نامه ارسال شد." };
}

export async function remindProviderInvitations(invitationIds: string[]) {
  if (invitationIds.length < 1 || invitationIds.length > 100) {
    return {
      total: invitationIds.length,
      sent: 0,
      failed: invitationIds.length,
      items: invitationIds.map((id) => ({
        id,
        phone: "",
        success: false,
        message: "در هر نوبت بین ۱ تا ۱۰۰ یادآوری ارسال کنید.",
      })),
    };
  }

  const accessToken = await getAdminAccessToken();
  if (!accessToken) {
    throw new Error("برای این عملیات وارد حساب ادمین شوید.");
  }

  const response = await fetch(`${API_BASE_URL}/admin/providers/invitations/remind-batch`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ invitationIds }),
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(await getApiErrorMessage(response, "ارسال یادآوری‌های گروهی ناموفق بود"));
  }

  const result = (await response.json()) as ProviderInvitationReminderBatchResult;
  revalidatePath("/dashboard/providers/invitations");
  return result;
}

/* Existing provider-review actions continue below. */

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
