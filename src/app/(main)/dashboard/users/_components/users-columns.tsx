"use client";
import type { ColumnDef } from "@tanstack/react-table";
import { Subscribe } from "@tanstack/react-table";
import { cn } from "cn";
import { parse } from "date-fns";
import { MoreHorizontal } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { DataTableFeatures } from "@/lib/data-table-features";

import { statusMeta, type UserRow } from "./data";

function StatusBadge({ status }: { status: UserRow["status"] }) {
  // const meta = statusMeta[status];
  // return (
  //   <Badge className={cn("gap-1.5 border px-2 py-1 font-medium", meta.badgeClass)} variant="outline">
  //     <span className={cn("size-1.5 rounded-full", meta.dotClass)} />
  //     {status}
  //   </Badge>
  // );
}

const jalaliFormatter = new Intl.DateTimeFormat("fa-IR", {
  calendar: "persian",
  year: "numeric",
  month: "long",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function formatJalaliDate(dateString: string) {
  const date = parse(dateString, "dd MMM yyyy, h:mm a", new Date());
  return jalaliFormatter.format(date);
}

export const usersColumns: ColumnDef<DataTableFeatures, UserRow>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <div className="flex items-center justify-center">
        <Subscribe
          source={table.atoms.rowSelection}
          selector={() =>
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && !table.getIsAllPageRowsSelected() && "indeterminate")
          }
        >
          {(checked) => (
            <Checkbox
              aria-label="انتخاب همه کاربران"
              checked={checked}
              onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
            />
          )}
        </Subscribe>
      </div>
    ),
    cell: ({ row }) => (
      <div className="flex items-center justify-center">
        <Subscribe source={row.table.atoms.rowSelection} selector={(selection) => Boolean(selection?.[row.id])}>
          {(checked) => (
            <Checkbox
              aria-label={`انتخاب ${row.original.name}`}
              checked={checked}
              onCheckedChange={(value) => row.toggleSelected(!!value)}
            />
          )}
        </Subscribe>
      </div>
    ),
    enableHiding: false,
    enableSorting: false,
  },
  {
    id: "search",
    accessorFn: (row) => `${row.name} ${row.email} ${row.phone}`,
    filterFn: "includesString",
    enableHiding: true,
  },
  {
    accessorKey: "name",
    header: "نام",
    cell: ({ row }) => <div className="font-medium text-foreground text-sm">{row.original.name}</div>,
  },
  {
    accessorKey: "email",
    header: "ایمیل",
    cell: ({ row }) => <div className="text-muted-foreground text-sm">{row.original.email}</div>,
  },
  {
    accessorKey: "phone",
    header: "شماره تماس",
    cell: ({ row }) => <div className="text-sm">{row.original.phone}</div>,
  },
  {
    accessorKey: "role",
    header: "نقش",
    filterFn: "equalsString",
    cell: ({ row }) => <div className="text-sm">{row.original.role}</div>,
  },
  {
    accessorKey: "status",
    header: "وضعیت",
    filterFn: "equalsString",
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
  {
    id: "joinedDate",
    accessorFn: (row) => parse(row.joinedDate, "dd MMM yyyy, h:mm a", new Date()).getTime(),
    header: "تاریخ عضویت",
    cell: ({ row }) => <div className="text-foreground text-sm">{formatJalaliDate(row.original.joinedDate)}</div>,
  },
  {
    id: "actions",
    header: () => <div className="text-right">عملیات</div>,
    cell: ({ row }) => (
      <div className="text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              aria-label={`باز کردن عملیات برای ${row.original.name}`}
              className="size-8 rounded-md text-muted-foreground hover:bg-muted/50"
              size="icon-sm"
              variant="ghost"
            >
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>مشاهده پروفایل</DropdownMenuItem>
            <DropdownMenuItem>ویرایش کاربر</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive">غیرفعال‌سازی کاربر</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    ),
    enableHiding: false,
    enableSorting: false,
  },
];
