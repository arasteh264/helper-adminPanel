"use server";

import { auth } from "@/auth";
import { API_BASE_URL } from "@/lib/api-url";

export type ProviderStory = {
  id: string;
  title: string;
  description: string | null;
  providerName: string;
  providerProfileId: string;
  status: "PENDING_REVIEW" | "APPROVED" | "REJECTED" | "EXPIRED";
  submittedAt: string | null;
  mediaType: "IMAGE" | "VIDEO";
  mediaUrl: string;
  thumbnailUrl: string | null;
  durationSeconds: number | null;
  specialtyName: string | null;
  specialtyGroupName: string | null;
  overlayText: string | null;
  overlayColor: string;
  overlayFontSize: number;
  overlayPositionX: number;
  overlayPositionY: number;
  viewsCount: number;
  uniqueViewers: number;
  isPaid: boolean;
  priceToman: number | null;
  paymentStatus: string | null;
  monetizationStatus: string;
  expiresAt: string | null;
};

export type ProviderStoryList = {
  stories: ProviderStory[];
  total: number;
  page: number;
  pageSize: number;
};

export type ProviderStoryAccessItem = {
  providerProfileId: string;
  providerName: string;
  email: string;
  isVerified: boolean;
  canPublishStories: boolean;
  canViewStoryStats: boolean;
};

export type StoryApprovalLog = {
  id: string;
  action: string;
  comment: string | null;
  createdAt: string;
  admin: { name: string };
};

async function requestAdmin<T>(path: string, method = "GET", body?: unknown): Promise<T> {
  const session = await auth();
  if (!session?.accessToken) {
    throw new Error("برای این عملیات وارد حساب ادمین شوید.");
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  } catch {
    throw new Error("ارتباط با سرویس مدیریت استوری برقرار نشد.");
  }

  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as { message?: string | string[] } | null;
    const message = Array.isArray(data?.message) ? data.message.join("، ") : data?.message;
    throw new Error(message || `عملیات ناموفق بود (${response.status}).`);
  }

  return (await response.json()) as T;
}

export async function getProviderStories(status: ProviderStory["status"], page: number): Promise<ProviderStoryList> {
  const params = new URLSearchParams({ status, page: String(page), pageSize: "12" });
  return requestAdmin(`/admin/provider-stories?${params}`);
}

export async function getProviderStoryReport() {
  return requestAdmin<{
    paidStoriesCount: number;
    freeStoriesCount: number;
    totalRevenueFromStories: number;
    pendingApprovalCount: number;
    totalViewsAcrossStories: number;
  }>("/admin/provider-stories/financial-report");
}

export async function approveProviderStory(storyId: string, comment: string) {
  return requestAdmin(`/admin/provider-stories/${encodeURIComponent(storyId)}/approve`, "POST", { comment });
}

export async function rejectProviderStory(storyId: string, rejectionReason: string) {
  return requestAdmin(`/admin/provider-stories/${encodeURIComponent(storyId)}/reject`, "POST", { rejectionReason });
}

export async function setProviderStoryPricing(storyId: string, isPaid: boolean, priceToman?: number) {
  return requestAdmin(`/admin/provider-stories/${encodeURIComponent(storyId)}/pricing`, "POST", {
    isPaid,
    ...(isPaid ? { priceToman } : {}),
  });
}

export async function getProviderStoryApprovalLog(storyId: string): Promise<StoryApprovalLog[]> {
  return requestAdmin(`/admin/provider-stories/${encodeURIComponent(storyId)}/approval-log`);
}

export async function getProviderStoryAccess(page: number, search: string) {
  const params = new URLSearchParams({ page: String(page), pageSize: "20", ...(search ? { search } : {}) });
  return requestAdmin<{
    items: ProviderStoryAccessItem[];
    page: number;
    pageSize: number;
    total: number;
  }>(`/admin/provider-stories/providers?${params}`);
}

export async function updateProviderStoryAccess(
  providerProfileId: string,
  canPublishStories: boolean,
  canViewStoryStats: boolean,
) {
  return requestAdmin(`/admin/provider-stories/providers/${encodeURIComponent(providerProfileId)}/access`, "PATCH", {
    canPublishStories,
    canViewStoryStats,
  });
}

export async function getProviderStoryUploadSettings() {
  return requestAdmin<{ videoMaxSizeMB: number }>("/admin/provider-stories/upload-settings");
}

export async function updateProviderStoryUploadSettings(videoMaxSizeMB: number) {
  return requestAdmin<{ videoMaxSizeMB: number }>("/admin/provider-stories/upload-settings", "PATCH", {
    videoMaxSizeMB,
  });
}
