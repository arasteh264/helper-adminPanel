"use client";

import { useEffect, useState } from "react";

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  const configQuery = useWalletConfiguration();
  const updateCommission = useUpdateCommission();
  const [rate, setRate] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    if (configQuery.data) setRate(String(configQuery.data.commissionRate));
  }, [configQuery.data]);

  const summary = summaryQuery.data;
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
    <div className="grid gap-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <Metric
          label="حجم پرداخت‌شده‌ی کل"
          value={summary?.allTimePaidVolumeToman}
          detail="پرداخت مشتریان، نه درآمد پلتفرم"
          icon={Banknote}
        />
        <Metric label="حجم پرداخت‌شده‌ی ماه جاری" value={summary?.currentMonthPaidVolumeToman} icon={Banknote} />
        <Metric
          label="کمیسیون کل پلتفرم"
          value={summary?.allTimePlatformCommissionToman}
          detail="درآمد پلتفرم از محل کمیسیون"
          icon={Coins}
        />
        <Metric label="کمیسیون ماه جاری" value={summary?.currentMonthPlatformCommissionToman} icon={Coins} />
        <Metric label="درآمد ناخالص Providerها" value={summary?.providerGrossEarningsToman} icon={WalletCards} />
        <Metric
          label="موجودی قابل برداشت Providerها"
          value={summary?.providerAvailableBalanceToman}
          icon={WalletCards}
        />
        <Metric label="وجوه رزروشده برای برداشت" value={summary?.providerFundsHeldToman} icon={Landmark} />
        <Metric
          label="برداشت‌های در انتظار"
          value={summary?.pendingPayoutAmountToman}
          detail={summary ? `${summary.pendingPayoutCount.toLocaleString("fa-IR")} درخواست` : undefined}
          icon={ChartNoAxesCombined}
        />
        <Metric
          label="مبلغ پرداخت‌شده به Providerها"
          value={summary?.totalPaidOutToman}
          detail={summary ? `ماه جاری: ${formatToman(summary.currentMonthPaidOutToman)}` : undefined}
          icon={Landmark}
        />
      </div>

      {summaryQuery.isError && (
        <Card>
          <CardContent className="pt-4">
            <QueryState
              loading={false}
              error={summaryQuery.error.message || "دریافت گزارش حسابداری ناموفق بود"}
              empty={false}
              onRetry={() => void summaryQuery.refetch()}
            />
          </CardContent>
        </Card>
      )}
      {summaryQuery.isPending && (
        <Card>
          <CardContent className="pt-4">
            <QueryState loading error={null} empty={false} onRetry={() => void summaryQuery.refetch()} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="border-b">
          <CardTitle>تنظیم کمیسیون پلتفرم</CardTitle>
          <CardDescription>تغییر نرخ از ۰ تا ۱۰۰ درصد، با حداکثر دو رقم اعشار</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          {configQuery.isError && (
            <QueryState
              loading={false}
              error={configQuery.error.message || "دریافت تنظیمات کمیسیون ناموفق بود"}
              empty={false}
              onRetry={() => void configQuery.refetch()}
            />
          )}
          {configQuery.isPending && (
            <QueryState loading error={null} empty={false} onRetry={() => void configQuery.refetch()} />
          )}
          {!configQuery.isError && !configQuery.isPending && (
            <>
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
                  className="w-40"
                />
              </div>
              <Badge variant="outline">حداقل برداشت: {formatToman(configQuery.data?.minWithdrawal ?? 0)}</Badge>
              <Button
                disabled={!isRateValid || parsedRate === configQuery.data?.commissionRate || updateCommission.isPending}
                onClick={() => setConfirmOpen(true)}
              >
                ثبت نرخ جدید
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأیید تغییر کمیسیون</AlertDialogTitle>
            <AlertDialogDescription>
              نرخ کمیسیون از {configQuery.data?.commissionRate ?? "—"}% به {rate}% تغییر می‌کند. این تصمیم مالی را تأیید
              می‌کنید؟
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
    </div>
  );
}

export function AccountingPage() {
  const { status } = useSession();

  if (status === "loading")
    return <div className="p-8 text-center text-muted-foreground text-sm">در حال بررسی دسترسی...</div>;
  if (status === "unauthenticated")
    return (
      <div className="p-8 text-center text-sm" role="alert">
        برای دسترسی به حسابداری وارد شوید.
      </div>
    );

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-semibold text-2xl">حسابداری و پرداخت‌ها</h1>
        <p className="mt-1 text-muted-foreground text-sm">گزارش مالی، گردش wallet و بررسی پرداخت‌ها و برداشت‌ها</p>
      </div>
      <Tabs defaultValue="accounting" dir="rtl">
        <TabsList className="h-auto w-full flex-wrap justify-start">
          <TabsTrigger value="accounting">گزارش حسابداری</TabsTrigger>
          <TabsTrigger value="ledger">دفترکل</TabsTrigger>
          <TabsTrigger value="payments">پرداخت مشتریان</TabsTrigger>
          <TabsTrigger value="payouts">برداشت Providerها</TabsTrigger>
        </TabsList>
        <TabsContent value="accounting" className="pt-2">
          <AccountingOverview />
        </TabsContent>
        <TabsContent value="ledger" className="pt-2">
          <LedgerTab />
        </TabsContent>
        <TabsContent value="payments" className="pt-2">
          <PaymentsTab />
        </TabsContent>
        <TabsContent value="payouts" className="pt-2">
          <PayoutsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
