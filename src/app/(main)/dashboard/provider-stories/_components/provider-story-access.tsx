"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";

import { LoaderCircle, Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  getProviderStoryAccess,
  type ProviderStoryAccessItem,
  updateProviderStoryAccess,
} from "@/server/admin-provider-story-actions";

export function ProviderStoryAccess() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<ProviderStoryAccessItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);

  // biome-ignore lint/correctness/useExhaustiveDependencies: reload deliberately refetches after permission changes.
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    getProviderStoryAccess(page, search.trim())
      .then((result) => {
        if (!active) return;
        setItems(result.items);
        setTotal(result.total);
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : "دریافت مجوزهای استوری ناموفق بود.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [page, search, reload]);

  async function save(item: ProviderStoryAccessItem) {
    setBusyId(item.providerProfileId);
    setError("");
    try {
      await updateProviderStoryAccess(item.providerProfileId, item.canPublishStories, item.canViewStoryStats);
      setReload((value) => value + 1);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "ذخیره مجوز ناموفق بود.");
    } finally {
      setBusyId("");
    }
  }

  function updateItem(providerProfileId: string, changes: Partial<ProviderStoryAccessItem>) {
    setItems((current) =>
      current.map((item) => (item.providerProfileId === providerProfileId ? { ...item, ...changes } : item)),
    );
  }

  const pageCount = Math.max(1, Math.ceil(total / 20));
  let providerList: ReactNode;
  if (loading) {
    providerList = (
      <p className="flex items-center justify-center gap-2 py-10 text-muted-foreground" role="status">
        <LoaderCircle className="animate-spin" aria-hidden="true" />
        در حال دریافت فهرست...
      </p>
    );
  } else if (items.length) {
    providerList = items.map((item) => (
      <div
        key={item.providerProfileId}
        className="grid items-center gap-4 rounded-lg border p-4 lg:grid-cols-[minmax(180px,1fr)_auto_auto_auto]"
      >
        <div className="grid gap-1">
          <span className="font-medium">{item.providerName}</span>
          <span className="text-muted-foreground text-sm" dir="ltr">
            {item.email}
          </span>
          <span>
            <Badge variant={item.isVerified ? "secondary" : "outline"}>
              {item.isVerified ? "تأییدشده" : "تأییدنشده"}
            </Badge>
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Checkbox
            aria-label={`اجازه انتشار استوری برای ${item.providerName}`}
            checked={item.canPublishStories}
            onCheckedChange={(checked) => updateItem(item.providerProfileId, { canPublishStories: checked === true })}
          />
          اجازه انتشار استوری
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Checkbox
            aria-label={`اجازه مشاهده آمار برای ${item.providerName}`}
            checked={item.canViewStoryStats}
            onCheckedChange={(checked) => updateItem(item.providerProfileId, { canViewStoryStats: checked === true })}
          />
          اجازه مشاهده آمار
        </div>
        <Button
          size="sm"
          variant="outline"
          disabled={busyId === item.providerProfileId}
          onClick={() => void save(item)}
        >
          {busyId === item.providerProfileId ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : null}
          ذخیره مجوز
        </Button>
      </div>
    ));
  } else {
    providerList = <p className="py-10 text-center text-muted-foreground">متخصصی پیدا نشد.</p>;
  }

  return (
    <main className="mx-auto grid w-full max-w-6xl gap-5">
      <header className="grid gap-1">
        <h1 className="font-semibold text-2xl">مجوزهای استوری متخصصان</h1>
        <p className="text-muted-foreground text-sm">
          دسترسی انتشار استوری و مشاهده آمار را برای هر متخصص جداگانه مدیریت کنید.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>فهرست متخصصان</CardTitle>
          <CardDescription>{total.toLocaleString("fa-IR")} متخصص</CardDescription>
          <div className="relative mt-2 max-w-md">
            <Search
              className="absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="جست‌وجو بر اساس نام یا ایمیل"
              aria-label="جست‌وجوی متخصص"
              className="pr-9"
            />
          </div>
        </CardHeader>
        <CardContent className="grid gap-3">
          {error ? (
            <p
              className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-destructive text-sm"
              role="alert"
            >
              {error}
            </p>
          ) : null}
          {providerList}
        </CardContent>
      </Card>

      <footer className="flex items-center justify-between gap-3">
        <Button variant="outline" disabled={page <= 1 || loading} onClick={() => setPage((value) => value - 1)}>
          قبلی
        </Button>
        <span className="text-muted-foreground text-sm">
          صفحه {page.toLocaleString("fa-IR")} از {pageCount.toLocaleString("fa-IR")}
        </span>
        <Button variant="outline" disabled={page >= pageCount || loading} onClick={() => setPage((value) => value + 1)}>
          بعدی
        </Button>
      </footer>
    </main>
  );
}
