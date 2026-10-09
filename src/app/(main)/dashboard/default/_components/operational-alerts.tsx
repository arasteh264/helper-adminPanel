"use client";

import Link from "next/link";

import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CircleCheck, RefreshCw } from "lucide-react";
import { useSession } from "next-auth/react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { adminApiFetch } from "@/lib/admin-api";

type OperationalAlerts = {
  generatedAt: string;
  items: { key: string; label: string; count: number; href: string; severity: "high" | "medium" }[];
};

export function OperationalAlerts() {
  const { data: session } = useSession();
  const query = useQuery({
    queryKey: ["admin-operational-alerts"],
    enabled: Boolean(session?.accessToken),
    refetchInterval: 60_000,
    queryFn: () => {
      if (!session?.accessToken) throw new Error("نشست مدیر در دسترس نیست.");
      return adminApiFetch<OperationalAlerts>("/admin/operations/alerts", session.accessToken);
    },
  });
  const actionable = query.data?.items.filter((item) => item.count > 0) ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>موارد نیازمند پیگیری</CardTitle>
        <CardDescription>موارد حساس بر اساس زمان انتظار؛ هر دقیقه به‌روزرسانی می‌شود.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-2">
        {query.isPending && (
          <p className="py-3 text-muted-foreground text-sm" role="status">
            در حال بررسی صف‌های عملیاتی...
          </p>
        )}
        {query.isError && (
          <div className="flex flex-wrap items-center justify-between gap-3" role="alert">
            <p className="text-destructive text-sm">{query.error.message}</p>
            <Button type="button" variant="outline" size="sm" onClick={() => void query.refetch()}>
              <RefreshCw className="size-4" />
              تلاش دوباره
            </Button>
          </div>
        )}
        {!query.isPending &&
          !query.isError &&
          actionable.length > 0 &&
          actionable.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              className="flex items-center justify-between gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="flex items-center gap-2 text-sm">
                <AlertTriangle
                  className={item.severity === "high" ? "size-4 text-destructive" : "size-4 text-amber-600"}
                />
                {item.label}
              </span>
              <span className="rounded-full bg-muted px-2.5 py-1 font-semibold text-sm tabular-nums">
                {item.count.toLocaleString("fa-IR")}
              </span>
            </Link>
          ))}
        {!query.isPending && !query.isError && actionable.length === 0 && (
          <p className="flex items-center gap-2 py-3 text-emerald-700 text-sm dark:text-emerald-400">
            <CircleCheck className="size-4" />
            مورد زمان‌حساس نیازمند اقدام شناسایی نشد.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
