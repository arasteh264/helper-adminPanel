"use client";
import { useTransition } from "react";

import { type ColumnDef, Subscribe } from "@tanstack/react-table";
import { Check, MoreHorizontal, X } from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { approveProvider, rejectProvider } from "@/server/admin-provider-actions";

import { availabilityMeta, type ProviderRow } from "./data";

const dateFormatter = new Intl.DateTimeFormat("fa-IR", {
  calendar: "persian",
  year: "numeric",
  month: "long",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function AvailabilityBadge({ available }: { available: boolean }) {
  const meta = availabilityMeta[available ? "available" : "unavailable"];
  return (
    <Badge variant="outline" className="gap-1.5 px-2 py-1 font-medium">
      <span className={`size-1.5 rounded-full ${meta.dotClass}`} />
      {meta.label}
    </Badge>
  );
}

function ProviderActions({ provider }: { provider: ProviderRow }) {
  const [pending, startTransition] = useTransition();

  function run(action: () => Promise<{ ok: boolean; message?: string }>, success: string) {
    startTransition(async () => {
      const result = await action();
      if (result.ok) toast.success(success);
      else toast.error(result.message ?? "عملیات ناموفق بود");
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          aria-label={`عملیات ${provider.user.name}`}
          className="size-8 text-muted-foreground"
          size="icon-sm"
          variant="ghost"
          disabled={pending}
        >
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => run(() => approveProvider(provider.id), "سرویس‌دهنده تأیید شد")}>
          <Check /> تأیید
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onSelect={() => {
            // TODO: به‌جای prompt از یک Dialog با فیلد دلیل رد استفاده کن
            const note = window.prompt("دلیل رد درخواست؟");
            if (note) {
              run(() => rejectProvider(provider.id, note), "درخواست رد شد");
            }
          }}
        >
          <X /> رد درخواست
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// از یک آرایه‌ی ثابت به یک factory function تبدیل شد تا بتونیم کال‌بک باز کردن
// Dialog بررسی مدارک رو از کامپوننت والد (providers.tsx) بهش پاس بدیم
export function providersColumns(
  onSelectProvider: (provider: ProviderRow) => void,
): ColumnDef<DataTableFeatures, ProviderRow>[] {
  return [
    {
      id: "select",
      header: ({ table }) => (
        <div className="flex items-center justify-center">
          <Subscribe
            source={table.atoms.rowSelection}
            selector={() => table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
          >
            {(checked) => (
              <Checkbox
                aria-label="انتخاب همه"
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
                aria-label={`انتخاب ${row.original.user.name}`}
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
      accessorFn: (row) => `${row.user.name} ${row.user.email} ${row.user.phone}`,
      filterFn: "includesString",
      enableHiding: false,
    },
    {
      id: "name",
      accessorFn: (row) => row.user.name,
      header: "سرویس‌دهنده",
      cell: ({ row }) => {
        const { user, avatarUrl } = row.original;
        return (
          <button
            type="button"
            className="flex cursor-pointer items-center gap-3 text-start"
            onClick={() => onSelectProvider(row.original)}
          >
            <Avatar className="size-8">
              <AvatarImage src={avatarUrl ?? undefined} alt={user.name} />
              <AvatarFallback>{user.name.slice(0, 1)}</AvatarFallback>
            </Avatar>
            <span className="flex flex-col">
              <span className="font-medium text-sm">{user.name}</span>
              <span className="text-muted-foreground text-xs">{user.email}</span>
            </span>
          </button>
        );
      },
    },
    {
      id: "phone",
      accessorFn: (row) => row.user.phone,
      header: "شماره تماس",
      cell: ({ row }) => (
        <div className="text-sm tabular-nums" dir="ltr">
          {row.original.user.phone}
        </div>
      ),
    },
    {
      id: "skills",
      accessorFn: (row) => row.skills.map((s) => s.name).join(" "),
      header: "مهارت‌ها",
      enableSorting: false,
      cell: ({ row }) => {
        const { skills } = row.original;
        if (!skills.length) {
          return <span className="text-muted-foreground text-sm">—</span>;
        }
        return (
          <div className="flex flex-wrap gap-1">
            {skills.slice(0, 2).map((skill) => (
              <Badge key={skill.id} variant="secondary">
                {skill.name}
              </Badge>
            ))}
            {skills.length > 2 ? <Badge variant="outline">+{skills.length - 2}</Badge> : null}
          </div>
        );
      },
    },
    {
      id: "availability",
      accessorFn: (row) => (row.isAvailable ? "available" : "unavailable"),
      header: "وضعیت فعالیت",
      filterFn: "equalsString",
      cell: ({ row }) => <AvailabilityBadge available={row.original.isAvailable} />,
    },
    {
      id: "createdAt",
      accessorFn: (row) => new Date(row.createdAt).getTime(),
      header: "تاریخ ثبت‌نام",
      cell: ({ row }) => <div className="text-sm">{dateFormatter.format(new Date(row.original.createdAt))}</div>,
    },
    {
      id: "actions",
      header: () => <div className="text-start">عملیات</div>,
      cell: ({ row }) => <ProviderActions provider={row.original} />,
      enableHiding: false,
      enableSorting: false,
    },
  ];
}
