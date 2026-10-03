export type UserStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED";
export type UserRole = "CUSTOMER" | "PROVIDER" | "ADMIN";
export type UserRow = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  status: UserStatus;
  joinedDate: string;
};

export const filters = {
  role: ["All", "CUSTOMER", "PROVIDER", "ADMIN"] as const,
  status: ["All", "ACTIVE", "INACTIVE", "SUSPENDED"] as const,
};

export const roleLabels: Record<UserRole, string> = {
  CUSTOMER: "مشتری",
  PROVIDER: "ارائه‌دهنده",
  ADMIN: "مدیر",
};

export const statusMeta: Record<UserStatus, { label: string; badgeClass: string; dotClass: string }> = {
  ACTIVE: {
    label: "فعال",
    badgeClass: "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    dotClass: "bg-emerald-500",
  },
  INACTIVE: {
    label: "غیرفعال",
    badgeClass: "border-border bg-muted/50 text-muted-foreground",
    dotClass: "bg-muted-foreground",
  },
  SUSPENDED: {
    label: "تعلیق‌شده",
    badgeClass: "border-orange-500/20 bg-orange-500/10 text-orange-600 dark:text-orange-400",
    dotClass: "bg-orange-500",
  },
};
