"use client";
import * as React from "react";

import {
  type ColumnFiltersState,
  type ColumnVisibilityState,
  type PaginationState,
  type SortingState,
  useTable,
} from "@tanstack/react-table";
import { Search } from "lucide-react";
import { useSession } from "next-auth/react";

import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Kbd } from "@/components/ui/kbd";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { dataTableFeatures } from "@/lib/data-table-features";

import type { ProviderRow } from "../data";
import { ProviderReviewDialog } from "../provider-review-dialog";
import { providersColumns } from "../providers-columns";
import { ProvidersTable } from "../providers-table";
import { usePendingProviders } from "./use-providers";

// بیرون از کامپوننت، تا در هر رندر آرایه‌ی جدید ساخته نشه
const EMPTY: ProviderRow[] = [];

export function PendingProviders() {
  const { status } = useSession();
  const { data, isLoading, isError, refetch } = usePendingProviders();
  const providers = data ?? EMPTY;

  const [rowSelection, setRowSelection] = React.useState({});
  const [sorting, setSorting] = React.useState<SortingState>([{ id: "createdAt", desc: true }]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<ColumnVisibilityState>({
    search: false,
  });
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  // سرویس‌دهنده‌ای که برای بررسی مدارک انتخاب شده؛ باز/بسته بودن Dialog از روی همین مشتق می‌شه
  const [selectedProvider, setSelectedProvider] = React.useState<ProviderRow | null>(null);

  const columns = React.useMemo(() => providersColumns(setSelectedProvider), []);

  const table = useTable({
    features: dataTableFeatures,
    data: providers,
    columns,
    state: {
      rowSelection,
      sorting,
      columnFilters,
      columnVisibility,
      pagination,
    },
    getRowId: (row) => row.id,
    autoResetPageIndex: false,
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
  });

  const searchQuery = (table.getColumn("search")?.getFilterValue() as string | undefined) ?? "";
  const availabilityFilter = (table.getColumn("availability")?.getFilterValue() as string | undefined) ?? "All";
  const selectedCount = table.getFilteredSelectedRowModel().rows.length;

  function setColumnSelectFilter(columnId: string, value: string) {
    table.getColumn(columnId)?.setFilterValue(value === "All" ? undefined : value);
    table.setPageIndex(0);
  }

  // return زودهنگام فقط بعد از همه‌ی hookها
  if (status === "loading" || isLoading) {
    return <div className="p-6 text-center text-muted-foreground text-sm">در حال بارگذاری...</div>;
  }

  if (status === "unauthenticated") {
    return <div className="p-6 text-center text-sm">برای مشاهده باید وارد شوید.</div>;
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center gap-3 p-6 text-sm">
        خطا در دریافت اطلاعات
        <Button type="button" variant="outline" size="sm" onClick={() => refetch()}>
          تلاش دوباره
        </Button>
      </div>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="border-b has-data-[slot=card-action]:grid-cols-1 md:has-data-[slot=card-action]:grid-cols-[1fr_auto]">
          <CardTitle className="text-xl leading-none">سرویس‌دهنده‌های در انتظار تأیید</CardTitle>
          <CardDescription className="max-w-sm leading-snug">بررسی و تأیید درخواست‌های ثبت‌نام</CardDescription>
          <CardAction className="col-start-1 row-start-auto flex w-full flex-wrap justify-start gap-2 justify-self-stretch md:col-start-2 md:row-span-2 md:row-start-1 md:w-auto md:flex-nowrap md:justify-end md:justify-self-end">
            <InputGroup className="h-7 w-full md:w-64">
              <InputGroupAddon align="inline-start">
                <Search className="size-3.5" />
              </InputGroupAddon>
              <InputGroupInput
                className="h-7"
                placeholder="جستجوی نام، ایمیل یا شماره..."
                value={searchQuery}
                onChange={(event) => {
                  table.getColumn("search")?.setFilterValue(event.target.value || undefined);
                  table.setPageIndex(0);
                }}
              />
              <InputGroupAddon align="inline-end">
                <Kbd className="h-4 text-[10px]">⌘K</Kbd>
              </InputGroupAddon>
            </InputGroup>
          </CardAction>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 px-0">
          <div className="flex flex-wrap items-center gap-3 px-4">
            <Select value={availabilityFilter} onValueChange={(value) => setColumnSelectFilter("availability", value)}>
              <SelectTrigger size="sm">
                <span className="text-muted-foreground">فعالیت:</span>
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper" align="start">
                <SelectGroup>
                  <SelectItem value="All">همه</SelectItem>
                  <SelectItem value="available">آماده به کار</SelectItem>
                  <SelectItem value="unavailable">غیرفعال</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between gap-3 px-4">
            <div className="text-muted-foreground text-sm tabular-nums">{selectedCount} مورد انتخاب‌شده</div>
          </div>

          <ProvidersTable table={table} />
        </CardContent>
      </Card>

      <ProviderReviewDialog
        provider={selectedProvider}
        open={!!selectedProvider}
        onOpenChange={(open) => {
          if (!open) setSelectedProvider(null);
        }}
      />
    </>
  );
}
