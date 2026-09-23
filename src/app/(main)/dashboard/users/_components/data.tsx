const teamValues = [
  "Platform",
  "Growth",
  "Revenue",
  "Customer Ops",
  "Internal Tools",
  "Compliance",
  "People Ops",
  "Finance",
] as const;

export type UserTeam = (typeof teamValues)[number];
export type UserStatus = "َActive" | "Pending invite" | "Deactivated" | "Locked" | "Suspended";
export type UserRole = "مشتری" | "مدیر" | "پشتیبان";
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
  role: [
    "All",
    "Workspace Owner",
    "Admin",
    "Billing Admin",
    "Security Admin",
    "Team Lead",
    "Contributor",
    "Guest",
    "Read-only",
  ],
  team: ["All", ...teamValues],
  status: ["All", "Active", "Pending invite", "Deactivated", "Locked", "Suspended"],
  workspace: ["All", "Weblabs Studio", "Sandbox", "Internal Tools", "Acme Inc."],
};

export const statusMeta: Record<UserStatus, { badgeClass: string; dotClass: string }> = {
  "َActive": {
    badgeClass: "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    dotClass: "bg-emerald-500",
  },
  "Pending invite": {
    badgeClass: "border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400",
    dotClass: "bg-amber-500",
  },
  Deactivated: {
    badgeClass: "border-border bg-muted/50 text-muted-foreground",
    dotClass: "bg-muted-foreground",
  },
  Locked: {
    badgeClass: "border-destructive/20 bg-destructive/10 text-destructive",
    dotClass: "bg-destructive",
  },
  Suspended: {
    badgeClass: "border-orange-500/20 bg-orange-500/10 text-orange-600 dark:text-orange-400",
    dotClass: "bg-orange-500",
  },
};
