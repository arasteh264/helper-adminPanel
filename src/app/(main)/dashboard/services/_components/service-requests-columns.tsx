// dashboard/service-requests/_components/service-requests-columns.tsx
"use client";
import type { ColumnDef } from "@tanstack/react-table";
import { Subscribe } from "@tanstack/react-table";

import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import type { DataTableFeatures } from "@/lib/data-table-features";

import { preferredTimeMeta, type ServiceRequestRow, statusMeta } from "./data";

const dateFormatter = new Intl.DateTimeFormat("fa-IR", {
  calendar: "persian",
  year: "numeric",
  month: "long",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function formatBudget(row: ServiceRequestRow) {
  if (row.budgetMin == null && row.budgetMax == null) return "—";
  const from = row.budgetMin?.toLocaleString("fa-IR") ?? "—";
  const to = row.budgetMax?.toLocaleString("fa-IR") ?? "—";
  return `${from} تا ${to} تومان`;
}

function StatusBadge({ status }: { status: ServiceRequestRow["status"] }) {
  const meta = statusMeta[status];
  return (
    <Badge variant="outline" className="gap-1.5 px-2 py-1 font-medium">
      <span className={`size-1.5 rounded-full ${meta.dotClass}`} />
      {meta.label}
    </Badge>
  );
}

export const serviceRequestsColumns: ColumnDef<DataTableFeatures, ServiceRequestRow>[] = [
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
              aria-label="انتخاب همه"
              checked={checked}
              onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)}
            />
          )}
        </Subscribe>
      </div>
    ),
    cell: ({ row }) => (
      <div className="flex items-center justify-center">
        <Subscribe source={row.table.atoms.rowSelection} selector={(s) => Boolean(s?.[row.id])}>
          {(checked) => (
            <Checkbox
              aria-label={`انتخاب ${row.original.title}`}
              checked={checked}
              onCheckedChange={(v) => row.toggleSelected(!!v)}
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
    accessorFn: (row) => `${row.title} ${row.description}`,
    filterFn: "includesString",
    enableHiding: true,
  },
  {
    id: "title",
    accessorFn: (row) => row.title,
    header: "عنوان",
    cell: ({ row }) => (
      <div className="flex max-w-[220px] flex-col">
        <span className="truncate font-medium text-sm">{row.original.title}</span>
        <span className="truncate text-muted-foreground text-xs">{row.original.description}</span>
      </div>
    ),
  },
  {
    id: "status",
    accessorFn: (row) => row.status,
    header: "وضعیت",
    filterFn: "equalsString",
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
  {
    id: "preferredTime",
    accessorFn: (row) => row.preferredTime ?? "",
    header: "زمان موردنظر",
    filterFn: "equalsString",
    cell: ({ row }) => {
      const value = row.original.preferredTime;
      return <span className="text-sm">{value ? preferredTimeMeta[value] : "—"}</span>;
    },
  },
  {
    id: "budget",
    header: "بودجه",
    enableSorting: false,
    cell: ({ row }) => <span className="text-sm tabular-nums">{formatBudget(row.original)}</span>,
  },
  {
    id: "customerId",
    accessorFn: (row) => row.customer?.name ?? row.customerId,
    header: "مشتری",
    cell: ({ row }) => {
      const { customer, customerId } = row.original;
      return customer ? (
        <div className="flex flex-col">
          <span className="text-sm">{customer.name}</span>
          <span className="text-muted-foreground text-xs">{customer.email}</span>
        </div>
      ) : (
        <span className="text-muted-foreground text-xs" dir="ltr">
          {customerId.slice(0, 8)}…
        </span>
      );
    },
  },
  {
    id: "createdAt",
    accessorFn: (row) => {
      const t = new Date(row.createdAt).getTime();
      return Number.isNaN(t) ? 0 : t;
    },
    header: "تاریخ ثبت",
    cell: ({ row }) => {
      const date = new Date(row.original.createdAt);
      return <div className="text-sm">{Number.isNaN(date.getTime()) ? "—" : dateFormatter.format(date)}</div>;
    },
  },
];
