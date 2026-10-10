export type VerificationStatus = "PENDING" | "APPROVED" | "REJECTED";

export type ProviderRow = {
  id: string;
  bio: string | null;
  rating: number;
  isVerified: boolean;
  verificationStatus: VerificationStatus;
  verificationNote: string | null;
  verifiedAt: string | null;
  isAvailable: boolean;
  avatarUrl: string | null;
  serviceAreaLatitude: number | null;
  serviceAreaLongitude: number | null;
  user: { name: string; email: string; phone: string; status: "ACTIVE" | "INACTIVE" | "SUSPENDED" };
  skills: { id: string; name: string }[];
  workingHours: {
    dayOfWeek: number;
    isActive: boolean;
    startTime: string;
    endTime: string;
  }[];
  createdAt: string;
  updatedAt: string;
};

export const availabilityMeta = {
  available: { label: "آماده به کار", dotClass: "bg-emerald-500" },
  unavailable: { label: "غیرفعال", dotClass: "bg-muted-foreground" },
} as const;

export const filters = {
  availability: ["All", "available", "unavailable"],
};
