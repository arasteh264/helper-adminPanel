"use client";

import { useState } from "react";

import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { adminApiFetch } from "@/lib/admin-api";

type AuditLog = {
  id: string;
  action: string;
  targetType: string;
  targetId: string;
  reason: string;
  beforeState: unknown;
  afterState: unknown;
  createdAt: string;
  actor: { name: string; email: string };
};

type AuditPage = { items: AuditLog[]; total: number; page: number; pageSize: number };
type AuditFilter =
  | "ALL"
  | "USER"
  | "PROVIDER"
  | "PROVIDER_DOCUMENT"
  | "PAYOUT"
  | "SERVICE_REQUEST"
  | "SPECIALTY"
  | "CHAT"
  | "COMMISSION"
  | "PLATFORM_SETTING";

const labels: Record<string, string> = {
  USER_SUSPENDED: "تعلیق حساب کاربر",
  USER_REACTIVATED: "فعال‌سازی حساب کاربر",
  PROVIDER_SUSPENDED: "تعلیق متخصص",
  PROVIDER_REACTIVATED: "فعال‌سازی متخصص",
  PROVIDER_PROFILE_UPDATED: "اصلاح اطلاعات پروفایل متخصص",
  PAYOUT_MARKED_PAID: "ثبت واریز برداشت",
  PAYOUT_REJECTED: "رد درخواست برداشت",
  DISPUTE_RESOLVED: "تعیین‌تکلیف اختلاف سرویس",
  SERVICE_REQUEST_APPROVED: "تأیید درخواست سرویس",
  SERVICE_REQUEST_REJECTED: "رد درخواست سرویس",
  SERVICE_REQUEST_REVIEW_SETTING_UPDATED: "تغییر نیاز به بررسی درخواست توسط مدیر",
  PROVIDER_APPROVED: "تأیید ثبت‌نام متخصص",
  PROVIDER_REJECTED: "رد ثبت‌نام متخصص",
  PROVIDER_AUTO_APPROVED_AFTER_DOCUMENTS: "تأیید خودکار پس از تکمیل مدارک",
  PROVIDER_DOCUMENT_APPROVED: "تأیید مدرک متخصص",
  PROVIDER_DOCUMENT_REJECTED: "رد مدرک متخصص",
  PROVIDER_WALLET_CREDITED: "تعدیل کیف پول متخصص",
  PROVIDER_BANK_ACCOUNT_UPDATED: "ویرایش حساب بانکی متخصص",
  COMMISSION_RATE_UPDATED: "تغییر نرخ کمیسیون",
  CHAT_CONVERSATION_STATUS_CHANGED: "تغییر وضعیت گفتگو",
  CHAT_MESSAGE_MODERATED: "مدیریت پیام گفتگو",
  SPECIALTY_GROUP_CREATED: "ایجاد گروه تخصص",
  SPECIALTY_GROUP_UPDATED: "ویرایش گروه تخصص",
  SPECIALTY_GROUP_DELETED: "حذف گروه تخصص",
  SPECIALTY_CREATED: "ایجاد تخصص",
  SPECIALTY_UPDATED: "ویرایش تخصص",
  SPECIALTY_DELETED: "حذف تخصص",
};
const targetLabels: Record<string, string> = {
  USER: "کاربر",
  PROVIDER: "متخصص",
  PAYOUT: "برداشت",
  SERVICE_REQUEST: "درخواست سرویس",
  PROVIDER_DOCUMENT: "مدرک متخصص",
  SPECIALTY: "تخصص",
  CHAT: "گفتگو",
  COMMISSION: "کمیسیون",
  PLATFORM_SETTING: "تنظیمات سامانه",
};
const dateFormatter = new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium", timeStyle: "short" });

const fieldLabels: Record<string, string> = {
  status: "وضعیت",
  verificationStatus: "وضعیت بررسی",
  name: "نام",
  email: "ایمیل",
  phone: "شماره تماس",
  bio: "معرفی",
  providerAddress: "نشانی",
  providerAddressType: "نوع نشانی",
  serviceAreaRadiusKm: "شعاع خدمت‌رسانی",
  specialties: "تخصص‌ها",
  skills: "مهارت‌ها",
  isAvailable: "آماده‌ی دریافت کار",
  isVerified: "تأیید تخصصی",
  isActive: "فعال بودن",
  pausedReason: "دلیل توقف گفتگو",
  moderationNote: "یادداشت بررسی پیام",
  rejectionNote: "دلیل رد",
  verificationNote: "یادداشت بررسی",
  rejectReason: "دلیل رد",
  resolutionNote: "یادداشت نتیجه‌ی اختلاف",
  commissionRate: "نرخ کمیسیون",
  requireServiceRequestReview: "بررسی درخواست توسط مدیر",
  amount: "مبلغ",
  amountToman: "مبلغ",
  balanceAfter: "موجودی پس از تغییر",
  releasedAmountToman: "مبلغ آزادشده",
  refundedAmountToman: "مبلغ بازپرداخت‌شده",
  refundDestination: "مقصد بازپرداخت",
  referenceCode: "کد پیگیری",
  bankName: "نام بانک",
  shebaLastFour: "چهار رقم پایانی شبا",
  resolution: "نتیجه‌ی اختلاف",
  pricingMode: "روش قیمت‌گذاری",
  hourlyRateToman: "نرخ ساعتی",
  sortOrder: "ترتیب نمایش",
  note: "یادداشت",
  reason: "دلیل",
  verifiedAt: "زمان تأیید",
};

const enumLabels: Record<string, string> = {
  ACTIVE: "فعال",
  INACTIVE: "غیرفعال",
  SUSPENDED: "تعلیق‌شده",
  PENDING: "در انتظار بررسی",
  APPROVED: "تأییدشده",
  REJECTED: "ردشده",
  OPEN: "باز",
  OFFER_ACCEPTED: "پیشنهاد پذیرفته‌شده",
  CUSTOMER_CONFIRMATION_PENDING: "در انتظار تأیید مشتری",
  IN_PROGRESS: "در حال انجام",
  AWAITING_CUSTOMER_CONFIRMATION: "در انتظار تأیید نهایی مشتری",
  COMPLETED: "انجام‌شده",
  CANCELLED: "لغوشده",
  EXPIRED: "منقضی‌شده",
  DISPUTED: "دارای اختلاف",
  PENDING_ADMIN_REVIEW: "در انتظار بررسی مدیر",
  PAID: "پرداخت‌شده",
  FAILED: "ناموفق",
  REFUNDED: "بازپرداخت‌شده",
  PROVIDER: "به نفع متخصص",
  BUYER: "به نفع مشتری",
  CUSTOMER_WALLET: "کیف پول مشتری",
  HOME: "منزل",
  BUSINESS: "کاری",
  QUOTE: "اعلام قیمت پس از بررسی",
  HOURLY: "ساعتی",
  PAUSED: "متوقف‌شده",
  CLOSED: "بسته‌شده",
  VISIBLE: "نمایش‌داده‌شده",
  HIDDEN: "پنهان‌شده",
};

const hiddenStateKeys = new Set(["id", "groupId", "userId", "providerProfileId", "walletTransactionId", "slug"]);

function formatStateValue(key: string, value: unknown): string {
  if (value == null || value === "") return "ثبت نشده";
  if (typeof value === "boolean") return value ? "بله" : "خیر";
  if (typeof value === "number") {
    const formatted = value.toLocaleString("fa-IR");
    if (key === "commissionRate") return `${formatted}٪`;
    if (key.toLowerCase().includes("toman") || key === "amount" || key === "balanceAfter") {
      return `${formatted} تومان`;
    }
    if (key === "serviceAreaRadiusKm") return `${formatted} کیلومتر`;
    if (key === "hourlyRateToman") return `${formatted} تومان در ساعت`;
    return formatted;
  }
  if (Array.isArray(value)) {
    return value.map((entry) => formatStateValue(key, entry)).join("، ");
  }
  if (typeof value === "object") {
    return Object.entries(value)
      .filter(([nestedKey]) => !hiddenStateKeys.has(nestedKey))
      .map(([nestedKey, nestedValue]) => {
        const nestedLabel = fieldLabels[nestedKey] ?? "جزئیات";
        return `${nestedLabel}: ${formatStateValue(nestedKey, nestedValue)}`;
      })
      .join(" · ");
  }

  const text = String(value);
  if (enumLabels[text]) return enumLabels[text];
  if (key.endsWith("At") && !Number.isNaN(Date.parse(text))) {
    return dateFormatter.format(new Date(text));
  }
  if (/^[A-Z][A-Z0-9_]+$/.test(text)) return "مقدار ثبت‌شده";
  return text;
}

function stateLabel(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "—";
  const fields = Object.entries(value).filter(([key]) => !hiddenStateKeys.has(key));
  if (!fields.length) return "جزئیات فنی ثبت شده است";
  return fields.map(([key, entry]) => `${fieldLabels[key] ?? "جزئیات"}: ${formatStateValue(key, entry)}`).join(" · ");
}

function reasonLabel(item: AuditLog) {
  if (item.action === "SERVICE_REQUEST_REVIEW_SETTING_UPDATED") {
    const enabled = item.reason.endsWith("=true");
    return enabled ? "بررسی مدیر برای درخواست‌های جدید فعال شد" : "بررسی مدیر برای درخواست‌های جدید غیرفعال شد";
  }
  return item.reason || "دلیلی ثبت نشده است";
}

export default function AuditLogsPage() {
  const { data: session } = useSession();
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<AuditFilter>("ALL");
  const query = useQuery({
    queryKey: ["admin-audit-logs", page, filter],
    enabled: Boolean(session?.accessToken),
    queryFn: () => {
      if (!session?.accessToken) throw new Error("نشست مدیر در دسترس نیست.");
      const params = new URLSearchParams({ page: String(page), pageSize: "20" });
      if (filter !== "ALL") params.set("targetType", filter);
      return adminApiFetch<AuditPage>(`/admin/audit-logs?${params}`, session.accessToken);
    },
  });

  return (
    <div className="grid gap-4">
      <header>
        <h1 className="font-semibold text-2xl">سابقه‌ی اقدامات مدیران</h1>
        <p className="mt-1 text-muted-foreground text-sm">دلایل و تغییر وضعیت کاربران، متخصصان و برداشت‌ها ثبت می‌شود.</p>
      </header>
      <Card>
        <CardHeader className="flex-row items-center justify-between gap-3">
          <div>
            <CardTitle>دفتر ثبت عملیات</CardTitle>
            <CardDescription>{query.data?.total.toLocaleString("fa-IR") ?? "—"} رویداد</CardDescription>
          </div>
          <Select
            value={filter}
            onValueChange={(value) => {
              setFilter(value as AuditFilter);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-40" aria-label="فیلتر نوع اقدام">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">همه‌ی اقدامات</SelectItem>
              <SelectItem value="USER">کاربران</SelectItem>
              <SelectItem value="PROVIDER">متخصصان</SelectItem>
              <SelectItem value="PAYOUT">برداشت‌ها</SelectItem>
              <SelectItem value="SERVICE_REQUEST">درخواست‌ها</SelectItem>
              <SelectItem value="PROVIDER_DOCUMENT">مدارک متخصصان</SelectItem>
              <SelectItem value="SPECIALTY">تخصص‌ها</SelectItem>
              <SelectItem value="CHAT">گفتگوها</SelectItem>
              <SelectItem value="COMMISSION">کمیسیون</SelectItem>
              <SelectItem value="PLATFORM_SETTING">تنظیمات سامانه</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent className="px-0">
          {query.isPending ? (
            <p className="p-6 text-center text-sm" role="status">
              در حال دریافت سوابق...
            </p>
          ) : null}
          {query.isError ? (
            <div className="grid justify-items-center gap-3 p-6 text-sm" role="alert">
              <p>{query.error.message}</p>
              <Button type="button" variant="outline" onClick={() => void query.refetch()}>
                تلاش دوباره
              </Button>
            </div>
          ) : null}
          {query.data && !query.data.items.length ? (
            <p className="p-6 text-center text-muted-foreground text-sm">سابقه‌ای ثبت نشده است.</p>
          ) : null}
          {query.data?.items.length ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>اقدام</TableHead>
                    <TableHead>مدیر</TableHead>
                    <TableHead>موضوع</TableHead>
                    <TableHead>دلیل</TableHead>
                    <TableHead>تغییرات</TableHead>
                    <TableHead>زمان</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {query.data.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{labels[item.action] ?? "سایر اقدامات مدیریتی"}</TableCell>
                      <TableCell>{item.actor.name}</TableCell>
                      <TableCell>{targetLabels[item.targetType] ?? "سایر موارد"}</TableCell>
                      <TableCell className="max-w-64 whitespace-normal">{reasonLabel(item)}</TableCell>
                      <TableCell className="max-w-72 whitespace-normal text-xs">
                        {stateLabel(item.beforeState)} ← {stateLabel(item.afterState)}
                      </TableCell>
                      <TableCell>{dateFormatter.format(new Date(item.createdAt))}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex items-center justify-between gap-3 p-4">
                <span className="text-muted-foreground text-sm">
                  صفحه {page.toLocaleString("fa-IR")} از{" "}
                  {Math.max(1, Math.ceil(query.data.total / query.data.pageSize)).toLocaleString("fa-IR")}
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((value) => value - 1)}
                  >
                    قبلی
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page * query.data.pageSize >= query.data.total}
                    onClick={() => setPage((value) => value + 1)}
                  >
                    بعدی
                  </Button>
                </div>
              </div>
            </>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
