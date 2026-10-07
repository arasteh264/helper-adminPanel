"use client";

import { useQuery } from "@tanstack/react-query";
import { BriefcaseBusiness, LoaderCircle, RefreshCw, Star, UserRoundPlus } from "lucide-react";
import { useSession } from "next-auth/react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

import { apiFetch } from "../../pending-providers/_components/api";

const monthLabelFormatter = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
  month: "short",
  timeZone: "Asia/Tehran",
});
type SpecialistInsightsData = {
  registrations: { month: string; count: number }[];
  topRated: { id: string; name: string; rating: number; skills: string[] }[];
  topCompletedJobs: { id: string; name: string; completedJobs: number }[];
};

const chartConfig = {
  registrations: {
    label: "متخصصان ثبت‌نام‌شده",
    color: "var(--primary)",
  },
} satisfies ChartConfig;

function useSpecialists() {
  const { data: session } = useSession();
  return useQuery({
    queryKey: ["admin-specialist-insights"],
    enabled: Boolean(session?.accessToken),
    queryFn: () => {
      if (!session?.accessToken) throw new Error("نشست مدیر در دسترس نیست.");
      return apiFetch<SpecialistInsightsData>("/admin/providers/analytics", session.accessToken);
    },
    refetchInterval: 120_000,
  });
}

export function SpecialistInsights() {
  const query = useSpecialists();
  const chartData = query.data?.registrations.map(({ month, count }) => ({
    month: monthLabelFormatter.format(new Date(month)),
    registrations: count,
  }));
  const topRated = query.data?.topRated ?? [];
  const topCompletedJobs = query.data?.topCompletedJobs ?? [];
  const retryButton = (
    <Button
      type="button"
      variant="outline"
      size="sm"
      aria-label="به‌روزرسانی آمار متخصصان"
      disabled={query.isFetching}
      onClick={() => void query.refetch()}
    >
      {query.isFetching ? <LoaderCircle className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
      <span className="sr-only">به‌روزرسانی</span>
    </Button>
  );

  return (
    <section className="grid gap-4" aria-label="آمار و رتبه‌بندی متخصصان">
      <header>
        <h2 className="font-semibold text-lg">عملکرد متخصصان</h2>
        <p className="mt-1 text-muted-foreground text-sm">ثبت‌نام‌های ماهانه و رتبه‌بندی بر اساس امتیاز</p>
      </header>
      {query.isPending ? (
        <div className="flex min-h-48 items-center justify-center gap-2 text-muted-foreground text-sm" role="status">
          <LoaderCircle className="size-4 animate-spin" />
          در حال دریافت اطلاعات متخصصان...
        </div>
      ) : query.isError ? (
        <Card>
          <CardHeader>
            <CardTitle>آمار متخصصان در دسترس نیست</CardTitle>
            <CardDescription>
              {query.error instanceof Error ? query.error.message : "دریافت اطلاعات متخصصان ناموفق بود."}
            </CardDescription>
            <CardAction>{retryButton}</CardAction>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-4">
          <Card>
            <CardHeader className="border-b">
              <CardTitle className="flex items-center gap-2">
                <UserRoundPlus className="size-4 text-primary" />
                ثبت‌نام متخصصان
              </CardTitle>
              <CardDescription>
                این ماه: {(chartData?.[chartData.length - 1]?.registrations ?? 0).toLocaleString("fa-IR")} نفر · ثبت‌نام
                ماهانه در ۱۲ ماه شمسی اخیر
              </CardDescription>
              <CardAction>{retryButton}</CardAction>
            </CardHeader>
            <CardContent className="pt-4">
              <ChartContainer config={chartConfig} className="h-64 w-full aspect-auto">
                <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid vertical={false} strokeDasharray="4 4" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tickMargin={8} />
                  <YAxis
                    allowDecimals={false}
                    axisLine={false}
                    tickLine={false}
                    width={36}
                    tickFormatter={(value: number) => value.toLocaleString("fa-IR")}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(value) => <span>{`${Number(value).toLocaleString("fa-IR")} نفر`}</span>}
                      />
                    }
                  />
                  <Bar
                    dataKey="registrations"
                    name="ثبت‌نام"
                    fill="var(--color-registrations)"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={36}
                  />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <div className="grid gap-4 xl:grid-cols-2">
            <Card>
              <CardHeader className="border-b">
                <CardTitle className="flex items-center gap-2">
                  <Star className="size-4 text-primary" />
                  متخصصان برتر بر اساس امتیاز
                </CardTitle>
                <CardDescription>متخصصان تأییدشده، مرتب‌شده بر اساس امتیاز ثبت‌شده</CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                {topRated.length ? (
                  <ol className="divide-y">
                    {topRated.map((provider, index) => (
                      <li key={provider.id} className="flex items-center justify-between gap-4 py-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted font-semibold text-sm tabular-nums">
                            {(index + 1).toLocaleString("fa-IR")}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate font-medium">{provider.name || "نام ثبت نشده"}</p>
                            <p className="truncate text-muted-foreground text-xs">
                              {provider.skills.join("، ") || "تخصص ثبت نشده"}
                            </p>
                          </div>
                        </div>
                        <span className="flex shrink-0 items-center gap-1 font-semibold tabular-nums">
                          <Star className="size-3.5 fill-amber-400 text-amber-500" />
                          {provider.rating.toLocaleString("fa-IR", { maximumFractionDigits: 2 })}
                        </span>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="py-12 text-center text-muted-foreground text-sm">
                    متخصص تأییدشده‌ای برای رتبه‌بندی نیست.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="border-b">
                <CardTitle className="flex items-center gap-2">
                  <BriefcaseBusiness className="size-4 text-primary" />
                  متخصصان بر اساس کارهای تکمیل‌شده
                </CardTitle>
                <CardDescription>رتبه‌بندی مستقل بر اساس تعداد درخواست‌هایی که با موفقیت تکمیل شده‌اند</CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                {topCompletedJobs.length ? (
                  <ol className="divide-y">
                    {topCompletedJobs.map((provider, index) => (
                      <li key={provider.id} className="flex items-center justify-between gap-4 py-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted font-semibold text-sm tabular-nums">
                            {(index + 1).toLocaleString("fa-IR")}
                          </span>
                          <p className="truncate font-medium">{provider.name || "نام ثبت نشده"}</p>
                        </div>
                        <span className="shrink-0 font-semibold tabular-nums">
                          {provider.completedJobs.toLocaleString("fa-IR")} کار
                        </span>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="py-12 text-center text-muted-foreground text-sm">
                    هنوز کار تکمیل‌شده‌ای برای رتبه‌بندی ثبت نشده است.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </section>
  );
}
