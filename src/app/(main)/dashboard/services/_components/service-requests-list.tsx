// dashboard/service-requests/_components/service-requests-list.tsx
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
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { dataTableFeatures } from "@/lib/data-table-features";

import { type ServiceRequestFilters, type ServiceRequestRow, toEndOfDayIso, toStartOfDayIso } from "./data";
import { serviceRequestsColumns } from "./service-requests-columns";
import { ServiceRequestsTable } from "./service-requests-table";
import { useServiceRequests } from "./use-service-requests";

const EMPTY: ServiceRequestRow[] = [];

export function ServiceRequestsList() {
  const { status: sessionStatus } = useSession();

  const [statusFilter, setStatusFilter] = React.useState<ServiceRequestFilters["status"] | "All">("All");
  const [preferredTimeFilter, setPreferredTimeFilter] = React.useState<ServiceRequestFilters["preferredTime"] | "All">(
    "All",
  );
  const [budgetFrom, setBudgetFrom] = React.useState("");
  const [budgetTo, setBudgetTo] = React.useState("");
  const [createdFrom, setCreatedFrom] = React.useState("");
  const [createdTo, setCreatedTo] = React.useState("");

  const filters: ServiceRequestFilters = React.useMemo(
    () => ({
      status: statusFilter === "All" ? undefined : statusFilter,
      preferredTime: preferredTimeFilter === "All" ? undefined : preferredTimeFilter,
      budgetFrom: budgetFrom ? Number(budgetFrom) : undefined,
      budgetTo: budgetTo ? Number(budgetTo) : undefined,
      createdFrom: toStartOfDayIso(createdFrom),
      createdTo: toEndOfDayIso(createdTo),
      sortBy: "createdAt",
      sortOrder: "desc",
    }),
    [statusFilter, preferredTimeFilter, budgetFrom, budgetTo, createdFrom, createdTo],
  );

  const { data, isLoading, isError, refetch } = useServiceRequests(filters);
  const requests = data ?? EMPTY;

  const [rowSelection, setRowSelection] = React.useState({});
  const [sorting, setSorting] = React.useState<SortingState>([{ id: "createdAt", desc: true }]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<ColumnVisibilityState>({ search: false });
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  const table = useTable({
    features: dataTableFeatures,
    data: requests,
    columns: serviceRequestsColumns,
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
  const selectedCount = table.getFilteredSelectedRowModel().rows.length;

  if (sessionStatus === "loading" || isLoading) {
    return <div className="p-6 text-center text-muted-foreground text-sm">در حال بارگذاری...</div>;
  }
  if (sessionStatus === "unauthenticated") {
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
    <Card>
      <CardHeader className="border-b has-data-[slot=card-action]:grid-cols-1 md:has-data-[slot=card-action]:grid-cols-[1fr_auto]">
        <CardTitle className="text-xl leading-none">درخواست‌های سرویس</CardTitle>
        <CardDescription className="max-w-sm leading-snug">مدیریت و فیلتر درخواست‌های ثبت‌شده</CardDescription>
        <CardAction className="col-start-1 row-start-auto flex w-full flex-wrap justify-start gap-2 justify-self-stretch md:col-start-2 md:row-span-2 md:row-start-1 md:w-auto md:flex-nowrap md:justify-end md:justify-self-end">
          <InputGroup className="h-7 w-full md:w-64">
            <InputGroupAddon align="inline-start">
              <Search className="size-3.5" />
            </InputGroupAddon>
            <InputGroupInput
              className="h-7"
              placeholder="جستجوی عنوان یا توضیحات..."
              value={searchQuery}
              onChange={(e) => {
                table.getColumn("search")?.setFilterValue(e.target.value || undefined);
                table.setPageIndex(0);
              }}
            />
          </InputGroup>
        </CardAction>
      </CardHeader>

      <CardContent className="flex flex-col gap-4 px-0">
        <div className="flex flex-wrap items-end gap-3 px-4">
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
            <SelectTrigger size="sm">
              <span className="text-muted-foreground">وضعیت:</span>
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper" align="start">
              <SelectGroup>
                <SelectItem value="All">همه</SelectItem>
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

          <Select
            value={preferredTimeFilter}
            onValueChange={(v) => setPreferredTimeFilter(v as typeof preferredTimeFilter)}
          >
            <SelectTrigger size="sm">
              <span className="text-muted-foreground">زمان:</span>
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper" align="start">
              <SelectGroup>
                <SelectItem value="All">همه</SelectItem>
                <SelectItem value="URGENT">فوری</SelectItem>
                <SelectItem value="THIS_WEEK">همین هفته</SelectItem>
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
              onChange={(e) => setBudgetFrom(e.target.value)}
            />
            <Input
              type="number"
              placeholder="بودجه تا"
              className="h-8 w-28"
              value={budgetTo}
              onChange={(e) => setBudgetTo(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-1.5">
            <Input
              type="date"
              className="h-8 w-36"
              value={createdFrom}
              onChange={(e) => setCreatedFrom(e.target.value)}
            />
            <Input type="date" className="h-8 w-36" value={createdTo} onChange={(e) => setCreatedTo(e.target.value)} />
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setStatusFilter("All");
              setPreferredTimeFilter("All");
              setBudgetFrom("");
              setBudgetTo("");
              setCreatedFrom("");
              setCreatedTo("");
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
  );
}
