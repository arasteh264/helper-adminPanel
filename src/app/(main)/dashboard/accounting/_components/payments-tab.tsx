"use client";

import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { formatDate, formatToman, type PaymentStatus, paymentStatusLabels } from "./data";
import { PaginationControls, QueryState } from "./shared";
import { useCustomerPayments } from "./use-wallet-admin";

const paymentStatusTone: Record<PaymentStatus, "default" | "secondary" | "destructive" | "outline"> = {
  PENDING: "outline",
  PAID: "default",
  FAILED: "destructive",
  REFUNDED: "secondary",
};

export function PaymentsTab() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [status, setStatus] = useState<PaymentStatus | "ALL">("ALL");
  const query = useCustomerPayments({
    page,
    pageSize,
    status: status === "ALL" ? undefined : status,
  });

  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle>پرداخت‌های مشتریان</CardTitle>
        <CardDescription>فهرست پرداخت‌ها بر اساس وضعیت در API فیلتر می‌شود.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 px-0">
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
                  <TableHead>شناسه‌ی درخواست</TableHead>
                  <TableHead>مشتری</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>referenceId</TableHead>
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
                      <div className="grid gap-1">
                        <span dir="ltr" className="text-xs">
                          {row.serviceRequestId}
                        </span>
                        <span className="text-muted-foreground text-xs">{row.requestTitle}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="grid gap-1">
                        <span>{row.customerName || "—"}</span>
                        <span className="text-muted-foreground text-xs" dir="ltr">
                          {row.customerPhone || row.customerId}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>{row.providerName || "—"}</TableCell>
                    <TableCell dir="ltr">{row.referenceId || "—"}</TableCell>
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
    </Card>
  );
}
