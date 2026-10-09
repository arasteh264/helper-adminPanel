// dashboard/service-requests/_components/service-requests-list.tsx
"use client";
import * as React from "react";

import Link from "next/link";

import { type ColumnVisibilityState, type PaginationState, type SortingState, useTable } from "@tanstack/react-table";
import { Search } from "lucide-react";
import { useSession } from "next-auth/react";

import { AdminExportButton } from "@/app/(main)/dashboard/_components/admin-export-button";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { dataTableFeatures } from "@/lib/data-table-features";

import { PersianDatePicker } from "../../_components/persian-date-picker";
import {
  type ServiceRequestFilters,
  type ServiceRequestRow,
  type ServiceRequestStatus,
  toEndOfDayIso,
  toStartOfDayIso,
} from "./data";
import { ServiceRequestReviewSettings } from "./service-request-review-settings";
import { serviceRequestsColumns } from "./service-requests-columns";
import { ServiceRequestsTable } from "./service-requests-table";
import { useServiceRequests } from "./use-service-requests";

const EMPTY: ServiceRequestRow[] = [];

function getPageContent(initialStatus?: ServiceRequestStatus) {
  switch (initialStatus) {
    case "PENDING_ADMIN_REVIEW":
      return {
        title: "درخواست‌های در انتظار بررسی مدیر",
        description: "درخواست‌هایی که برای تصمیم‌گیری مدیر در صف هستند.",
      };
    case "DISPUTED":
      return {
        title: "درخواست‌های اختلاف‌دار",
        description: "درخواست‌هایی که اختلاف آن‌ها نیازمند رسیدگی مدیر است.",
      };
    default:
      return {
        title: "همه‌ی درخواست‌های سرویس",
        description: "درخواست‌های سرویس را جستجو و بر اساس وضعیت پالایش کنید.",
      };
  }
}

export function ServiceRequestsList({ initialStatus }: { initialStatus?: ServiceRequestStatus }) {
  const { status: sessionStatus } = useSession();

  const [statusFilter, setStatusFilter] = React.useState<ServiceRequestFilters["status"] | "All">(
    initialStatus ?? "All",
  );
  const [preferredTimeFilter, setPreferredTimeFilter] = React.useState<ServiceRequestFilters["preferredTime"] | "All">(
    "All",
  );
  const [budgetFrom, setBudgetFrom] = React.useState("");
  const [budgetTo, setBudgetTo] = React.useState("");
  const [createdFrom, setCreatedFrom] = React.useState("");
  const [createdTo, setCreatedTo] = React.useState("");
  const [searchInput, setSearchInput] = React.useState("");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  const filters: ServiceRequestFilters = React.useMemo(
    () => ({
      page: pagination.pageIndex + 1,
      pageSize: pagination.pageSize,
      search: searchQuery.trim() || undefined,
      status: statusFilter === "All" ? undefined : statusFilter,
      preferredTime: preferredTimeFilter === "All" ? undefined : preferredTimeFilter,
      budgetFrom: budgetFrom ? Number(budgetFrom) : undefined,
      budgetTo: budgetTo ? Number(budgetTo) : undefined,
      createdFrom: toStartOfDayIso(createdFrom),
      createdTo: toEndOfDayIso(createdTo),
      sortBy: "createdAt",
      sortOrder: "desc",
    }),
    [
      pagination.pageIndex,
      pagination.pageSize,
      searchQuery,
      statusFilter,
      preferredTimeFilter,
      budgetFrom,
      budgetTo,
      createdFrom,
      createdTo,
    ],
  );

  const { data, isLoading, isError, refetch } = useServiceRequests(filters);
  const requests = data?.rows ?? EMPTY;
  const total = data?.total ?? 0;
  const resetToFirstPage = () => {
    setPagination((current) => (current.pageIndex === 0 ? current : { ...current, pageIndex: 0 }));
  };

  const [rowSelection, setRowSelection] = React.useState({});
  const [sorting, setSorting] = React.useState<SortingState>([{ id: "createdAt", desc: true }]);
  React.useEffect(() => {
    const timeoutId = window.setTimeout(() => setSearchQuery(searchInput), 300);
    return () => window.clearTimeout(timeoutId);
  }, [searchInput]);

  const [columnVisibility, setColumnVisibility] = React.useState<ColumnVisibilityState>({ search: false });

  const table = useTable({
    features: dataTableFeatures,
    data: requests,
    columns: serviceRequestsColumns,
    state: {
      rowSelection,
      sorting,
      columnVisibility,
      pagination,
    },
    rowCount: total,
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
  const { title: pageTitle, description: pageDescription } = getPageContent(initialStatus);

  if (sessionStatus === "loading" || isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <header>
          <h1 className="font-semibold text-2xl">{pageTitle}</h1>
          <p className="mt-1 text-muted-foreground text-sm">{pageDescription}</p>
        </header>
        <div className="p-6 text-center text-muted-foreground text-sm" role="status">
          در حال دریافت درخواست‌ها...
        </div>
      </div>
    );
  }
  if (sessionStatus === "unauthenticated") {
    return (
      <div className="flex flex-col gap-4">
        <header>
          <h1 className="font-semibold text-2xl">{pageTitle}</h1>
          <p className="mt-1 text-muted-foreground text-sm">{pageDescription}</p>
        </header>
        <div className="p-6 text-center text-sm" role="alert">
          برای مشاهده‌ی درخواست‌ها وارد پنل شوید.
        </div>
      </div>
    );
  }
  if (isError) {
    return (
      <div className="flex flex-col gap-4">
        <header>
          <h1 className="font-semibold text-2xl">{pageTitle}</h1>
          <p className="mt-1 text-muted-foreground text-sm">{pageDescription}</p>
        </header>
        <div className="flex flex-col items-center gap-3 p-6 text-sm" role="alert">
          دریافت درخواست‌های سرویس ناموفق بود.
          <Button type="button" variant="outline" size="sm" onClick={() => refetch()}>
            تلاش دوباره
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="font-semibold text-2xl">{pageTitle}</h1>
        <p className="mt-1 text-muted-foreground text-sm">{pageDescription}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button asChild size="sm" variant={initialStatus === "PENDING_ADMIN_REVIEW" ? "default" : "outline"}>
            <Link href="/dashboard/services/review">در انتظار بررسی مدیر</Link>
          </Button>
          <Button asChild size="sm" variant={initialStatus === "DISPUTED" ? "default" : "outline"}>
            <Link href="/dashboard/services/disputes">اختلاف‌ها</Link>
          </Button>
          <Button asChild size="sm" variant={!initialStatus ? "default" : "outline"}>
            <Link href="/dashboard/services">همه‌ی درخواست‌ها</Link>
          </Button>
        </div>
      </header>
      <Card>
        <CardHeader className="border-b has-data-[slot=card-action]:grid-cols-1 md:has-data-[slot=card-action]:grid-cols-[1fr_auto]">
          <CardTitle className="text-xl leading-none">فهرست درخواست‌ها</CardTitle>
          <CardDescription className="max-w-sm leading-snug">مدیریت و فیلتر درخواست‌های ثبت‌شده</CardDescription>
          {!initialStatus ? (
            <div className="col-span-full">
              <ServiceRequestReviewSettings />
            </div>
          ) : null}
          <CardAction className="col-start-1 row-start-auto flex w-full flex-wrap justify-start gap-2 justify-self-stretch md:col-start-2 md:row-span-2 md:row-start-1 md:w-auto md:flex-nowrap md:justify-end md:justify-self-end">
            {!initialStatus ? <AdminExportButton dataset="service-requests" label="خروجی درخواست‌ها" /> : null}
            <InputGroup className="h-7 w-full md:w-64">
              <InputGroupAddon align="inline-start">
                <Search className="size-3.5" />
              </InputGroupAddon>
              <InputGroupInput
                className="h-7"
                placeholder="جستجوی عنوان یا توضیحات..."
                value={searchInput}
                onChange={(e) => {
                  setSearchInput(e.target.value);
                  resetToFirstPage();
                }}
              />
            </InputGroup>
          </CardAction>
        </CardHeader>

        <CardContent className="flex flex-col gap-4 px-0">
          <div className="flex flex-wrap items-end gap-3 px-4">
            {!initialStatus ? (
              <Select
                value={statusFilter}
                onValueChange={(v) => {
                  setStatusFilter(v as typeof statusFilter);
                  resetToFirstPage();
                }}
              >
                <SelectTrigger size="sm">
                  <span className="text-muted-foreground">وضعیت:</span>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent position="popper" align="start">
                  <SelectGroup>
                    <SelectItem value="All">همه</SelectItem>
                    <SelectItem value="PENDING_ADMIN_REVIEW">در انتظار بررسی مدیر</SelectItem>
                    <SelectItem value="OPEN">باز</SelectItem>
                    <SelectItem value="OFFER_ACCEPTED">پیشنهاد پذیرفته‌شده</SelectItem>
                    <SelectItem value="CUSTOMER_CONFIRMATION_PENDING">در انتظار تأیید مشتری</SelectItem>
                    <SelectItem value="IN_PROGRESS">در حال انجام</SelectItem>
                    <SelectItem value="AWAITING_CUSTOMER_CONFIRMATION">در انتظار تأیید نهایی</SelectItem>
                    <SelectItem value="COMPLETED">انجام‌شده</SelectItem>
                    <SelectItem value="CANCELLED">لغوشده</SelectItem>
                    <SelectItem value="EXPIRED">منقضی‌شده</SelectItem>
                    <SelectItem value="DISPUTED">مناقشه‌دار</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            ) : null}

            <Select
              value={preferredTimeFilter}
              onValueChange={(v) => {
                setPreferredTimeFilter(v as typeof preferredTimeFilter);
                resetToFirstPage();
              }}
            >
              <SelectTrigger size="sm">
                <span className="text-muted-foreground">زمان:</span>
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper" align="start">
                <SelectGroup>
                  <SelectItem value="All">همه</SelectItem>
                  <SelectItem value="URGENT">فوری</SelectItem>
                  <SelectItem value="FLEXIBLE">منعطف</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>

            <div className="flex items-center gap-1.5">
              <Input
                type="number"
                placeholder="بودجه از"
                className="h-8 w-28"
                value={budgetFrom}
                onChange={(e) => {
                  setBudgetFrom(e.target.value);
                  resetToFirstPage();
                }}
              />
              <Input
                type="number"
                placeholder="بودجه تا"
                className="h-8 w-28"
                value={budgetTo}
                onChange={(e) => {
                  setBudgetTo(e.target.value);
                  resetToFirstPage();
                }}
              />
            </div>

            <PersianDatePicker
              id="service-created-from"
              label="ثبت از تاریخ"
              value={createdFrom}
              maxDate={createdTo || undefined}
              onChange={(value) => {
                setCreatedFrom(value);
                resetToFirstPage();
              }}
            />
            <PersianDatePicker
              id="service-created-to"
              label="ثبت تا تاریخ"
              value={createdTo}
              minDate={createdFrom || undefined}
              onChange={(value) => {
                setCreatedTo(value);
                resetToFirstPage();
              }}
            />

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                resetToFirstPage();
                setStatusFilter(initialStatus ?? "All");
                setPreferredTimeFilter("All");
                setBudgetFrom("");
                setBudgetTo("");
                setCreatedFrom("");
                setCreatedTo("");
                setSearchInput("");
                setSearchQuery("");
              }}
            >
              پاک‌کردن فیلترها
            </Button>
          </div>

          <div className="flex items-center justify-between gap-3 px-4">
            <div className="text-muted-foreground text-sm tabular-nums">{selectedCount} مورد انتخاب‌شده</div>
          </div>

          <ServiceRequestsTable table={table} />
        </CardContent>
      </Card>
    </div>
  );
}
