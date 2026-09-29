export type DocumentType =
  | "NATIONAL_CARD"
  | "BUSINESS_LICENSE"
  | "CERTIFICATE"
  | "COMMITMENT_LETTER"
  | "CRIMINAL_RECORD"
  | "OTHER";

export type DocumentStatus = "PENDING" | "APPROVED" | "REJECTED";

export type ProviderDocument = {
  id: string;
  providerProfileId: string;
  type: DocumentType;
  url: string;
  publicId: string;
  status: DocumentStatus;
  rejectionNote: string | null;
  createdAt: string;
  updatedAt: string;
};

// بدنه‌ی درخواست PATCH /admin/providers/documents/:documentId/review
export type DocumentReviewDecision = { decision: "APPROVED" } | { decision: "REJECTED"; rejectionNote: string };

export const documentTypeMeta: Record<DocumentType, { label: string }> = {
  NATIONAL_CARD: { label: "کارت ملی" },
  BUSINESS_LICENSE: { label: "جواز کسب" },
  CERTIFICATE: { label: "گواهینامه" },
  COMMITMENT_LETTER: { label: "تعهدنامه" },
  CRIMINAL_RECORD: { label: "گواهی عدم سوءپیشینه" },
  OTHER: { label: "سایر" },
};

export const documentStatusMeta: Record<DocumentStatus, { label: string; dotClass: string }> = {
  PENDING: { label: "در انتظار بررسی", dotClass: "bg-amber-500" },
  APPROVED: { label: "تأیید شده", dotClass: "bg-emerald-500" },
  REJECTED: { label: "رد شده", dotClass: "bg-destructive" },
};

// همه‌ی انواع مدرک به‌جز OTHER اجباری‌اند (طبق منطق بک‌اند)
export const MANDATORY_DOCUMENT_TYPES: DocumentType[] = [
  "NATIONAL_CARD",
  "BUSINESS_LICENSE",
  "CERTIFICATE",
  "COMMITMENT_LETTER",
  "CRIMINAL_RECORD",
];
