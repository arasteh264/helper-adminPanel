"use client";

import type { ReactNode } from "react";
import { useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, LoaderCircle, MapPin, Trash2, XCircle } from "lucide-react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { apiFetch } from "./api";
import { preferredTimeMeta, type ServiceRequestRow, statusMeta } from "./data";

type ServiceRequestDetails = {
  id: string;
  title: string;
  description: string;
  status: ServiceRequestRow["status"];
  createdAt: string;
  updatedAt: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  preferredTime: ServiceRequestRow["preferredTime"];
  scheduledAt: string | null;
  budgetMin: number | null;
  budgetMax: number | null;
  providerPriceToman: number | null;
  providerPricingMode: string | null;
  providerHourlyRateToman: number | null;
  providerHourlyUnitLabel: string | null;
  providerEstimatedHours: number | null;
  specialty: string | null;
  skills: string[];
  images: { url: string; createdAt: string }[];
  customer: {
    name: string;
    email: string;
    phone: string;
    createdAt: string;
    serviceRequestCount: number;
  } | null;
  provider: { name: string; email: string; phone: string; rating: number } | null;
  payments: {
    amountToman: number;
    gateway: string;
    status: string;
    referenceId: string | null;
    paidAt: string | null;
    createdAt: string;
  }[];
  review: { rating: number; text: string | null; createdAt: string } | null;
  dispute: {
    reason: string | null;
    description: string | null;
    resolution: string | null;
    resolutionNote: string | null;
    resolvedAt: string | null;
  } | null;
  invitationCounts: { pending: number; accepted: number; declined: number };
};

const dateFormatter = new Intl.DateTimeFormat("fa-IR", {
  calendar: "persian",
  dateStyle: "medium",
  timeStyle: "short",
});

const paymentStatusLabels: Record<string, string> = {
  PENDING: "در انتظار پرداخت",
  PAID: "پرداخت‌شده",
  FAILED: "ناموفق",
  REFUNDED: "بازپرداخت‌شده",
};
const pricingModeLabels: Record<string, string> = {
  FIXED: "قیمت ثابت",
  HOURLY: "ساعتی",
};
const disputeReasonLabels: Record<string, string> = {
  WORK_NOT_COMPLETED: "کار انجام نشده یا ناقص است",
  WORK_QUALITY: "کیفیت انجام کار مورد قبول نیست",
  PRICE_DISAGREEMENT: "اختلاف بر سر مبلغ",
  PROVIDER_NO_SHOW: "متخصص حاضر نشده است",
  CUSTOMER_NON_PAYMENT: "اختلاف درباره‌ی پرداخت مشتری",
  OTHER: "سایر موارد",
};

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : dateFormatter.format(date);
}

function formatMoney(value: number | null | undefined) {
  return value == null ? "ثبت نشده" : `${value.toLocaleString("fa-IR")} تومان`;
}

function formatBudgetRange(min: number | null, max: number | null) {
  if (min == null && max == null) return "ثبت نشده";
  if (min == null) return `حداکثر ${formatMoney(max)}`;
  if (max == null) return `حداقل ${formatMoney(min)}`;
  if (min === max) return formatMoney(min);
  return `${formatMoney(min)} تا ${formatMoney(max)}`;
}

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid min-w-0 gap-1">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="break-words font-medium text-sm">{children ?? "—"}</dd>
    </div>
  );
}

export function ServiceRequestDetailsPage({ requestId }: { requestId: string }) {
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [reviewNote, setReviewNote] = useState("");
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const queryClient = useQueryClient();
  const detailsQuery = useQuery({
    queryKey: ["admin-service-request-details", requestId],
    enabled: Boolean(session?.accessToken),
    queryFn: () => {
      if (!session?.accessToken) throw new Error("نشست مدیر در دسترس نیست.");
      return apiFetch<ServiceRequestDetails>(
        `/admin/service-requests/${encodeURIComponent(requestId)}/details`,
        session.accessToken,
      );
    },
  });
  const cancelMutation = useMutation({
    mutationFn: () => {
      if (!session?.accessToken) throw new Error("نشست مدیر در دسترس نیست.");
      return apiFetch<{ status: "CANCELLED" }>(
        `/admin/service-requests/${encodeURIComponent(requestId)}`,
        session.accessToken,
        { method: "DELETE" },
      );
    },
    onSuccess: async () => {
      toast.success("درخواست ناقص لغو و از فهرست درخواست‌های فعال خارج شد.");
      setConfirmCancel(false);
      await queryClient.invalidateQueries({ queryKey: ["service-requests"] });
      router.push("/dashboard/services");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "لغو درخواست ناموفق بود.");
    },
  });
  const reviewMutation = useMutation({
    mutationFn: async (decision: "APPROVE" | "REJECT") => {
      if (!session?.accessToken) throw new Error("نشست مدیر در دسترس نیست.");
      return apiFetch<{ id: string; status: string }>(
        `/admin/service-requests/${encodeURIComponent(requestId)}/review`,
        session.accessToken,
        {
          method: "POST",
          body: JSON.stringify({ decision, note: reviewNote.trim() || undefined }),
        },
      );
    },
    onSuccess: async (_result, decision) => {
      toast.success(
        decision === "APPROVE"
          ? "درخواست تأیید شد و برای متخصصان واجد شرایط ارسال می‌شود."
          : "درخواست با ذکر دلیل رد شد.",
      );
      setReviewNote("");
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["admin-service-request-details", requestId],
        }),
        queryClient.invalidateQueries({ queryKey: ["service-requests"] }),
      ]);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "بررسی درخواست ناموفق بود.");
    },
  });
  const details = detailsQuery.data;
  const canCancel = details?.status === "OPEN" && details.payments.length === 0;

  return (
    <>
      <main className="mx-auto grid w-full max-w-5xl gap-4">
        <header className="grid gap-3">
          <Button asChild variant="ghost" className="w-fit">
            <Link href="/dashboard/services">
              <ArrowLeft className="size-4" />
              بازگشت به درخواست‌ها
            </Link>
          </Button>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-semibold text-2xl">{details?.title ?? "جزئیات درخواست سرویس"}</h1>
            {details ? <Badge variant="outline">{statusMeta[details.status].label}</Badge> : null}
          </div>
          <p className="text-muted-foreground text-sm">بررسی کامل اطلاعات مشتری، سرویس، پرداخت و سوابق درخواست</p>
        </header>

        {sessionStatus === "unauthenticated" && (
          <Card>
            <CardContent className="py-10 text-center text-sm" role="alert">
              برای مشاهده‌ی جزئیات درخواست وارد پنل شوید.
            </CardContent>
          </Card>
        )}
        {sessionStatus === "authenticated" && !session?.accessToken && (
          <Card>
            <CardContent className="py-10 text-center text-sm" role="alert">
              نشست مدیر معتبر نیست. لطفاً دوباره وارد پنل شوید.
            </CardContent>
          </Card>
        )}
        {sessionStatus === "loading" ||
        (sessionStatus === "authenticated" && Boolean(session?.accessToken) && detailsQuery.isPending) ? (
          <div className="flex min-h-48 items-center justify-center gap-2 text-muted-foreground text-sm" role="status">
            <LoaderCircle className="size-4 animate-spin" />
            در حال دریافت جزئیات درخواست...
          </div>
        ) : null}
        {sessionStatus === "authenticated" && detailsQuery.isError && (
          <div className="grid min-h-48 content-center justify-items-center gap-3 text-center text-sm" role="alert">
            <p>{detailsQuery.error.message || "دریافت جزئیات درخواست ناموفق بود."}</p>
            <Button type="button" variant="outline" size="sm" onClick={() => void detailsQuery.refetch()}>
              تلاش دوباره
            </Button>
          </div>
        )}
        {sessionStatus === "authenticated" && details ? (
          <div className="grid gap-4">
            {details.status === "PENDING_ADMIN_REVIEW" ? (
              <Card className="border-violet-500/25 bg-violet-500/[0.035]">
                <CardHeader>
                  <CardTitle>بررسی پیش از ارسال به متخصص</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4">
                  <p className="text-muted-foreground text-sm leading-6">
                    تا زمان تأیید مدیر، این درخواست برای متخصصان نمایش داده نمی‌شود. در صورت رد، دلیل برای مشتری قابل
                    مشاهده خواهد بود.
                  </p>
                  <label className="grid gap-2 font-medium text-sm">
                    یادداشت بررسی یا دلیل رد
                    <textarea
                      value={reviewNote}
                      onChange={(event) => setReviewNote(event.target.value)}
                      maxLength={1000}
                      rows={3}
                      placeholder="برای رد درخواست، دلیل را بنویسید؛ یادداشت تأیید اختیاری است."
                      className="w-full rounded-xl border border-input bg-background px-3 py-2 font-normal text-sm leading-6 outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                    />
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      disabled={reviewMutation.isPending}
                      onClick={() => reviewMutation.mutate("APPROVE")}
                    >
                      {reviewMutation.isPending ? (
                        <LoaderCircle className="size-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="size-4" />
                      )}
                      تأیید و ارسال برای متخصصان
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      disabled={reviewMutation.isPending || !reviewNote.trim()}
                      onClick={() => reviewMutation.mutate("REJECT")}
                    >
                      <XCircle className="size-4" />
                      رد درخواست
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : null}
            <Card size="sm">
              <CardHeader>
                <CardTitle>اطلاعات سرویس</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <Detail label="عنوان">{details.title}</Detail>
                  <Detail label="گروه سرویس">{details.specialty}</Detail>
                  <Detail label="تخصص‌های موردنیاز">{details.skills.join("، ")}</Detail>
                  <Detail label="زمان پیشنهادی">
                    {details.preferredTime ? preferredTimeMeta[details.preferredTime] : null}
                  </Detail>
                  <Detail label="زمان‌بندی انجام">{formatDate(details.scheduledAt)}</Detail>
                  <Detail label="ثبت درخواست">{formatDate(details.createdAt)}</Detail>
                  <Detail label="آخرین به‌روزرسانی">{formatDate(details.updatedAt)}</Detail>
                  <Detail label="بودجه">{formatBudgetRange(details.budgetMin, details.budgetMax)}</Detail>
                  <Detail label="قیمت توافق‌شده">{formatMoney(details.providerPriceToman)}</Detail>
                  <Detail label="روش قیمت‌گذاری">
                    {details.providerPricingMode
                      ? (pricingModeLabels[details.providerPricingMode] ?? details.providerPricingMode)
                      : null}
                  </Detail>
                  {details.providerHourlyRateToman != null ? (
                    <Detail label="نرخ ساعتی">
                      {`${formatMoney(details.providerHourlyRateToman)}${details.providerHourlyUnitLabel ? ` / ${details.providerHourlyUnitLabel}` : ""}`}
                    </Detail>
                  ) : null}
                  {details.providerEstimatedHours != null ? (
                    <Detail label="ساعت تخمینی">{details.providerEstimatedHours.toLocaleString("fa-IR")}</Detail>
                  ) : null}
                  <div className="grid gap-1 sm:col-span-2 lg:col-span-3">
                    <dt className="text-muted-foreground text-xs">شرح کامل</dt>
                    <dd className="whitespace-pre-wrap text-sm leading-6">
                      {details.description || "شرحی ثبت نشده است."}
                    </dd>
                  </div>
                  <div className="grid gap-1 sm:col-span-2 lg:col-span-3">
                    <dt className="text-muted-foreground text-xs">نشانی محل انجام</dt>
                    <dd className="flex items-start gap-2 text-sm">
                      <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                      {details.address || "نشانی ثبت نشده است"}
                      {details.latitude != null && details.longitude != null ? (
                        <a
                          className="text-primary underline underline-offset-4"
                          href={`https://www.google.com/maps?q=${details.latitude},${details.longitude}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          مشاهده روی نقشه
                        </a>
                      ) : null}
                    </dd>
                  </div>
                </dl>
              </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-2">
              <Card size="sm">
                <CardHeader>
                  <CardTitle>مشتری</CardTitle>
                </CardHeader>
                <CardContent>
                  <dl className="grid gap-3">
                    <Detail label="نام">{details.customer?.name}</Detail>
                    <Detail label="شماره تماس">
                      {details.customer?.phone ? (
                        <a href={`tel:${details.customer.phone}`}>{details.customer.phone}</a>
                      ) : null}
                    </Detail>
                    <Detail label="ایمیل">{details.customer?.email}</Detail>
                    <Detail label="عضویت از">{formatDate(details.customer?.createdAt)}</Detail>
                    <Detail label="تعداد درخواست‌های ثبت‌شده">
                      {details.customer?.serviceRequestCount.toLocaleString("fa-IR")}
                    </Detail>
                  </dl>
                </CardContent>
              </Card>
              <Card size="sm">
                <CardHeader>
                  <CardTitle>متخصص انتخاب‌شده</CardTitle>
                </CardHeader>
                <CardContent>
                  {details.provider ? (
                    <dl className="grid gap-3">
                      <Detail label="نام">{details.provider.name}</Detail>
                      <Detail label="شماره تماس">
                        <a href={`tel:${details.provider.phone}`}>{details.provider.phone}</a>
                      </Detail>
                      <Detail label="ایمیل">{details.provider.email}</Detail>
                      <Detail label="امتیاز">{details.provider.rating.toLocaleString("fa-IR")}</Detail>
                    </dl>
                  ) : (
                    <p className="text-muted-foreground text-sm">هنوز متخصصی برای این درخواست انتخاب نشده است.</p>
                  )}
                  <p className="mt-3 text-muted-foreground text-xs">
                    دعوت‌ها: {details.invitationCounts.pending.toLocaleString("fa-IR")} در انتظار ·{" "}
                    {details.invitationCounts.accepted.toLocaleString("fa-IR")} پذیرفته ·{" "}
                    {details.invitationCounts.declined.toLocaleString("fa-IR")} ردشده
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card size="sm">
              <CardHeader>
                <CardTitle>پرداخت‌ها و ارزیابی</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4">
                {details.payments.length ? (
                  <ul className="grid gap-2">
                    {details.payments.map((payment) => (
                      <li
                        key={payment.referenceId ?? `${payment.createdAt}-${payment.gateway}-${payment.amountToman}`}
                        className="flex flex-wrap justify-between gap-2 border-b pb-2 text-sm last:border-0"
                      >
                        <span>
                          {paymentStatusLabels[payment.status] ?? payment.status} · {formatMoney(payment.amountToman)}
                        </span>
                        <span className="text-muted-foreground">{formatDate(payment.paidAt ?? payment.createdAt)}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground text-sm">پرداختی برای این درخواست ثبت نشده است.</p>
                )}
                {details.review ? (
                  <div className="grid gap-1 border-t pt-3 text-sm">
                    <p className="font-medium">امتیاز مشتری: {details.review.rating.toLocaleString("fa-IR")} از ۵</p>
                    <p className="whitespace-pre-wrap text-muted-foreground">
                      {details.review.text || "متنی ثبت نشده است."}
                    </p>
                  </div>
                ) : null}
                {details.dispute ? (
                  <div className="grid gap-1 border-t pt-3 text-sm">
                    <p className="font-medium">
                      سوابق اختلاف:{" "}
                      {details.dispute.reason
                        ? (disputeReasonLabels[details.dispute.reason] ?? details.dispute.reason)
                        : "دلیل ثبت نشده"}
                    </p>
                    <p className="whitespace-pre-wrap text-muted-foreground">
                      {details.dispute.description || "شرح ثبت نشده است."}
                    </p>
                    {details.dispute.resolutionNote ? <p>نتیجه: {details.dispute.resolutionNote}</p> : null}
                  </div>
                ) : null}
              </CardContent>
            </Card>

            {details.images.length ? (
              <section className="grid gap-2">
                <h3 className="font-medium text-sm">تصاویر ارسالی مشتری</h3>
                <div className="flex flex-wrap gap-2">
                  {details.images.map((image) => (
                    <a
                      key={image.url}
                      href={image.url}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-md border px-3 py-2 text-primary text-sm underline underline-offset-4"
                    >
                      مشاهده تصویر · {formatDate(image.createdAt)}
                    </a>
                  ))}
                </div>
              </section>
            ) : (
              <p className="text-muted-foreground text-sm">تصویری برای این درخواست ثبت نشده است.</p>
            )}
          </div>
        ) : null}

        {details ? (
          <section className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
            {canCancel && (
              <Button
                type="button"
                variant="destructive"
                disabled={cancelMutation.isPending}
                onClick={() => setConfirmCancel(true)}
              >
                <Trash2 className="size-4" />
                لغو درخواست ناقص
              </Button>
            )}
            {!canCancel && details.status === "OPEN" && (
              <p className="text-muted-foreground text-xs">
                درخواست دارای سابقه‌ی پرداخت است و از این صفحه قابل لغو نیست.
              </p>
            )}
            {!canCancel && details.status !== "OPEN" && (
              <p className="text-muted-foreground text-xs">
                درخواست‌های فعال را می‌توان فقط در صورت ناقص‌بودن و نداشتن پرداخت لغو کرد.
              </p>
            )}
          </section>
        ) : null}
      </main>

      <AlertDialog open={confirmCancel} onOpenChange={setConfirmCancel}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>لغو و بایگانی درخواست؟</AlertDialogTitle>
            <AlertDialogDescription>
              درخواست «{details?.title}» از فهرست فعال خارج می‌شود و برای حفظ سوابق حذف دائمی نخواهد شد. این کار فقط برای
              درخواست باز و بدون پرداخت مجاز است.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelMutation.isPending}>بازگشت</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={cancelMutation.isPending}
              onClick={(event) => {
                event.preventDefault();
                cancelMutation.mutate();
              }}
            >
              {cancelMutation.isPending ? <LoaderCircle className="size-4 animate-spin" /> : null}
              تأیید لغو
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
