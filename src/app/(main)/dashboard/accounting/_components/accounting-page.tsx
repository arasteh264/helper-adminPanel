"use client";

import { useEffect, useState } from "react";

import Link from "next/link";

import { Banknote, ChartNoAxesCombined, Coins, Landmark, WalletCards } from "lucide-react";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { formatToman } from "./data";
import { LedgerTab } from "./ledger-tab";
import { PaymentsTab } from "./payments-tab";
import { PayoutsTab } from "./payouts-tab";
import { QueryState } from "./shared";
import { useAccountingSummary, useUpdateCommission, useWalletConfiguration } from "./use-wallet-admin";

function Metric({
  label,
  value,
  detail,
  icon: Icon,
}: {
  label: string;
  value?: number;
  detail?: string;
  icon: typeof Coins;
}) {
  return (
    <Card size="sm">
      <CardHeader className="flex-row items-center justify-between gap-2">
        <CardTitle className="font-normal text-sm">{label}</CardTitle>
        <Icon className="size-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="font-semibold text-xl tabular-nums">{value === undefined ? "—" : formatToman(value)}</div>
        {detail ? <p className="mt-1 text-muted-foreground text-xs">{detail}</p> : null}
      </CardContent>
    </Card>
  );
}

function AccountingOverview() {
  const summaryQuery = useAccountingSummary();
  const retrySummary = () => summaryQuery.refetch();

  if (summaryQuery.isPending) {
    return <QueryState loading error={null} empty={false} onRetry={() => void retrySummary()} />;
  }
  if (summaryQuery.isError) {
    return (
      <QueryState
        loading={false}
        error={summaryQuery.error.message || "دریافت گزارش مالی ناموفق بود"}
        empty={false}
        onRetry={() => void retrySummary()}
      />
    );
  }

  const summary = summaryQuery.data;
  if (!summary) {
    return (
      <QueryState
        loading={false}
        error="گزارش مالی از سرویس پاسخ معتبری دریافت نکرد."
        empty={false}
        onRetry={() => void retrySummary()}
      />
    );
  }

  return (
    <div className="grid gap-4">
      <section className="grid gap-3" aria-labelledby="payment-metrics-title">
        <div>
          <h2 id="payment-metrics-title" className="font-semibold text-base">
            پرداخت و درآمد
          </h2>
          <p className="mt-1 text-muted-foreground text-sm">
            مبلغ پرداخت مشتریان و سهم کمیسیون پلتفرم دو شاخص جداگانه‌اند.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metric
            label="کل پرداخت مشتریان"
            value={summary.allTimePaidVolumeToman}
            detail="مجموع مبالغ پرداخت‌شده"
            icon={Banknote}
          />
          <Metric label="پرداخت مشتریان در ماه جاری" value={summary.currentMonthPaidVolumeToman} icon={Banknote} />
          <Metric
            label="درآمد کل پلتفرم از کمیسیون"
            value={summary.allTimePlatformCommissionToman}
            detail="سهم پلتفرم از تراکنش‌ها"
            icon={Coins}
          />
          <Metric label="درآمد کمیسیون در ماه جاری" value={summary.currentMonthPlatformCommissionToman} icon={Coins} />
        </div>
      </section>

      <section className="grid gap-3" aria-labelledby="wallet-metrics-title">
        <div>
          <h2 id="wallet-metrics-title" className="font-semibold text-base">
            وضعیت کیف پول سرویس‌دهندگان
          </h2>
          <p className="mt-1 text-muted-foreground text-sm">
            موجودی کل شامل مانده‌ی قابل برداشت و درخواست‌های برداشتِ در انتظار است.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="درآمد ناخالص کل" value={summary.providerGrossEarningsToman} icon={WalletCards} />
          <Metric
            label="درآمد سرویس‌دهندگان در ماه جاری"
            value={summary.currentMonthProviderGrossEarningsToman}
            icon={WalletCards}
          />
          <Metric label="موجودی قابل برداشت" value={summary.providerAvailableBalanceToman} icon={WalletCards} />
          <Metric
            label="موجودی کل کیف پول‌ها"
            value={summary.providerFundsHeldToman}
            detail="شامل مانده و درخواست‌های برداشتِ در انتظار"
            icon={Landmark}
          />
        </div>
      </section>

      <section className="grid gap-3" aria-labelledby="payout-metrics-title">
        <div>
          <h2 id="payout-metrics-title" className="font-semibold text-base">
            برداشت‌ها
          </h2>
          <p className="mt-1 text-muted-foreground text-sm">
            مبالغ در انتظار بررسی را از صفحه‌ی درخواست‌های برداشت پیگیری کنید.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-2">
          <Metric
            label="مبلغ برداشت‌های در انتظار بررسی"
            value={summary.pendingPayoutAmountToman}
            detail={`${summary.pendingPayoutCount.toLocaleString("fa-IR")} درخواست`}
            icon={ChartNoAxesCombined}
          />
          <Metric
            label="مبلغ واریزشده به سرویس‌دهندگان"
            value={summary.totalPaidOutToman}
            detail={`ماه جاری: ${formatToman(summary.currentMonthPaidOutToman)}`}
            icon={Landmark}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/dashboard/accounting/payouts">رفتن به درخواست‌های برداشت</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard/accounting/payments">مشاهده‌ی پرداخت مشتریان</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard/accounting/ledger">مشاهده‌ی گردش کیف پول</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}

function CommissionSettings() {
  const configQuery = useWalletConfiguration();
  const retryConfiguration = () => configQuery.refetch();
  const updateCommission = useUpdateCommission();
  const [rate, setRate] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    if (configQuery.data) setRate(String(configQuery.data.commissionRate));
  }, [configQuery.data]);

  if (configQuery.isPending) {
    return <QueryState loading error={null} empty={false} onRetry={() => void retryConfiguration()} />;
  }
  if (configQuery.isError) {
    return (
      <QueryState
        loading={false}
        error={configQuery.error.message || "دریافت تنظیمات کمیسیون ناموفق بود"}
        empty={false}
        onRetry={() => void retryConfiguration()}
      />
    );
  }

  const configuration = configQuery.data;
  if (!configuration) {
    return (
      <QueryState
        loading={false}
        error="تنظیمات کمیسیون از سرویس پاسخ معتبری دریافت نکرد."
        empty={false}
        onRetry={() => void retryConfiguration()}
      />
    );
  }

  const parsedRate = Number(rate);
  const isRateValid =
    /^\d{1,3}(\.\d{1,2})?$/.test(rate) && Number.isFinite(parsedRate) && parsedRate >= 0 && parsedRate <= 100;

  async function confirmCommission() {
    try {
      const updated = await updateCommission.mutateAsync(parsedRate);
      setRate(String(updated.commissionRate));
      setConfirmOpen(false);
      toast.success("نرخ کمیسیون پلتفرم به‌روزرسانی شد");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تغییر نرخ کمیسیون ناموفق بود");
    }
  }

  return (
    <>
      <Card>
        <CardHeader className="border-b">
          <CardTitle>تنظیم کمیسیون پلتفرم</CardTitle>
          <CardDescription>
            این نرخ روی محاسبه‌ی سهم پلتفرم از تراکنش‌های جدید اثر می‌گذارد؛ قبل از ثبت، مقدار را با دقت بررسی کنید.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <div className="grid gap-2">
            <Label htmlFor="commission-rate">نرخ کمیسیون (%)</Label>
            <Input
              id="commission-rate"
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={rate}
              onChange={(event) => setRate(event.target.value)}
              className="w-full sm:w-48"
            />
          </div>
          <Badge variant="outline" className="min-h-9">
            حداقل مبلغ برداشت: {formatToman(configuration.minWithdrawal)}
          </Badge>
          <Button
            disabled={!isRateValid || parsedRate === configuration.commissionRate || updateCommission.isPending}
            onClick={() => setConfirmOpen(true)}
          >
            ثبت نرخ جدید
          </Button>
        </CardContent>
      </Card>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأیید تغییر کمیسیون</AlertDialogTitle>
            <AlertDialogDescription>
              نرخ کمیسیون از {configuration.commissionRate}% به {rate}% تغییر می‌کند. این تصمیم مالی را تأیید می‌کنید؟
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={updateCommission.isPending}>انصراف</AlertDialogCancel>
            <AlertDialogAction
              disabled={updateCommission.isPending}
              onClick={(event) => {
                event.preventDefault();
                void confirmCommission();
              }}
            >
              {updateCommission.isPending ? "در حال ثبت..." : "تأیید تغییر"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export type AccountingSection = "overview" | "payments" | "payouts" | "ledger" | "commission";

const sectionContent: Record<AccountingSection, { title: string; description: string }> = {
  overview: {
    title: "گزارش مالی",
    description: "نمای کلی پرداخت مشتریان، سهم پلتفرم و مانده‌ی سرویس‌دهندگان",
  },
  payments: {
    title: "پرداخت‌های مشتریان",
    description: "پیگیری وضعیت تراکنش‌های مشتریان و پرداخت‌های مربوط به درخواست سرویس",
  },
  payouts: {
    title: "درخواست‌های برداشت",
    description: "بررسی درخواست‌ها و ثبت نتیجه‌ی واریز یا رد با کد پیگیری",
  },
  ledger: {
    title: "گردش کیف پول",
    description: "ردیابی ورودی‌ها، خروجی‌ها و مانده‌ی پس از هر تراکنش سرویس‌دهندگان",
  },
  commission: {
    title: "تنظیم کمیسیون",
    description: "مدیریت نرخ سهم پلتفرم و مشاهده‌ی حداقل مبلغ برداشت",
  },
};

export function AccountingPage({ section = "overview" }: { section?: AccountingSection }) {
  const { status } = useSession();

  if (status === "loading")
    return <div className="p-8 text-center text-muted-foreground text-sm">در حال بررسی دسترسی...</div>;
  if (status === "unauthenticated")
    return (
      <div className="p-8 text-center text-sm" role="alert">
        برای دسترسی به امور مالی وارد پنل شوید.
      </div>
    );

  return (
    <div className="flex flex-col gap-4">
      <header>
        <p className="text-muted-foreground text-sm">امور مالی</p>
        <h1 className="mt-1 font-semibold text-2xl">{sectionContent[section].title}</h1>
        <p className="mt-1 text-muted-foreground text-sm">{sectionContent[section].description}</p>
      </header>
      {section === "overview" ? <AccountingOverview /> : null}
      {section === "payments" ? <PaymentsTab /> : null}
      {section === "payouts" ? <PayoutsTab /> : null}
      {section === "ledger" ? <LedgerTab /> : null}
      {section === "commission" ? <CommissionSettings /> : null}
    </div>
  );
}
