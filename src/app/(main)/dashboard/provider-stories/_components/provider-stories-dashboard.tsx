"use client";

import { useMemo, useState } from "react";

import Link from "next/link";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera, Check, ChevronLeft, ChevronRight, Eye, Loader2, ShieldCheck, Wallet, X } from "lucide-react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { adminApiFetch } from "@/lib/admin-api";

type StoryStatus = "PENDING_REVIEW" | "APPROVED" | "REJECTED" | "EXPIRED";
type StoryRow = {
  id: string;
  title: string;
  description: string | null;
  providerName: string;
  providerProfileId: string;
  status: StoryStatus;
  submittedAt: string | null;
  mediaType: "IMAGE" | "VIDEO";
  mediaUrl: string;
  thumbnailUrl: string | null;
  durationSeconds: number | null;
  specialtyName: string | null;
  specialtySlug: string | null;
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
type StoriesPage = {
  stories: StoryRow[];
  total: number;
  page: number;
  pageSize: number;
};
type FinancialReport = {
  paidStoriesCount: number;
  freeStoriesCount: number;
  totalRevenueFromStories: number;
  pendingApprovalCount: number;
  totalViewsAcrossStories: number;
};
type MutationInput = {
  path: string;
  method: "POST" | "PATCH";
  body?: Record<string, string | number | boolean>;
};

const statusOptions: { value: StoryStatus; label: string }[] = [
  { value: "PENDING_REVIEW", label: "در انتظار بررسی" },
  { value: "APPROVED", label: "تأییدشده" },
  { value: "REJECTED", label: "ردشده" },
  { value: "EXPIRED", label: "منقضی‌شده" },
];

function toman(amount: number) {
  return `${new Intl.NumberFormat("fa-IR").format(amount)} تومان`;
}

function useAdminToken() {
  return useSession().data?.accessToken as string | undefined;
}

function formatDate(date: string | null) {
  return date
    ? new Intl.DateTimeFormat("fa-IR", {
        dateStyle: "short",
        timeStyle: "short",
      }).format(new Date(date))
    : "—";
}

export function ProviderStoriesDashboard() {
  const token = useAdminToken();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<StoryStatus>("PENDING_REVIEW");
  const [storiesPage, setStoriesPage] = useState(1);
  const [selectedStoryId, setSelectedStoryId] = useState<string | null>(null);
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [videoMaxSizeMB, setVideoMaxSizeMB] = useState("");
  const storiesQuery = useQuery({
    queryKey: ["admin-provider-stories", status, storiesPage],
    enabled: !!token,
    queryFn: () =>
      adminApiFetch<StoriesPage>(`/admin/provider-stories?status=${status}&page=${storiesPage}&pageSize=50`, token!),
  });
  const reportQuery = useQuery({
    queryKey: ["admin-provider-story-finance"],
    enabled: !!token,
    queryFn: () => adminApiFetch<FinancialReport>("/admin/provider-stories/financial-report", token!),
  });
  const uploadSettingsQuery = useQuery({
    queryKey: ["admin-provider-story-upload-settings"],
    enabled: !!token,
    queryFn: () => adminApiFetch<{ videoMaxSizeMB: number }>("/admin/provider-stories/upload-settings", token!),
  });
  const mutation = useMutation({
    mutationFn: (input: MutationInput) =>
      adminApiFetch<unknown>(input.path, token!, {
        method: input.method,
        ...(input.body ? { body: JSON.stringify(input.body) } : {}),
      }),
    onSuccess: async (_data, input) => {
      if (input.path.endsWith("/approve") || input.path.endsWith("/reject")) {
        setSelectedStoryId(null);
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-provider-stories"] }),
        queryClient.invalidateQueries({
          queryKey: ["admin-provider-story-finance"],
        }),
        queryClient.invalidateQueries({
          queryKey: ["admin-provider-story-upload-settings"],
        }),
      ]);
      toast.success("تغییر با موفقیت ثبت شد.");
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const stories = storiesQuery.data?.stories ?? [];
  const selectedStory = stories.find((story) => story.id === selectedStoryId) ?? null;
  const report = reportQuery.data;
  const errors = useMemo(
    () =>
      [storiesQuery.error, reportQuery.error, uploadSettingsQuery.error].filter(
        (error): error is Error => error instanceof Error,
      ),
    [storiesQuery.error, reportQuery.error, uploadSettingsQuery.error],
  );

  function setPrice(story: StoryRow, isPaid: boolean) {
    const priceToman = Number(prices[story.id]);
    if (isPaid && (!Number.isSafeInteger(priceToman) || priceToman < 1)) {
      toast.error("برای انتشار پولی یک مبلغ صحیح و بیشتر از صفر وارد کنید.");
      return;
    }
    mutation.mutate({
      path: `/admin/provider-stories/${story.id}/pricing`,
      method: "POST",
      body: { isPaid, ...(isPaid ? { priceToman } : {}) },
    });
  }

  function approve(story: StoryRow) {
    mutation.mutate({
      path: `/admin/provider-stories/${story.id}/approve`,
      method: "POST",
      body: { comment: "بررسی و تأیید از پنل مدیریت" },
    });
  }

  function reject(story: StoryRow) {
    const reason = window.prompt("دلیل رد استوری را وارد کنید:");
    if (!reason?.trim()) return;
    mutation.mutate({
      path: `/admin/provider-stories/${story.id}/reject`,
      method: "POST",
      body: { rejectionReason: reason.trim() },
    });
  }

  function saveVideoLimit() {
    const value = Number(videoMaxSizeMB || uploadSettingsQuery.data?.videoMaxSizeMB);
    if (!Number.isSafeInteger(value) || value < 1 || value > 100) {
      toast.error("حداکثر حجم را بین ۱ تا ۱۰۰ مگابایت وارد کنید.");
      return;
    }
    mutation.mutate({
      path: "/admin/provider-stories/upload-settings",
      method: "PATCH",
      body: { videoMaxSizeMB: value },
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <header>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-semibold text-2xl">مدیریت استوری‌ها</h1>
            <p className="mt-1 text-muted-foreground text-sm">
              بررسی و انتشار استوری‌های متخصصان و پیگیری درآمد و بازدید.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href="/dashboard/provider-stories/access">
              <ShieldCheck /> مجوز انتشار متخصصان
            </Link>
          </Button>
        </div>
      </header>

      {errors.length ? (
        <div
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
        >
          دریافت بخشی از اطلاعات ناموفق بود: {errors.map((error) => error.message).join(" • ")}
        </div>
      ) : null}

      {report ? (
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {[
            ["درآمد وصول‌شده", toman(report.totalRevenueFromStories)],
            ["پرداخت موفق متخصصان", new Intl.NumberFormat("fa-IR").format(report.paidStoriesCount)],
            ["استوری رایگان فعال", new Intl.NumberFormat("fa-IR").format(report.freeStoriesCount)],
            ["در صف بررسی", new Intl.NumberFormat("fa-IR").format(report.pendingApprovalCount)],
            ["کل بازدیدها", new Intl.NumberFormat("fa-IR").format(report.totalViewsAcrossStories)],
          ].map(([label, value]) => (
            <Card key={label} size="sm">
              <CardHeader className="pb-2">
                <CardDescription>{label}</CardDescription>
              </CardHeader>
              <CardContent className="font-semibold tabular-nums">{value}</CardContent>
            </Card>
          ))}
        </section>
      ) : reportQuery.isPending ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> دریافت گزارش مالی...
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>تنظیمات بارگذاری ویدیو</CardTitle>
          <CardDescription>
            سقف حجم برای فایل‌های ویدیویی متخصصان. مدت ویدیو بررسی یا محدود نمی‌شود؛ سقف فنی سامانه ۱۰۰ مگابایت است.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <label className="grid gap-1.5 text-sm">
            حداکثر حجم (مگابایت)
            <select
              value={videoMaxSizeMB || uploadSettingsQuery.data?.videoMaxSizeMB || ""}
              onChange={(event) => setVideoMaxSizeMB(event.target.value)}
              className="h-10 w-40 rounded-md border border-input bg-background px-3 text-sm"
              aria-label="حداکثر حجم ویدیوی استوری"
            >
              <option value="" disabled>
                انتخاب حجم
              </option>
              {[10, 25, 50, 75, 100].map((size) => (
                <option key={size} value={size}>
                  {size} مگابایت
                </option>
              ))}
            </select>
          </label>
          <Button type="button" disabled={mutation.isPending || uploadSettingsQuery.isPending} onClick={saveVideoLimit}>
            ذخیره سقف بارگذاری
          </Button>
          {uploadSettingsQuery.data ? (
            <span className="text-xs text-muted-foreground">
              مقدار فعلی: {uploadSettingsQuery.data.videoMaxSizeMB} مگابایت
            </span>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Camera className="size-5" /> بازبینی محتوا
            </CardTitle>
            <CardDescription>
              پیش از تأیید، رسانه و مدت ویدیو را بررسی کنید. انتشار هرگز بدون تأیید مدیر انجام نمی‌شود.
            </CardDescription>
          </div>
          <select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value as StoryStatus);
              setStoriesPage(1);
            }}
            className="h-9 rounded-lg border border-input bg-background px-3 text-sm"
            aria-label="فیلتر وضعیت استوری"
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </CardHeader>
        <CardContent className="space-y-4">
          {storiesQuery.isPending ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> در حال دریافت استوری‌ها...
            </p>
          ) : stories.length === 0 ? (
            <p className="rounded-lg border border-dashed p-5 text-center text-sm text-muted-foreground">
              استوری‌ای در این وضعیت وجود ندارد.
            </p>
          ) : (
            <Table>
              <TableHeader className="[&_tr]:border-t">
                <TableRow>
                  <TableHead>عنوان استوری</TableHead>
                  <TableHead>متخصص</TableHead>
                  <TableHead>نوع رسانه</TableHead>
                  <TableHead>بازدید</TableHead>
                  <TableHead>وضعیت</TableHead>
                  <TableHead>زمان ثبت</TableHead>
                  <TableHead className="text-left">جزئیات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stories.map((story) => (
                  <TableRow key={story.id}>
                    <TableCell className="max-w-56 truncate font-medium">{story.title}</TableCell>
                    <TableCell>{story.providerName}</TableCell>
                    <TableCell>{story.mediaType === "VIDEO" ? "ویدیو" : "تصویر"}</TableCell>
                    <TableCell className="tabular-nums">{story.viewsCount.toLocaleString("fa-IR")}</TableCell>
                    <TableCell>
                      <span className="rounded-full bg-muted px-2.5 py-1 text-xs">
                        {statusOptions.find((option) => option.value === story.status)?.label ?? story.status}
                      </span>
                    </TableCell>
                    <TableCell>{formatDate(story.submittedAt)}</TableCell>
                    <TableCell className="text-left">
                      <Button type="button" variant="outline" size="sm" onClick={() => setSelectedStoryId(story.id)}>
                        <Eye /> مشاهده جزئیات
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {storiesQuery.data ? (
            <div className="flex items-center justify-between gap-3 border-t pt-3">
              <span className="text-xs text-muted-foreground">
                تعداد: {storiesQuery.data.total.toLocaleString("fa-IR")}
              </span>
              {storiesQuery.data.total > storiesQuery.data.pageSize ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={storiesPage <= 1 || storiesQuery.isFetching}
                    onClick={() => setStoriesPage((page) => Math.max(1, page - 1))}
                  >
                    <ChevronRight /> قبلی
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    صفحه {storiesPage.toLocaleString("fa-IR")} از{" "}
                    {Math.ceil(storiesQuery.data.total / storiesQuery.data.pageSize).toLocaleString("fa-IR")}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={
                      storiesPage >= Math.ceil(storiesQuery.data.total / storiesQuery.data.pageSize) ||
                      storiesQuery.isFetching
                    }
                    onClick={() => setStoriesPage((page) => page + 1)}
                  >
                    بعدی <ChevronLeft />
                  </Button>
                </>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Dialog
        open={Boolean(selectedStory)}
        onOpenChange={(open) => {
          if (!open) setSelectedStoryId(null);
        }}
      >
        {selectedStory ? (
          <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-4xl sm:p-6">
            <DialogHeader className="pe-8">
              <DialogTitle>پیش‌نمایش استوری</DialogTitle>
              <DialogDescription>نمایش عمودی در قاب موبایل؛ {selectedStory.providerName}</DialogDescription>
            </DialogHeader>

            <div className="grid min-w-0 gap-5 sm:grid-cols-[minmax(0,1fr)_17rem] sm:items-start">
              <div className="mx-auto w-full max-w-[17rem]">
                <div className="relative aspect-[9/16] overflow-hidden rounded-[2rem] border-[5px] border-neutral-900 bg-neutral-950 shadow-xl">
                  {selectedStory.mediaType === "VIDEO" ? (
                    <>
                      {/* biome-ignore lint/a11y/useMediaCaption: The stories API does not provide caption tracks. */}
                      <video
                        src={selectedStory.mediaUrl}
                        poster={selectedStory.thumbnailUrl ?? undefined}
                        controls
                        playsInline
                        preload="metadata"
                        className="absolute inset-0 size-full object-cover"
                      />
                    </>
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={selectedStory.mediaUrl}
                      alt={selectedStory.title}
                      className="absolute inset-0 size-full object-cover"
                    />
                  )}

                  <div className="pointer-events-none absolute inset-x-0 top-0 flex gap-1 px-3 pt-3">
                    <span className="h-0.5 flex-1 rounded-full bg-white/90" />
                    <span className="h-0.5 flex-1 rounded-full bg-white/40" />
                    <span className="h-0.5 flex-1 rounded-full bg-white/40" />
                  </div>

                  <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center gap-2 bg-gradient-to-b from-black/60 to-transparent px-3 pb-8 pt-6 text-white">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white/20">
                      <Camera className="size-4" />
                    </span>
                    <span className="min-w-0 truncate text-xs font-semibold">{selectedStory.providerName}</span>
                  </div>

                  {selectedStory.overlayText ? (
                    <span
                      className="pointer-events-none absolute z-10 max-w-[88%] whitespace-pre-wrap rounded-md bg-black/25 px-2 py-1 text-center font-bold"
                      style={{
                        left: `${selectedStory.overlayPositionX}%`,
                        top: `${selectedStory.overlayPositionY}%`,
                        color: selectedStory.overlayColor,
                        fontSize: `${selectedStory.overlayFontSize}px`,
                        transform: "translate(-50%, -50%)",
                        textShadow: "0 2px 8px rgba(0,0,0,.8)",
                      }}
                    >
                      {selectedStory.overlayText}
                    </span>
                  ) : null}

                  <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/35 to-transparent px-4 pb-5 pt-16 text-white">
                    <p className="line-clamp-2 font-semibold text-sm">{selectedStory.title}</p>
                    {selectedStory.description ? (
                      <p className="mt-1 line-clamp-3 text-xs leading-5 text-white/85">{selectedStory.description}</p>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="min-w-0 space-y-4">
                <div>
                  <h3 className="font-semibold">{selectedStory.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {statusOptions.find((option) => option.value === selectedStory.status)?.label ??
                      selectedStory.status}
                    {" · "}
                    {formatDate(selectedStory.submittedAt)}
                  </p>
                </div>

                {selectedStory.description ? (
                  <p className="text-sm leading-6 text-muted-foreground">{selectedStory.description}</p>
                ) : null}

                {selectedStory.specialtyName ? (
                  <p className="text-sm text-primary">
                    {selectedStory.specialtyGroupName ? `${selectedStory.specialtyGroupName} / ` : ""}
                    {selectedStory.specialtyName}
                  </p>
                ) : null}

                <div className="grid grid-cols-2 gap-3 rounded-lg border p-3 text-sm">
                  <span className="text-muted-foreground">نوع رسانه</span>
                  <span>{selectedStory.mediaType === "VIDEO" ? "ویدیو" : "تصویر"}</span>
                  <span className="text-muted-foreground">بازدید کل</span>
                  <span className="tabular-nums">{selectedStory.viewsCount.toLocaleString("fa-IR")}</span>
                  <span className="text-muted-foreground">بازدیدکننده یکتا</span>
                  <span className="tabular-nums">{selectedStory.uniqueViewers.toLocaleString("fa-IR")}</span>
                  <span className="text-muted-foreground">وضعیت پرداخت</span>
                  <span>
                    {selectedStory.paymentStatus === "PAID"
                      ? "پرداخت‌شده"
                      : selectedStory.isPaid
                        ? "در انتظار پرداخت"
                        : "رایگان"}
                  </span>
                  {selectedStory.expiresAt ? (
                    <>
                      <span className="text-muted-foreground">زمان انقضا</span>
                      <span>{formatDate(selectedStory.expiresAt)}</span>
                    </>
                  ) : null}
                </div>

                {selectedStory.status === "PENDING_REVIEW" ? (
                  <div className="grid gap-3 border-t pt-4">
                    <label htmlFor={`story-price-${selectedStory.id}`} className="grid gap-1.5 text-sm">
                      هزینه‌ی انتشار (تومان)
                      <Input
                        id={`story-price-${selectedStory.id}`}
                        inputMode="numeric"
                        value={prices[selectedStory.id] ?? ""}
                        onChange={(event) =>
                          setPrices((current) => ({
                            ...current,
                            [selectedStory.id]: event.target.value.replace(/[^\d]/g, ""),
                          }))
                        }
                        placeholder="مثلاً ۵۰۰۰۰"
                        aria-label={`قیمت انتشار برای ${selectedStory.title}`}
                      />
                    </label>
                    <div className="grid gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        disabled={mutation.isPending}
                        onClick={() => setPrice(selectedStory, true)}
                      >
                        <Wallet /> تعیین قیمت پولی
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        disabled={mutation.isPending}
                        onClick={() => setPrice(selectedStory, false)}
                      >
                        انتشار رایگان
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        disabled={mutation.isPending}
                        onClick={() => reject(selectedStory)}
                      >
                        <X /> رد استوری
                      </Button>
                      <Button type="button" disabled={mutation.isPending} onClick={() => approve(selectedStory)}>
                        <Check /> تأیید انتشار
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </DialogContent>
        ) : null}
      </Dialog>
    </div>
  );
}
