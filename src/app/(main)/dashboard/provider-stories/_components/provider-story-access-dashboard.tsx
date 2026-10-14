"use client";

import { useState } from "react";

import Link from "next/link";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ChevronLeft, ChevronRight, Search, ShieldCheck, X } from "lucide-react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { adminApiFetch } from "@/lib/admin-api";

type ProviderAccess = {
  providerProfileId: string;
  providerName: string;
  email: string;
  isVerified: boolean;
  canPublishStories: boolean;
  canViewStoryStats: boolean;
};

type AccessPage = {
  items: ProviderAccess[];
  total: number;
  page: number;
  pageSize: number;
};

export function ProviderStoryAccessDashboard() {
  const token = useSession().data?.accessToken as string | undefined;
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const accessQuery = useQuery({
    queryKey: ["admin-provider-story-access", page, search],
    enabled: Boolean(token),
    queryFn: () => {
      if (!token) throw new Error("نشست مدیر در دسترس نیست.");
      const params = new URLSearchParams({
        page: String(page),
        pageSize: "20",
      });
      if (search.trim()) params.set("search", search.trim());
      return adminApiFetch<AccessPage>(`/admin/provider-stories/providers?${params.toString()}`, token);
    },
  });
  const accessMutation = useMutation({
    mutationFn: async ({
      provider,
      canPublishStories,
      canViewStoryStats,
    }: {
      provider: ProviderAccess;
      canPublishStories: boolean;
      canViewStoryStats: boolean;
      changedPermission: "publish" | "stats";
    }) => {
      if (!token) throw new Error("نشست مدیر در دسترس نیست.");
      return adminApiFetch<unknown>(`/admin/provider-stories/providers/${provider.providerProfileId}/access`, token, {
        method: "PATCH",
        body: JSON.stringify({ canPublishStories, canViewStoryStats }),
      });
    },
    onSuccess: async (_result, variables) => {
      await queryClient.invalidateQueries({
        queryKey: ["admin-provider-story-access"],
      });
      let message: string;
      if (variables.changedPermission === "publish") {
        message = variables.canPublishStories
          ? `مجوز انتشار برای ${variables.provider.providerName} فعال شد.`
          : `مجوز انتشار ${variables.provider.providerName} لغو شد.`;
      } else {
        message = `دسترسی مشاهده‌ی آمار برای ${variables.provider.providerName} به‌روزرسانی شد.`;
      }
      toast.success(message);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const providers = accessQuery.data?.items ?? [];
  const pageCount = Math.max(1, Math.ceil((accessQuery.data?.total ?? 0) / (accessQuery.data?.pageSize ?? 20)));

  return (
    <main className="flex flex-col gap-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-semibold text-2xl">مجوز انتشار استوری</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            متخصص را بر اساس نام پیدا کنید و مجوز انتشار یا مشاهده‌ی آمار را مدیریت کنید.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/dashboard/provider-stories">بازگشت به فهرست استوری‌ها</Link>
        </Button>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="size-5" />
            دسترسی متخصصان
          </CardTitle>
          <CardDescription>فعال‌کردن مجوز انتشار به متخصص اجازه می‌دهد استوری جدید ارسال کند.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative block max-w-md">
            <Search className="absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="جست‌وجو بر اساس نام متخصص..."
              className="pe-9"
              aria-label="جست‌وجوی نام متخصص"
            />
          </div>

          {accessQuery.isError && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              <p role="alert">{accessQuery.error.message}</p>
              <Button type="button" size="sm" variant="outline" onClick={() => void accessQuery.refetch()}>
                تلاش دوباره
              </Button>
            </div>
          )}

          {!accessQuery.isError && accessQuery.isPending && (
            <p className="py-5 text-center text-sm text-muted-foreground" role="status">
              در حال دریافت متخصصان...
            </p>
          )}

          {!accessQuery.isError && !accessQuery.isPending && providers.length === 0 && (
            <p className="rounded-lg border border-dashed p-5 text-center text-sm text-muted-foreground">
              {search.trim() ? "متخصصی با این نام پیدا نشد." : "متخصصی برای نمایش وجود ندارد."}
            </p>
          )}

          {!accessQuery.isError && !accessQuery.isPending && providers.length > 0 && (
            <Table>
              <TableHeader className="[&_tr]:border-t">
                <TableRow>
                  <TableHead>نام متخصص</TableHead>
                  <TableHead>ایمیل</TableHead>
                  <TableHead>وضعیت احراز هویت</TableHead>
                  <TableHead>مجوز انتشار استوری</TableHead>
                  <TableHead>مشاهده‌ی آمار</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {providers.map((provider) => (
                  <TableRow key={provider.providerProfileId}>
                    <TableCell className="font-medium">{provider.providerName}</TableCell>
                    <TableCell>{provider.email}</TableCell>
                    <TableCell>
                      {provider.isVerified ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
                          <Check className="size-4" />
                          تأییدشده
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-muted-foreground">
                          <X className="size-4" />
                          تأییدنشده
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={provider.canPublishStories}
                          disabled={accessMutation.isPending}
                          onCheckedChange={(checked) =>
                            accessMutation.mutate({
                              provider,
                              canPublishStories: checked,
                              canViewStoryStats: provider.canViewStoryStats,
                              changedPermission: "publish",
                            })
                          }
                          aria-label={`مجوز انتشار استوری برای ${provider.providerName}`}
                        />
                        <span className="text-sm">{provider.canPublishStories ? "فعال" : "غیرفعال"}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={provider.canViewStoryStats}
                          disabled={accessMutation.isPending}
                          onCheckedChange={(checked) =>
                            accessMutation.mutate({
                              provider,
                              canPublishStories: provider.canPublishStories,
                              canViewStoryStats: checked,
                              changedPermission: "stats",
                            })
                          }
                          aria-label={`مشاهده‌ی آمار استوری برای ${provider.providerName}`}
                        />
                        <span className="text-sm">{provider.canViewStoryStats ? "فعال" : "غیرفعال"}</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {accessQuery.data && accessQuery.data.total > accessQuery.data.pageSize ? (
            <div className="flex items-center justify-between border-t pt-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page <= 1 || accessQuery.isFetching}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                <ChevronRight /> قبلی
              </Button>
              <span className="text-xs text-muted-foreground">
                صفحه {page.toLocaleString("fa-IR")} از {pageCount.toLocaleString("fa-IR")} · تعداد متخصصان{" "}
                {accessQuery.data.total.toLocaleString("fa-IR")}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page >= pageCount || accessQuery.isFetching}
                onClick={() => setPage((current) => current + 1)}
              >
                بعدی <ChevronLeft />
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </main>
  );
}
