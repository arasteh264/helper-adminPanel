"use client";

import { useState } from "react";

import { useQuery } from "@tanstack/react-query";
import { Eye, RefreshCw } from "lucide-react";
import { useSession } from "next-auth/react";

import { AdminExportButton } from "@/app/(main)/dashboard/_components/admin-export-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { adminApiFetch } from "@/lib/admin-api";

import { formatDate, formatToman, type PaymentStatus, paymentStatusLabels } from "./data";
import { PaginationControls, QueryState } from "./shared";
import { useCustomerPayments } from "./use-wallet-admin";

const paymentStatusTone: Record<PaymentStatus, "default" | "secondary" | "destructive" | "outline"> = {
  PENDING: "outline",
  PAID: "default",
  FAILED: "destructive",
  REFUNDED: "secondary",
};

type ReconciliationResponse = {
  items: {
    key: string;
    category: string;
    title: string;
    amountToman: number;
    status: string;
    createdAt: string;
    explanation: string;
  }[];
  truncated: boolean;
};

type PaymentDetails = {
  title: string;
  amountToman: number;
  gateway: string;
  status: PaymentStatus;
  referenceId: string | null;
  failureReason: string | null;
  createdAt: string;
  paidAt: string | null;
  lastVerificationAttemptAt: string | null;
  requestStatus: string;
  customer: { name: string; phone: string; email: string };
  provider: { name: string; phone: string; email: string } | null;
};

export function PaymentsTab() {
  const { data: session } = useSession();
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [status, setStatus] = useState<PaymentStatus | "ALL">("ALL");
  const query = useCustomerPayments({
    page,
    pageSize,
    status: status === "ALL" ? undefined : status,
  });
  const reconciliation = useQuery({
    queryKey: ["admin-payment-reconciliation"],
    enabled: Boolean(session?.accessToken),
    refetchInterval: 60_000,
    queryFn: () => {
      if (!session?.accessToken) throw new Error("نشست مدیر در دسترس نیست.");
      return adminApiFetch<ReconciliationResponse>("/admin/operations/reconciliation", session.accessToken);
    },
  });
  const paymentDetails = useQuery({
    queryKey: ["admin-payment-details", selectedPaymentId],
    enabled: Boolean(session?.accessToken && selectedPaymentId),
    queryFn: () => {
      if (!session?.accessToken || !selectedPaymentId) throw new Error("شناسه‌ی پرداخت در دسترس نیست.");
      return adminApiFetch<PaymentDetails>(
        `/admin/payments/${encodeURIComponent(selectedPaymentId)}`,
        session.accessToken,
      );
    },
  });

  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle>پرداخت‌های مشتریان</CardTitle>
        <CardDescription>فهرست پرداخت‌ها بر اساس وضعیت در API فیلتر می‌شود.</CardDescription>
        <CardAction>
          <AdminExportButton dataset="payments" label="خروجی پرداخت‌ها" />
        </CardAction>
      </CardHeader>
      <CardContent className="grid gap-3 px-0">
        <section className="mx-4 grid gap-2 rounded-lg border p-3" aria-labelledby="reconciliation-heading">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 id="reconciliation-heading" className="font-medium text-sm">
                موارد نیازمند تطبیق مالی
              </h3>
              <p className="text-muted-foreground text-xs">
                گزارش فقط‌خواندنی؛ پیش از هر اصلاح، با گزارش درگاه/بانک تطبیق دهید.
              </p>
            </div>
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              aria-label="تازه‌سازی گزارش تطبیق"
              disabled={reconciliation.isFetching}
              onClick={() => void reconciliation.refetch()}
            >
              <RefreshCw className={reconciliation.isFetching ? "size-4 animate-spin" : "size-4"} />
            </Button>
          </div>
          {reconciliation.isPending ? (
            <p className="text-muted-foreground text-sm" role="status">
              در حال تطبیق رکوردها...
            </p>
          ) : null}
          {reconciliation.isError ? (
            <p className="text-destructive text-sm" role="alert">
              {reconciliation.error.message}
            </p>
          ) : null}
          {reconciliation.data && !reconciliation.data.items.length ? (
            <p className="text-muted-foreground text-sm">مورد مشکوکی در بررسی خودکار پیدا نشد.</p>
          ) : null}
          {reconciliation.data?.items.length ? (
            <ul className="grid gap-2">
              {reconciliation.data.items.slice(0, 8).map((item) => (
                <li key={item.key} className="grid gap-1 rounded-md bg-muted/40 p-2 text-sm">
                  <div className="flex flex-wrap justify-between gap-2">
                    <span className="font-medium">
                      {item.category} · {item.title}
                    </span>
                    <span className="tabular-nums">{formatToman(item.amountToman)}</span>
                  </div>
                  <span className="text-muted-foreground text-xs">{item.explanation}</span>
                </li>
              ))}
              {reconciliation.data.items.length > 8 ? (
                <li className="text-muted-foreground text-xs">
                  و {(reconciliation.data.items.length - 8).toLocaleString("fa-IR")} مورد دیگر…
                </li>
              ) : null}
            </ul>
          ) : null}
          {reconciliation.data?.truncated ? (
            <p className="text-amber-700 text-xs dark:text-amber-400">
              نتایج محدود شده‌اند؛ تعداد کل ممکن است بیشتر باشد.
            </p>
          ) : null}
        </section>
        <div className="px-4">
          <Select
            value={status}
            onValueChange={(value) => {
              setStatus(value as typeof status);
              setPage(1);
            }}
          >
            <SelectTrigger size="sm" className="w-52" aria-label="فیلتر وضعیت پرداخت">
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper" align="start">
              <SelectGroup>
                <SelectItem value="ALL">همه‌ی وضعیت‌ها</SelectItem>
                {(Object.keys(paymentStatusLabels) as PaymentStatus[]).map((value) => (
                  <SelectItem key={value} value={value}>
                    {paymentStatusLabels[value]}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
        <QueryState
          loading={query.isLoading}
          error={query.isError ? query.error.message : null}
          empty={!query.isLoading && !query.isError && !query.data?.items.length}
          onRetry={() => void query.refetch()}
        />
        {query.data?.items.length ? (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>مبلغ</TableHead>
                  <TableHead>وضعیت</TableHead>
                  <TableHead>درخواست سرویس</TableHead>
                  <TableHead>مشتری</TableHead>
                  <TableHead>سرویس‌دهنده</TableHead>
                  <TableHead>زمان پرداخت</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {query.data.items.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium tabular-nums">{formatToman(row.amountToman)}</TableCell>
                    <TableCell>
                      <Badge variant={paymentStatusTone[row.status]}>{paymentStatusLabels[row.status]}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="grid justify-items-start gap-1">
                        <span>{row.requestTitle}</span>
                        <Button variant="ghost" size="sm" onClick={() => setSelectedPaymentId(row.id)}>
                          <Eye className="size-3.5" />
                          جزئیات پرداخت
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="grid gap-1">
                        <span>{row.customerName || "—"}</span>
                        <span className="text-muted-foreground text-xs" dir="ltr">
                          {row.customerPhone || "شماره تماس ثبت نشده"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>{row.providerName || "—"}</TableCell>
                    <TableCell>{formatDate(row.paidAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <PaginationControls
              page={page}
              pageSize={pageSize}
              total={query.data.total}
              onPageChange={setPage}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setPage(1);
              }}
            />
          </>
        ) : null}
      </CardContent>
      <Dialog open={Boolean(selectedPaymentId)} onOpenChange={(open) => !open && setSelectedPaymentId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{paymentDetails.data?.title ?? "جزئیات پرداخت"}</DialogTitle>
            <DialogDescription>اطلاعات پردازش و پیگیری؛ این صفحه تغییری در تراکنش ایجاد نمی‌کند.</DialogDescription>
          </DialogHeader>
          {paymentDetails.isPending ? (
            <p role="status" className="text-sm">
              در حال دریافت جزئیات...
            </p>
          ) : null}
          {paymentDetails.isError ? (
            <p role="alert" className="text-destructive text-sm">
              {paymentDetails.error.message}
            </p>
          ) : null}
          {paymentDetails.data ? (
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">مبلغ</dt>
                <dd className="font-medium">{formatToman(paymentDetails.data.amountToman)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">وضعیت</dt>
                <dd>{paymentStatusLabels[paymentDetails.data.status]}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">درگاه</dt>
                <dd>{paymentDetails.data.gateway}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">کد پیگیری</dt>
                <dd>{paymentDetails.data.referenceId || "ثبت نشده"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">مشتری</dt>
                <dd>
                  {paymentDetails.data.customer.name} · {paymentDetails.data.customer.phone}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">متخصص</dt>
                <dd>{paymentDetails.data.provider?.name ?? "انتخاب نشده"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">ثبت</dt>
                <dd>{formatDate(paymentDetails.data.createdAt)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">پرداخت</dt>
                <dd>{formatDate(paymentDetails.data.paidAt)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">آخرین بررسی درگاه</dt>
                <dd>{formatDate(paymentDetails.data.lastVerificationAttemptAt)}</dd>
              </div>
              {paymentDetails.data.failureReason ? (
                <div className="sm:col-span-2">
                  <dt className="text-muted-foreground">شرح خطا</dt>
                  <dd className="break-words">{paymentDetails.data.failureReason}</dd>
                </div>
              ) : null}
            </dl>
          ) : null}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
