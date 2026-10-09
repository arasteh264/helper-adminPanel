"use client";
import * as React from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { type ColumnVisibilityState, type PaginationState, type SortingState, useTable } from "@tanstack/react-table";
import { Search } from "lucide-react";
import { useSession } from "next-auth/react";

import { AdminExportButton } from "@/app/(main)/dashboard/_components/admin-export-button";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Kbd } from "@/components/ui/kbd";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { dataTableFeatures } from "@/lib/data-table-features";

import type { ProviderRow } from "./data";
import { ProviderReviewDialog } from "./provider-review-dialog";
import { providersColumns } from "./providers-columns";
import { ProvidersTable } from "./providers-table";
import { usePendingProviders } from "./use-providers";

// بیرون از کامپوننت، تا در هر رندر آرایه‌ی جدید ساخته نشه
const EMPTY: ProviderRow[] = [];
const verificationStatuses = {
  PENDING: "در انتظار تأیید",
  APPROVED: "تأییدشده",
  REJECTED: "ردشده",
} as const;

export function PendingProviders({ verificationStatus = "PENDING" }: { verificationStatus?: "PENDING" | "APPROVED" }) {
  const { status } = useSession();
  const router = useRouter();
  const [search, setSearch] = React.useState("");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [availabilityFilter, setAvailabilityFilter] = React.useState<"All" | "available" | "unavailable">("All");
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const { data, isLoading, isError, refetch } = usePendingProviders({
    page: pagination.pageIndex + 1,
    pageSize: pagination.pageSize,
    search: searchQuery,
    availability: availabilityFilter,
    status: verificationStatus,
  });
  const providers = data?.items ?? EMPTY;
  const resetToFirstPage = () => {
    setPagination((current) => (current.pageIndex === 0 ? current : { ...current, pageIndex: 0 }));
  };

  const [rowSelection, setRowSelection] = React.useState({});
  const [sorting, setSorting] = React.useState<SortingState>([{ id: "createdAt", desc: true }]);
  const [columnVisibility, setColumnVisibility] = React.useState<ColumnVisibilityState>({
    search: false,
  });
  React.useEffect(() => {
    const timeoutId = window.setTimeout(() => setSearchQuery(search.trim()), 300);
    return () => window.clearTimeout(timeoutId);
  }, [search]);

  // سرویس‌دهنده‌ای که برای بررسی مدارک انتخاب شده؛ باز/بسته بودن Dialog از روی همین مشتق می‌شه
  const [selectedProvider, setSelectedProvider] = React.useState<ProviderRow | null>(null);

  const columns = React.useMemo(
    () =>
      providersColumns((provider) => {
        if (verificationStatus === "APPROVED") {
          router.push(`/dashboard/providers/${encodeURIComponent(provider.id)}`);
          return;
        }
        setSelectedProvider(provider);
      }),
    [verificationStatus, router],
  );

  const table = useTable({
    features: dataTableFeatures,
    data: providers,
    columns,
    state: {
      rowSelection,
      sorting,
      columnVisibility,
      pagination,
    },
    rowCount: data?.total ?? 0,
    manualPagination: true,
    getRowId: (row) => row.id,
    autoResetPageIndex: false,
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
  });

  const selectedCount = table.getFilteredSelectedRowModel().rows.length;
  const pageHeading = (
    <header>
      <h1 className="font-semibold text-2xl">
        {verificationStatus === "PENDING" ? "ثبت‌نام‌های در انتظار تأیید" : "فهرست متخصصان"}
      </h1>
      <p className="mt-1 text-muted-foreground text-sm">
        {verificationStatus === "PENDING"
          ? "فقط پرونده‌های نیازمند بررسی ثبت‌نام در این فهرست نمایش داده می‌شوند."
          : "متخصصان تأییدشده را جستجو کنید و برای مشاهده جزئیات، نام آن‌ها را باز کنید."}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button asChild size="sm" variant={verificationStatus === "PENDING" ? "default" : "outline"}>
          <Link href="/dashboard/pending-providers">در انتظار تأیید</Link>
        </Button>
        <Button asChild size="sm" variant={verificationStatus === "APPROVED" ? "default" : "outline"}>
          <Link href="/dashboard/providers">فهرست متخصصان</Link>
        </Button>
      </div>
    </header>
  );

  // return زودهنگام فقط بعد از همه‌ی hookها
  if (status === "loading" || isLoading) {
    return (
      <div className="flex flex-col gap-4">
        {pageHeading}
        <div className="p-6 text-center text-muted-foreground text-sm" role="status">
          در حال دریافت درخواست‌ها...
        </div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return (
      <div className="flex flex-col gap-4">
        {pageHeading}
        <div className="p-6 text-center text-sm" role="alert">
          برای مشاهده‌ی درخواست‌ها وارد پنل شوید.
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col gap-4">
        {pageHeading}
        <div className="flex flex-col items-center gap-3 p-6 text-sm" role="alert">
          دریافت درخواست‌های سرویس‌دهندگان ناموفق بود.
          <Button type="button" variant="outline" size="sm" onClick={() => refetch()}>
            تلاش دوباره
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {pageHeading}
      <Card>
        <CardHeader className="border-b has-data-[slot=card-action]:grid-cols-1 md:has-data-[slot=card-action]:grid-cols-[1fr_auto]">
          <CardTitle className="text-xl leading-none">
            {verificationStatus === "PENDING" ? "در انتظار تأیید" : verificationStatuses.APPROVED}
          </CardTitle>
          <CardDescription className="max-w-sm leading-snug">
            {data?.total.toLocaleString("fa-IR") ?? "—"} مورد ·{" "}
            {verificationStatus === "PENDING" ? "صف بررسی ثبت‌نام" : "مدیریت متخصصان تأییدشده"}
          </CardDescription>
          <CardAction className="col-start-1 row-start-auto flex w-full flex-wrap justify-start gap-2 justify-self-stretch md:col-start-2 md:row-span-2 md:row-start-1 md:w-auto md:flex-nowrap md:justify-end md:justify-self-end">
            <AdminExportButton dataset="providers" label="خروجی همه‌ی متخصصان" />
            <InputGroup className="h-7 w-full md:w-64">
              <InputGroupAddon align="inline-start">
                <Search className="size-3.5" />
              </InputGroupAddon>
              <InputGroupInput
                className="h-7"
                placeholder="جستجوی نام، ایمیل یا شماره..."
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  resetToFirstPage();
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
            <Select
              value={availabilityFilter}
              onValueChange={(value) => {
                setAvailabilityFilter(value as typeof availabilityFilter);
                resetToFirstPage();
              }}
            >
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
    </div>
  );
}
