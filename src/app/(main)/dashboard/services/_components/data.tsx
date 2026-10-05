// dashboard/service-requests/_components/data.ts
export type ServiceRequestStatus =
  | "OPEN"
  | "OFFER_ACCEPTED"
  | "CUSTOMER_CONFIRMATION_PENDING"
  | "IN_PROGRESS"
  | "AWAITING_CUSTOMER_CONFIRMATION"
  | "COMPLETED"
  | "CANCELLED"
  | "EXPIRED"
  | "DISPUTED";

export type PreferredTime = "URGENT" | "THIS_WEEK" | "FLEXIBLE";

export type ServiceRequestRow = {
  id: string;
  customerId: string;
  customer?: { name: string; email: string; phone: string } | null;
  title: string;
  description: string;
  status: ServiceRequestStatus;
  address: string | null;
  preferredTime: PreferredTime | null;
  budgetMin: number | null;
  budgetMax: number | null;
  scheduledAt: string | null;
  skillIds: string[];
  skills?: { id: string; name: string }[];
  createdAt: string;
  updatedAt: string;
};

export const statusMeta: Record<ServiceRequestStatus, { label: string; dotClass: string }> = {
  OPEN: { label: "باز", dotClass: "bg-blue-500" },
  OFFER_ACCEPTED: {
    label: "پیشنهاد پذیرفته\u200cشده",
    dotClass: "bg-indigo-500",
  },
  CUSTOMER_CONFIRMATION_PENDING: {
    label: "در انتظار تأیید مشتری",
    dotClass: "bg-cyan-600",
  },
  IN_PROGRESS: { label: "در حال انجام", dotClass: "bg-amber-500" },
  AWAITING_CUSTOMER_CONFIRMATION: {
    label: "در انتظار تأیید نهایی",
    dotClass: "bg-teal-600",
  },
  COMPLETED: { label: "انجام\u200cشده", dotClass: "bg-emerald-500" },
  CANCELLED: { label: "لغوشده", dotClass: "bg-muted-foreground" },
  EXPIRED: { label: "منقضی\u200cشده", dotClass: "bg-muted-foreground" },
  DISPUTED: { label: "مناقشه\u200cدار", dotClass: "bg-red-500" },
};

export const preferredTimeMeta: Record<PreferredTime, string> = {
  URGENT: "فوری",
  THIS_WEEK: "همین هفته",
  FLEXIBLE: "منعطف",
};

export type ServiceRequestFilters = {
  page: number;
  pageSize: number;
  search?: string;
  status?: ServiceRequestStatus;
  customerId?: string;
  preferredTime?: PreferredTime;
  skillIds?: string[];
  budgetFrom?: number;
  budgetTo?: number;
  createdFrom?: string;
  createdTo?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
};

export function buildServiceRequestsQuery(filters: ServiceRequestFilters) {
  const params = new URLSearchParams();

  params.set("page", String(filters.page));
  params.set("pageSize", String(filters.pageSize));
  if (filters.search) params.set("search", filters.search);
  if (filters.status) params.set("status", filters.status);
  if (filters.customerId) params.set("customerId", filters.customerId);
  if (filters.preferredTime) params.set("preferredTime", filters.preferredTime);
  if (filters.skillIds?.length) params.set("skillIds", filters.skillIds.join(","));
  if (filters.budgetFrom != null) params.set("budgetFrom", String(filters.budgetFrom));
  if (filters.budgetTo != null) params.set("budgetTo", String(filters.budgetTo));
  if (filters.createdFrom) params.set("createdFrom", filters.createdFrom);
  if (filters.createdTo) params.set("createdTo", filters.createdTo);
  params.set("sortBy", filters.sortBy ?? "createdAt");
  params.set("sortOrder", filters.sortOrder ?? "desc");

  return params.toString();
}

export function toStartOfDayIso(date: string) {
  return date ? new Date(`${date}T00:00:00.000Z`).toISOString() : undefined;
}
export function toEndOfDayIso(date: string) {
  return date ? new Date(`${date}T23:59:59.999Z`).toISOString() : undefined;
}
