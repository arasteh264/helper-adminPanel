"use client";

import { useState } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import {
  dateBoundary,
  formatDate,
  formatToman,
  payoutStatusLabels,
  transactionTypeLabels,
  type WalletTransactionType,
} from "./data";
import { PaginationControls, QueryState } from "./shared";
import { useWalletTransactions } from "./use-wallet-admin";

export function LedgerTab() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [type, setType] = useState<WalletTransactionType | "ALL">("ALL");
  const [direction, setDirection] = useState<"all" | "in" | "out">("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const query = useWalletTransactions({
    page,
    pageSize,
    type: type === "ALL" ? undefined : type,
    direction: direction === "all" ? undefined : direction,
    createdFrom: dateBoundary(from),
    createdTo: dateBoundary(to, true),
  });

  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle>دفترکل Providerها</CardTitle>
        <CardDescription>مبالغ مثبت ورودی و مبالغ منفی خروجی به تومان نمایش داده می‌شوند.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 px-0">
        <div className="flex flex-wrap items-end gap-2 px-4">
          <Select
            value={type}
            onValueChange={(value) => {
              setType(value as typeof type);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-48" size="sm" aria-label="فیلتر نوع تراکنش">
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper" align="start">
              <SelectGroup>
                <SelectItem value="ALL">همه‌ی انواع</SelectItem>
                {Object.entries(transactionTypeLabels).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <Select
            value={direction}
            onValueChange={(value) => {
              setDirection(value as typeof direction);
              setPage(1);
            }}
          >
            <SelectTrigger size="sm" aria-label="فیلتر جهت">
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper" align="start">
              <SelectGroup>
                <SelectItem value="all">ورودی و خروجی</SelectItem>
                <SelectItem value="in">ورودی</SelectItem>
                <SelectItem value="out">خروجی</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
          <Input
            type="date"
            aria-label="از تاریخ"
            value={from}
            onChange={(event) => {
              setFrom(event.target.value);
              setPage(1);
            }}
            className="w-40"
          />
          <Input
            type="date"
            aria-label="تا تاریخ"
            value={to}
            onChange={(event) => {
              setTo(event.target.value);
              setPage(1);
            }}
            className="w-40"
          />
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
                  <TableHead>Provider</TableHead>
                  <TableHead>نوع تراکنش</TableHead>
                  <TableHead>مبلغ</TableHead>
                  <TableHead>موجودی پس از تراکنش</TableHead>
                  <TableHead>شرح</TableHead>
                  <TableHead>وضعیت برداشت</TableHead>
                  <TableHead>تاریخ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {query.data.items.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.providerName || "—"}</TableCell>
                    <TableCell>{transactionTypeLabels[row.type]}</TableCell>
                    <TableCell
                      className={`font-medium tabular-nums ${row.amount < 0 ? "text-destructive" : "text-emerald-700 dark:text-emerald-400"}`}
                    >
                      {row.amount < 0 ? "− " : "+ "}
                      {formatToman(Math.abs(row.amount))}
                    </TableCell>
                    <TableCell className="tabular-nums">{formatToman(row.balanceAfter)}</TableCell>
                    <TableCell className="max-w-64 whitespace-normal">{row.description || "—"}</TableCell>
                    <TableCell>{row.payoutStatus ? payoutStatusLabels[row.payoutStatus] : "—"}</TableCell>
                    <TableCell>{formatDate(row.createdAt)}</TableCell>
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
