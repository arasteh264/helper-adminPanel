"use client";

import { LoaderCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function QueryState({
  loading,
  error,
  empty,
  onRetry,
}: {
  loading: boolean;
  error: string | null;
  empty: boolean;
  onRetry: () => void;
}) {
  if (loading) {
    return (
      <div className="flex min-h-40 items-center justify-center gap-2 text-muted-foreground text-sm" role="status">
        <LoaderCircle className="size-4 animate-spin" /> در حال دریافت اطلاعات...
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 p-6 text-center text-sm" role="alert">
        <span>{error}</span>
        <Button type="button" variant="outline" size="sm" onClick={onRetry}>
          تلاش دوباره
        </Button>
      </div>
    );
  }
  if (empty) return <div className="p-8 text-center text-muted-foreground text-sm">موردی برای نمایش وجود ندارد.</div>;
  return null;
}

export function PaginationControls({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 text-sm">
      <div className="flex items-center gap-2 text-muted-foreground">
        <span>ردیف در صفحه</span>
        <Select value={String(pageSize)} onValueChange={(value) => onPageSizeChange(Number(value))}>
          <SelectTrigger size="sm" className="w-20" aria-label="تعداد ردیف در صفحه">
            <SelectValue />
          </SelectTrigger>
          <SelectContent position="popper" align="start">
            <SelectGroup>
              {[20, 50, 100].map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground">
          صفحه {page.toLocaleString("fa-IR")} از {pageCount.toLocaleString("fa-IR")} · {total.toLocaleString("fa-IR")}{" "}
          مورد
        </span>
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          قبلی
        </Button>
        <Button variant="outline" size="sm" disabled={page >= pageCount} onClick={() => onPageChange(page + 1)}>
          بعدی
        </Button>
      </div>
    </div>
  );
}
