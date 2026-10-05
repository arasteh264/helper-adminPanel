"use client";
import type { ColumnDef } from "@tanstack/react-table";

import { Badge } from "@/components/ui/badge";
import type { DataTableFeatures } from "@/lib/data-table-features";

import { roleLabels, statusMeta, type UserRow } from "./data";

function StatusBadge({ status }: { status: UserRow["status"] }) {
  const meta = statusMeta[status];
  return (
    <Badge className={`gap-1.5 border px-2 py-1 font-medium ${meta.badgeClass}`} variant="outline">
      <span className={`size-1.5 rounded-full ${meta.dotClass}`} />
      {meta.label}
    </Badge>
  );
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
  const date = new Date(dateString);
  return Number.isNaN(date.getTime()) ? "—" : jalaliFormatter.format(date);
}

export const usersColumns: ColumnDef<DataTableFeatures, UserRow>[] = [
  {
    accessorKey: "name",
    header: "نام",
    cell: ({ row }) => <div className="font-medium text-foreground text-sm">{row.original.name}</div>,
  },
  {
    accessorKey: "email",
    header: "ایمیل",
    cell: ({ row }) => (
      <div dir="ltr" className="text-start text-muted-foreground text-sm">
        {row.original.email}
      </div>
    ),
  },
  {
    accessorKey: "phone",
    header: "شماره تماس",
    cell: ({ row }) => (
      <div dir="ltr" className="text-start text-sm tabular-nums">
        {row.original.phone}
      </div>
    ),
  },
  {
    accessorKey: "role",
    header: "نقش",
    filterFn: "equalsString",
    cell: ({ row }) => <div className="text-sm">{roleLabels[row.original.role]}</div>,
  },
  {
    accessorKey: "status",
    header: "وضعیت",
    filterFn: "equalsString",
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
  {
    id: "joinedDate",
    accessorFn: (row) => new Date(row.joinedDate).getTime(),
    header: "تاریخ عضویت",
    cell: ({ row }) => <div className="text-foreground text-sm">{formatJalaliDate(row.original.joinedDate)}</div>,
  },
];
