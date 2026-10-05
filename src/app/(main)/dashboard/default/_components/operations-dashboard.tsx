"use client";

import Link from "next/link";

import {
  Banknote,
  BriefcaseBusiness,
  ClipboardList,
  CreditCard,
  type LucideIcon,
  MessageSquareText,
  RefreshCw,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { formatToman } from "../../accounting/_components/data";
import { useAccountingSummary } from "../../accounting/_components/use-wallet-admin";
import { usePendingProviders } from "../../pending-providers/_components/use-providers";

function MetricCard({
  title,
  value,
  description,
  icon: Icon,
  isLoading,
  isError,
  onRetry,
}: {
  title: string;
  value: string | number | undefined;
  description: string;
  icon: LucideIcon;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}) {
  return (
    <Card className="border-border/70 transition-colors hover:border-primary/30">
      <CardHeader className="flex-row items-start justify-between gap-3">
        <div className="grid gap-1">
          <CardTitle className="font-medium text-sm">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-4" />
        </span>
      </CardHeader>
      <CardContent>{renderMetricValue({ value, isLoading, isError, onRetry })}</CardContent>
    </Card>
  );
}

function renderMetricValue({
  value,
  isLoading,
  isError,
  onRetry,
}: {
  value: string | number | undefined;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}) {
  if (isLoading) return <span className="text-muted-foreground text-sm">در حال دریافت...</span>;

  if (isError) {
    return (
      <div className="flex items-center justify-between gap-2">
        <span className="text-destructive text-sm">دریافت اطلاعات ناموفق بود</span>
        <Button type="button" variant="ghost" size="icon-sm" onClick={onRetry} aria-label="تلاش دوباره">
          <RefreshCw className="size-4" />
        </Button>
      </div>
    );
  }

  return <p className="font-semibold text-2xl tabular-nums">{value ?? "—"}</p>;
}

const quickLinks = [
  { label: "بررسی درخواست‌های سرویس", href: "/dashboard/services", icon: ClipboardList },
  { label: "مدیریت گفت‌وگوها", href: "/dashboard/conversations", icon: MessageSquareText },
  { label: "مدیریت گروه‌ها و تخصص‌ها", href: "/dashboard/specialties", icon: BriefcaseBusiness },
  { label: "پرداخت‌های مشتریان", href: "/dashboard/accounting/payments", icon: CreditCard },
  { label: "درخواست‌های برداشت", href: "/dashboard/accounting/payouts", icon: Banknote },
] as const;

export function OperationsDashboard() {
  const providersQuery = usePendingProviders();
  const accountingQuery = useAccountingSummary();
  const providerCount = providersQuery.data?.total;
  const accounting = accountingQuery.data;

  return (
    <div className="mx-auto flex w-full max-w-screen-2xl flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-muted-foreground text-sm">پنل مدیریت هلپرمی</p>
          <h1 className="mt-1 font-semibold text-2xl tracking-tight">نمای کلی عملیات</h1>
          <p className="mt-2 text-muted-foreground text-sm">وضعیت موارد مهم و دسترسی سریع به بخش‌های مدیریتی</p>
        </div>
        <Button asChild className="rounded-lg shadow-sm">
          <Link href="/dashboard/pending-providers">
            <BriefcaseBusiness />
            بررسی سرویس‌دهندگان
          </Link>
        </Button>
      </header>

      <section aria-label="شاخص‌های مدیریتی" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <MetricCard
          title="درخواست سرویس‌دهندگی"
          description="در انتظار بررسی"
          icon={BriefcaseBusiness}
          value={providerCount?.toLocaleString("fa-IR")}
          isLoading={providersQuery.isLoading}
          isError={providersQuery.isError}
          onRetry={() => void providersQuery.refetch()}
        />
        <MetricCard
          title="درخواست برداشت"
          description="مبلغ در انتظار پرداخت"
          icon={Banknote}
          value={accounting ? formatToman(accounting.pendingPayoutAmountToman) : undefined}
          isLoading={accountingQuery.isLoading}
          isError={accountingQuery.isError}
          onRetry={() => void accountingQuery.refetch()}
        />
        <MetricCard
          title="برداشت‌های در انتظار"
          description="نیازمند بررسی در بخش حسابداری"
          icon={Banknote}
          value={accounting?.pendingPayoutCount.toLocaleString("fa-IR")}
          isLoading={accountingQuery.isLoading}
          isError={accountingQuery.isError}
          onRetry={() => void accountingQuery.refetch()}
        />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>دسترسی سریع</CardTitle>
          <CardDescription>عملیات پرتکرار مدیریت پنل</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          {quickLinks.map(({ label, href, icon: Icon }) => (
            <Button key={href} asChild variant="outline" className="h-10 rounded-lg">
              <Link href={href}>
                <Icon />
                {label}
              </Link>
            </Button>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
