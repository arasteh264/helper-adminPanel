"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ShieldCheck, ShieldOff } from "lucide-react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

import { Switch } from "@/components/ui/switch";
import { adminApiFetch } from "@/lib/admin-api";

type ReviewSettings = { requireServiceRequestReview: boolean };

export function ServiceRequestReviewSettings() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const settingsQuery = useQuery({
    queryKey: ["service-request-review-settings"],
    enabled: Boolean(session?.accessToken),
    queryFn: () => {
      if (!session?.accessToken) throw new Error("نشست مدیر در دسترس نیست.");
      return adminApiFetch<ReviewSettings>("/admin/service-requests/review-settings", session.accessToken);
    },
  });
  const updateMutation = useMutation({
    mutationFn: (requireServiceRequestReview: boolean) => {
      if (!session?.accessToken) throw new Error("نشست مدیر در دسترس نیست.");
      return adminApiFetch<ReviewSettings>("/admin/service-requests/review-settings", session.accessToken, {
        method: "PATCH",
        body: JSON.stringify({ requireServiceRequestReview }),
      });
    },
    onSuccess: async (settings) => {
      queryClient.setQueryData(["service-request-review-settings"], settings);
      toast.success(
        settings.requireServiceRequestReview
          ? "بررسی مدیر برای درخواست‌های جدید فعال شد"
          : "درخواست‌های جدید بدون بررسی مدیر ارسال می‌شوند",
      );
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "ذخیره‌ی تنظیمات ناموفق بود");
    },
  });

  if (settingsQuery.isPending || settingsQuery.isError || !settingsQuery.data) {
    if (settingsQuery.isError) {
      return (
        <div
          className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-destructive text-xs"
          role="alert"
        >
          دریافت تنظیم بررسی درخواست‌ها ناموفق بود. صفحه را دوباره بارگذاری کنید.
        </div>
      );
    }
    return (
      <div className="h-16 animate-pulse rounded-xl bg-muted/50" role="status" aria-label="در حال دریافت تنظیمات" />
    );
  }

  const enabled = settingsQuery.data.requireServiceRequestReview;
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-muted/25 px-4 py-3">
      <div className="flex min-w-0 items-start gap-3">
        <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          {enabled ? <ShieldCheck className="size-5" /> : <ShieldOff className="size-5" />}
        </span>
        <div>
          <p className="font-medium text-sm">بررسی درخواست‌ها پیش از ارسال به متخصص</p>
          <p className="mt-1 text-muted-foreground text-xs leading-5">
            {enabled
              ? "درخواست‌های جدید تا تأیید مدیر برای متخصصان مخفی می‌مانند."
              : "درخواست‌های جدید پس از ثبت، خودکار برای متخصصان واجد شرایط ارسال می‌شوند."}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2 font-medium text-xs">
        <span>{enabled ? "فعال" : "غیرفعال"}</span>
        <Switch
          checked={enabled}
          disabled={updateMutation.isPending}
          onCheckedChange={(checked) => updateMutation.mutate(checked)}
          aria-label="بررسی ادمین برای درخواست‌های جدید"
        />
      </div>
    </div>
  );
}
