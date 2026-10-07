"use client";

import { LoaderCircle, RefreshCw } from "lucide-react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

import { formatToman } from "./data";
import { useMonthlyCommissions } from "./use-wallet-admin";

const monthFormatter = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
  month: "short",
  year: "2-digit",
  timeZone: "Asia/Tehran",
});
const compactNumberFormatter = new Intl.NumberFormat("fa-IR", { notation: "compact", maximumFractionDigits: 1 });

const chartConfig = {
  amount: {
    label: "درآمد کمیسیون پلتفرم",
    color: "var(--primary)",
  },
} satisfies ChartConfig;

export function CommissionTrend() {
  const query = useMonthlyCommissions();
  const chartData = query.data?.map(({ month, amount }) => ({
    month: monthFormatter.format(month),
    amount,
  }));

  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle>روند درآمد کمیسیون پلتفرم</CardTitle>
        <CardDescription>
          سهم واقعی پلتفرم از تراکنش‌های ۱۲ ماه اخیر؛ این عدد سود خالص پس از کسر هزینه‌های عملیاتی نیست.
        </CardDescription>
        <CardAction>
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-label="به‌روزرسانی نمودار درآمد"
            disabled={query.isFetching}
            onClick={() => void query.refetch()}
          >
            {query.isFetching ? <LoaderCircle className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
            <span className="sr-only">به‌روزرسانی</span>
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="pt-4">
        {query.isPending ? (
          <div className="flex h-64 items-center justify-center gap-2 text-muted-foreground text-sm" role="status">
            <LoaderCircle className="size-4 animate-spin" />
            در حال دریافت تراکنش‌های کمیسیون...
          </div>
        ) : query.isError ? (
          <div className="flex min-h-64 flex-col items-center justify-center gap-3 text-center text-sm" role="alert">
            <p>{query.error.message || "دریافت روند درآمد ناموفق بود."}</p>
            <Button type="button" variant="outline" size="sm" onClick={() => void query.refetch()}>
              تلاش دوباره
            </Button>
          </div>
        ) : !chartData?.length ? (
          <div className="flex h-64 items-center justify-center text-muted-foreground text-sm">
            تراکنش کمیسیونی برای نمایش وجود ندارد.
          </div>
        ) : (
          <>
            <ChartContainer config={chartConfig} className="h-64 w-full aspect-auto">
              <AreaChart data={chartData} margin={{ top: 12, right: 8, left: 8, bottom: 0 }}>
                <defs>
                  <linearGradient id="commission-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-amount)" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="var(--color-amount)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="4 4" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tickMargin={10} />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  width={48}
                  tickFormatter={(value: number) => compactNumberFormatter.format(value)}
                />
                <ChartTooltip
                  cursor={false}
                  content={
                    <ChartTooltipContent
                      formatter={(value) => (
                        <span className="font-medium tabular-nums">
                          {typeof value === "number" ? formatToman(value) : value}
                        </span>
                      )}
                    />
                  }
                />
                <Area
                  type="monotone"
                  dataKey="amount"
                  stroke="var(--color-amount)"
                  strokeWidth={3}
                  fill="url(#commission-fill)"
                  activeDot={{ r: 5, strokeWidth: 2 }}
                />
              </AreaChart>
            </ChartContainer>
            <p className="mt-2 text-center text-muted-foreground text-xs">داده‌ها هر ۶۰ ثانیه به‌روزرسانی می‌شوند.</p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
