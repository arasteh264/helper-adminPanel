"use client";

import * as React from "react";

import { useQuery } from "@tanstack/react-query";
import { useTable } from "@tanstack/react-table";
import { RefreshCw, Search } from "lucide-react";
import { useSession } from "next-auth/react";

import { AdminExportButton } from "@/app/(main)/dashboard/_components/admin-export-button";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { dataTableFeatures } from "@/lib/data-table-features";

import { getUsers } from "./api";
import type { UserRow } from "./data";
import { usersColumns } from "./users-columns";
import { UsersTable } from "./users-table";

const EMPTY: UserRow[] = [];

export function Users() {
  const { data: session, status: sessionStatus } = useSession();
  const [pagination, setPagination] = React.useState({ pageIndex: 0, pageSize: 10 });
  const [search, setSearch] = React.useState("");
  const [searchQuery, setSearchQuery] = React.useState("");

  React.useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setSearchQuery(search.trim());
      setPagination((current) => ({ ...current, pageIndex: 0 }));
    }, 300);
    return () => window.clearTimeout(timeoutId);
  }, [search]);

  const usersQuery = useQuery({
    queryKey: ["admin-users", pagination.pageIndex, pagination.pageSize, searchQuery],
    enabled: Boolean(session?.accessToken),
    queryFn: () => {
      if (!session?.accessToken) throw new Error("نشست مدیر در دسترس نیست");

      return getUsers({
        page: pagination.pageIndex + 1,
        pageSize: pagination.pageSize,
        search: searchQuery,
      });
    },
  });
  const users = usersQuery.data?.items ?? EMPTY;
  const total = usersQuery.data?.total ?? 0;
  const pageHeading = (
    <header>
      <h1 className="font-semibold text-2xl">مدیریت کاربران</h1>
      <p className="mt-1 text-muted-foreground text-sm">فهرست کاربران ثبت‌شده را جستجو و بررسی کنید.</p>
    </header>
  );

  const table = useTable({
    features: dataTableFeatures,
    data: users,
    columns: usersColumns,
    state: { pagination },
    rowCount: total,
    manualPagination: true,
    getRowId: (row) => row.id,
    onPaginationChange: setPagination,
  });

  if (sessionStatus === "loading" || usersQuery.isLoading) {
    return (
      <div className="flex flex-col gap-4">
        {pageHeading}
        <div className="p-6 text-center text-muted-foreground text-sm" role="status">
          در حال دریافت کاربران...
        </div>
      </div>
    );
  }

  if (sessionStatus === "unauthenticated") {
    return (
      <div className="flex flex-col gap-4">
        {pageHeading}
        <div className="p-6 text-center text-sm" role="alert">
          برای مشاهده فهرست کاربران وارد پنل شوید.
        </div>
      </div>
    );
  }

  if (usersQuery.isError) {
    return (
      <div className="flex flex-col gap-4">
        {pageHeading}
        <Card>
          <CardHeader>
            <CardTitle>دریافت کاربران ناموفق بود</CardTitle>
            <CardDescription>
              {usersQuery.error instanceof Error ? usersQuery.error.message : "اتصال API را بررسی کنید."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              type="button"
              variant="outline"
              className="rounded-lg"
              disabled={usersQuery.isFetching}
              onClick={() => void usersQuery.refetch()}
            >
              <RefreshCw className={usersQuery.isFetching ? "animate-spin" : ""} />
              تلاش دوباره
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {pageHeading}
      <Card>
        <CardHeader className="border-b has-data-[slot=card-action]:grid-cols-1 md:has-data-[slot=card-action]:grid-cols-[1fr_auto]">
          <CardTitle className="text-xl leading-none">فهرست کاربران</CardTitle>
          <CardDescription className="max-w-sm leading-snug">
            {total.toLocaleString("fa-IR")} کاربر ثبت‌شده
          </CardDescription>
          <CardAction className="col-start-1 row-start-auto flex w-full flex-wrap justify-start gap-2 justify-self-stretch md:col-start-2 md:row-span-2 md:row-start-1 md:w-auto md:flex-nowrap md:justify-end md:justify-self-end">
            <AdminExportButton dataset="users" label="خروجی کاربران" />
            <InputGroup className="h-9 w-full md:w-72">
              <InputGroupAddon align="inline-start">
                <Search className="size-4" />
              </InputGroupAddon>
              <InputGroupInput
                placeholder="جستجو بر اساس نام یا شماره تماس..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </InputGroup>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="rounded-lg"
              aria-label="تازه‌سازی فهرست کاربران"
              disabled={usersQuery.isFetching}
              onClick={() => void usersQuery.refetch()}
            >
              <RefreshCw className={usersQuery.isFetching ? "animate-spin" : ""} />
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 px-0">
          <div className="px-4 text-muted-foreground text-sm">
            نمایش {(pagination.pageIndex * pagination.pageSize + (users.length ? 1 : 0)).toLocaleString("fa-IR")} تا{" "}
            {(pagination.pageIndex * pagination.pageSize + users.length).toLocaleString("fa-IR")} از{" "}
            {total.toLocaleString("fa-IR")} کاربر
          </div>
          <UsersTable table={table} />
        </CardContent>
      </Card>
    </div>
  );
}
