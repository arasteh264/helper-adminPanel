"use client";

import { useEffect, useState } from "react";

import { LoaderCircle, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  getProviderStoryUploadSettings,
  updateProviderStoryUploadSettings,
} from "@/server/admin-provider-story-actions";

export function ProviderStorySettings() {
  const [videoMaxSizeMB, setVideoMaxSizeMB] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let active = true;
    getProviderStoryUploadSettings()
      .then((settings) => {
        if (active) setVideoMaxSizeMB(String(settings.videoMaxSizeMB));
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : "دریافت محدودیت فایل ناموفق بود.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function saveSettings(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    const value = Number(videoMaxSizeMB);
    if (!Number.isSafeInteger(value) || value < 1 || value > 100) {
      setError("حداکثر حجم ویدیو باید عدد صحیح بین ۱ تا ۱۰۰ مگابایت باشد.");
      return;
    }

    setSaving(true);
    try {
      const settings = await updateProviderStoryUploadSettings(value);
      setVideoMaxSizeMB(String(settings.videoMaxSizeMB));
      setSuccess("محدودیت حجم ویدیو ذخیره شد.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "ذخیره محدودیت ناموفق بود.");
    } finally {
      setSaving(false);
    }
  }

  let submitLabel = "ذخیره محدودیت";
  if (loading) submitLabel = "در حال دریافت...";
  else if (saving) submitLabel = "در حال ذخیره...";

  return (
    <main className="mx-auto grid w-full max-w-3xl gap-5">
      <header className="grid gap-1">
        <h1 className="font-semibold text-2xl">تنظیمات و محدودیت استوری</h1>
        <p className="text-muted-foreground text-sm">
          قوانین بارگذاری و حد مجاز فایل‌هایی که متخصصان برای استوری استفاده می‌کنند.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>حداکثر حجم ویدیو</CardTitle>
          <CardDescription>
            بک‌اند مقدار را بین ۱ تا ۱۰۰ مگابایت می‌پذیرد و هنگام بارگذاری ویدیو هم همین تنظیم را کنترل می‌کند.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4" onSubmit={saveSettings}>
            <label className="grid max-w-sm gap-2 text-sm" htmlFor="story-video-max-size">
              سقف حجم (مگابایت)
              <Input
                id="story-video-max-size"
                type="number"
                inputMode="numeric"
                min={1}
                max={100}
                step={1}
                required
                value={videoMaxSizeMB}
                disabled={loading || saving}
                onChange={(event) => setVideoMaxSizeMB(event.target.value)}
              />
            </label>
            <ul className="grid gap-1 text-muted-foreground text-sm">
              <li>قالب‌های پشتیبانی‌شده در بک‌اند: تصویر و ویدیو.</li>
              <li>حد حجم تصویر در این API تنظیم جداگانه‌ای ندارد؛ فقط سقف حجم ویدیو قابل تغییر است.</li>
              <li>هر داستان تأییدشده‌ی رایگان پس از ۲۴ ساعت منقضی می‌شود؛ داستان پولی پس از پرداخت مدیریت می‌شود.</li>
            </ul>
            {error ? (
              <p
                className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-destructive text-sm"
                role="alert"
              >
                {error}
              </p>
            ) : null}
            {success ? (
              <p className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-sm" role="status">
                {success}
              </p>
            ) : null}
            <Button type="submit" className="w-fit" disabled={loading || saving}>
              {loading || saving ? (
                <LoaderCircle className="animate-spin" aria-hidden="true" />
              ) : (
                <Save aria-hidden="true" />
              )}
              {submitLabel}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
