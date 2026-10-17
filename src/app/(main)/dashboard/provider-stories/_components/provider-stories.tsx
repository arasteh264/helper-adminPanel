"use client";

import { type ReactNode, useEffect, useState } from "react";

import Image from "next/image";

import { Check, ChevronLeft, ChevronRight, Clock3, Eye, LoaderCircle, MessageSquareText, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  approveProviderStory,
  getProviderStories,
  getProviderStoryApprovalLog,
  getProviderStoryReport,
  type ProviderStory,
  type ProviderStoryList,
  rejectProviderStory,
  type StoryApprovalLog,
  setProviderStoryPricing,
} from "@/server/admin-provider-story-actions";

const statuses: { value: ProviderStory["status"]; label: string }[] = [
  { value: "PENDING_REVIEW", label: "در انتظار بررسی" },
  { value: "APPROVED", label: "تأییدشده" },
  { value: "REJECTED", label: "ردشده" },
  { value: "EXPIRED", label: "منقضی‌شده" },
];

const dateFormatter = new Intl.DateTimeFormat("fa-IR", {
  calendar: "persian",
  dateStyle: "medium",
  timeStyle: "short",
});
const numberFormatter = new Intl.NumberFormat("fa-IR");

function formatDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : dateFormatter.format(date);
}

function formatMoney(value: number | null) {
  return value === null ? "—" : `${numberFormatter.format(value)} تومان`;
}

function StoryCard({ story, onUpdated }: { story: ProviderStory; onUpdated: () => void }) {
  const [rejecting, setRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [paid, setPaid] = useState(story.isPaid);
  const [price, setPrice] = useState(story.priceToman?.toString() ?? "");
  const [log, setLog] = useState<StoryApprovalLog[] | null>(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  async function runAction(action: string, callback: () => Promise<unknown>) {
    setBusy(action);
    setError("");
    try {
      await callback();
      if (action !== "log") onUpdated();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "عملیات انجام نشد.");
    } finally {
      setBusy("");
    }
  }

  async function toggleLog() {
    if (log) {
      setLog(null);
      return;
    }
    setBusy("log");
    setError("");
    try {
      setLog(await getProviderStoryApprovalLog(story.id));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "دریافت سوابق بررسی ناموفق بود.");
    } finally {
      setBusy("");
    }
  }

  return (
    <Card>
      <CardContent className="grid gap-4 pt-4 md:grid-cols-[minmax(180px,260px)_1fr]">
        <div className="relative min-h-56 overflow-hidden rounded-xl bg-muted">
          {story.mediaType === "VIDEO" ? (
            // biome-ignore lint/a11y/useMediaCaption: The backend does not provide caption tracks for stories.
            <video
              className="absolute inset-0 size-full object-contain"
              controls
              preload="metadata"
              poster={story.thumbnailUrl ?? undefined}
              src={story.mediaUrl}
            >
              مرورگر شما از پخش ویدیو پشتیبانی نمی‌کند.
            </video>
          ) : (
            <Image
              src={story.mediaUrl}
              alt={`تصویر داستان ${story.title}`}
              fill
              unoptimized
              sizes="(max-width: 768px) 100vw, 260px"
              className="object-contain"
            />
          )}
        </div>

        <div className="grid content-start gap-4">
          <header className="flex flex-wrap items-start justify-between gap-3">
            <div className="grid gap-1">
              <h2 className="font-semibold text-lg">{story.title}</h2>
              <p className="text-muted-foreground text-sm">
                {story.providerName}
                {story.specialtyName ? ` · ${story.specialtyName}` : ""}
                {story.specialtyGroupName ? ` · ${story.specialtyGroupName}` : ""}
              </p>
              {story.description ? <p className="text-sm">{story.description}</p> : null}
            </div>
            <Badge variant={story.status === "PENDING_REVIEW" ? "secondary" : "outline"}>
              {statuses.find(({ value }) => value === story.status)?.label ?? story.status}
            </Badge>
          </header>

          <div className="flex flex-wrap gap-x-4 gap-y-2 text-muted-foreground text-xs">
            <span className="inline-flex items-center gap-1">
              <Clock3 className="size-3.5" aria-hidden="true" />
              ثبت: {formatDate(story.submittedAt)}
            </span>
            <span className="inline-flex items-center gap-1">
              <Eye className="size-3.5" aria-hidden="true" />
              {numberFormatter.format(story.viewsCount)} بازدید · {numberFormatter.format(story.uniqueViewers)} بیننده
            </span>
            <span>رسانه: {story.mediaType === "VIDEO" ? "ویدیو" : "تصویر"}</span>
            {story.durationSeconds ? <span>مدت: {numberFormatter.format(story.durationSeconds)} ثانیه</span> : null}
            <span>{story.isPaid ? `پولی · ${formatMoney(story.priceToman)}` : "رایگان"}</span>
          </div>

          {story.overlayText ? (
            <p
              className="w-fit rounded-md border px-3 py-2 text-sm"
              style={{ color: story.overlayColor, fontSize: `${story.overlayFontSize}px` }}
            >
              {story.overlayText}
            </p>
          ) : null}

          {story.status === "PENDING_REVIEW" ? (
            <div className="grid gap-3 rounded-lg border p-3">
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  disabled={Boolean(busy)}
                  onClick={() => runAction("approve", () => approveProviderStory(story.id, ""))}
                >
                  {busy === "approve" ? (
                    <LoaderCircle className="animate-spin" aria-hidden="true" />
                  ) : (
                    <Check aria-hidden="true" />
                  )}
                  تأیید و انتشار
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={Boolean(busy)}
                  onClick={() => setRejecting((open) => !open)}
                >
                  <X aria-hidden="true" />
                  رد داستان
                </Button>
              </div>
              {rejecting ? (
                <form
                  className="grid gap-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    if (rejectReason.trim()) {
                      void runAction("reject", () => rejectProviderStory(story.id, rejectReason.trim()));
                    }
                  }}
                >
                  <label className="grid gap-1 text-sm" htmlFor={`reject-${story.id}`}>
                    دلیل رد (الزامی)
                    <textarea
                      id={`reject-${story.id}`}
                      value={rejectReason}
                      onChange={(event) => setRejectReason(event.target.value)}
                      required
                      maxLength={500}
                      rows={2}
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                    />
                  </label>
                  <Button
                    type="submit"
                    size="sm"
                    variant="destructive"
                    disabled={!rejectReason.trim() || Boolean(busy)}
                  >
                    {busy === "reject" ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : null}
                    ثبت رد
                  </Button>
                </form>
              ) : null}
            </div>
          ) : null}

          <form
            className="flex flex-wrap items-end gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              const amount = Number(price);
              if (paid && (!Number.isSafeInteger(amount) || amount <= 0)) {
                setError("برای داستان پولی مبلغ صحیح و بیشتر از صفر وارد کنید.");
                return;
              }
              void runAction("pricing", () => setProviderStoryPricing(story.id, paid, paid ? amount : undefined));
            }}
          >
            <label htmlFor={`paid-${story.id}`} className="inline-flex h-8 items-center gap-2 text-sm">
              <input
                id={`paid-${story.id}`}
                type="checkbox"
                checked={paid}
                onChange={(event) => setPaid(event.target.checked)}
              />
              انتشار پولی
            </label>
            {paid ? (
              <label htmlFor={`price-${story.id}`} className="grid gap-1 text-xs">
                مبلغ (تومان)
                <Input
                  id={`price-${story.id}`}
                  type="number"
                  min={1}
                  step={1}
                  value={price}
                  onChange={(event) => setPrice(event.target.value)}
                  className="w-36"
                  required
                />
              </label>
            ) : null}
            <Button type="submit" size="sm" variant="outline" disabled={Boolean(busy)}>
              {busy === "pricing" ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : null}
              ثبت قیمت
            </Button>
          </form>

          <div>
            <Button type="button" size="sm" variant="ghost" disabled={Boolean(busy)} onClick={() => void toggleLog()}>
              {busy === "log" ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <MessageSquareText />}
              سوابق بررسی
            </Button>
            {log ? (
              <ul className="mt-2 grid gap-2 rounded-lg bg-muted/50 p-3 text-sm">
                {log.length ? (
                  log.map((entry) => (
                    <li key={entry.id} className="grid gap-1">
                      <span>
                        {entry.admin.name} · {formatDate(entry.createdAt)} · {entry.action}
                      </span>
                      {entry.comment ? <span className="text-muted-foreground">{entry.comment}</span> : null}
                    </li>
                  ))
                ) : (
                  <li className="text-muted-foreground">سابقه‌ای ثبت نشده است.</li>
                )}
              </ul>
            ) : null}
          </div>

          {error ? (
            <p
              className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-destructive text-sm"
              role="alert"
            >
              {error}
            </p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

export function ProviderStories() {
  const [status, setStatus] = useState<ProviderStory["status"]>("PENDING_REVIEW");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<ProviderStoryList | null>(null);
  const [report, setReport] = useState<Awaited<ReturnType<typeof getProviderStoryReport>> | null>(null);
  const [reload, setReload] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reportError, setReportError] = useState("");

  // biome-ignore lint/correctness/useExhaustiveDependencies: reload deliberately refetches after moderation changes.
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    setReportError("");
    getProviderStories(status, page)
      .then((data) => {
        if (active) setResult(data);
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : "دریافت داستان‌ها ناموفق بود.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    getProviderStoryReport()
      .then((data) => {
        if (active) setReport(data);
      })
      .catch((reason: unknown) => {
        if (active) setReportError(reason instanceof Error ? reason.message : "دریافت گزارش داستان‌ها ناموفق بود.");
      });
    return () => {
      active = false;
    };
  }, [status, page, reload]);

  const pageCount = Math.max(1, Math.ceil((result?.total ?? 0) / (result?.pageSize ?? 12)));
  let storiesContent: ReactNode;
  if (loading) {
    storiesContent = (
      <p className="flex items-center justify-center gap-2 py-12 text-muted-foreground" role="status">
        <LoaderCircle className="animate-spin" aria-hidden="true" />
        در حال دریافت داستان‌ها...
      </p>
    );
  } else if (result?.stories.length) {
    storiesContent = (
      <div className="grid gap-4">
        {result.stories.map((story) => (
          <StoryCard key={story.id} story={story} onUpdated={() => setReload((value) => value + 1)} />
        ))}
      </div>
    );
  } else {
    storiesContent = (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          {error ? "به‌دلیل خطا فهرست داستان‌ها دریافت نشد." : "در این وضعیت داستانی وجود ندارد."}
        </CardContent>
      </Card>
    );
  }

  return (
    <main className="mx-auto grid w-full max-w-6xl gap-5">
      <header className="grid gap-1">
        <h1 className="font-semibold text-2xl">مدیریت استوری متخصصان</h1>
        <p className="text-muted-foreground text-sm">بررسی انتشار، قیمت‌گذاری، آمار و سوابق داستان‌های ارسالی متخصصان.</p>
      </header>

      {report ? (
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5" aria-label="گزارش استوری‌ها">
          {[
            ["در انتظار بررسی", report.pendingApprovalCount],
            ["داستان‌های پولی", report.paidStoriesCount],
            ["داستان‌های رایگان", report.freeStoriesCount],
            ["درآمد", `${numberFormatter.format(report.totalRevenueFromStories)} تومان`],
            ["بازدید کل", report.totalViewsAcrossStories],
          ].map(([label, value]) => (
            <Card key={String(label)}>
              <CardHeader className="gap-1">
                <CardDescription>{label}</CardDescription>
                <CardTitle className="text-xl">
                  {typeof value === "number" ? numberFormatter.format(value) : value}
                </CardTitle>
              </CardHeader>
            </Card>
          ))}
        </section>
      ) : null}
      {reportError ? (
        <p
          className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-destructive text-sm"
          role="alert"
        >
          {reportError}
        </p>
      ) : null}

      <Card>
        <CardHeader className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>داستان‌های ثبت‌شده</CardTitle>
            <CardDescription>
              {result ? `${numberFormatter.format(result.total)} مورد` : "در حال دریافت فهرست..."}
            </CardDescription>
          </div>
          <label className="grid gap-1 text-sm">
            وضعیت
            <select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value as ProviderStory["status"]);
                setPage(1);
              }}
              className="h-9 rounded-lg border border-input bg-background px-3"
            >
              {statuses.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
        </CardHeader>
      </Card>

      {error ? (
        <p
          className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-destructive text-sm"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      {storiesContent}

      <footer className="flex items-center justify-between gap-3">
        <Button variant="outline" disabled={page <= 1 || loading} onClick={() => setPage((value) => value - 1)}>
          <ChevronRight aria-hidden="true" />
          قبلی
        </Button>
        <span className="text-muted-foreground text-sm">
          صفحه {numberFormatter.format(page)} از {numberFormatter.format(pageCount)}
        </span>
        <Button variant="outline" disabled={page >= pageCount || loading} onClick={() => setPage((value) => value + 1)}>
          بعدی
          <ChevronLeft aria-hidden="true" />
        </Button>
      </footer>
    </main>
  );
}
