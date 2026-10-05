"use client";

import { type FormEvent, useState } from "react";

import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

import { formatDate, formatToman, type PayoutRequest, type PayoutStatus, payoutStatusLabels } from "./data";
import { PaginationControls, QueryState } from "./shared";
import { usePayoutRequests, useReviewPayout } from "./use-wallet-admin";

type ReviewDialogState = {
  payout: PayoutRequest;
  decision: "PAID" | "REJECTED";
} | null;

const payoutStatuses: PayoutStatus[] = ["PENDING", "PAID", "REJECTED", "CANCELLED"];
const payoutStatusTones = {
  PENDING: "outline",
  PAID: "secondary",
  REJECTED: "destructive",
  CANCELLED: "secondary",
} as const;

export function PayoutsTab() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [status, setStatus] = useState<PayoutStatus | "ALL">("PENDING");
  const [review, setReview] = useState<ReviewDialogState>(null);
  const query = usePayoutRequests({ page, pageSize, status: status === "ALL" ? undefined : status });
  const mutation = useReviewPayout();
  let confirmationText = "";
  if (review) {
    confirmationText =
      review.decision === "PAID"
        ? `آیا مبلغ ${formatToman(review.payout.amount)} را به حساب سرویس‌دهنده واریز کرده‌اید؟ ثبت این عملیات فقط نتیجه را در پنل ثبت می‌کند و انتقال بانکی انجام نمی‌دهد.`
        : `با رد درخواست، مبلغ ${formatToman(review.payout.amount)} طبق منطق سامانه به کیف پول سرویس‌دهنده بازمی‌گردد.`;
  }
  let confirmationLabel = "تأیید رد";
  if (review?.decision === "PAID") confirmationLabel = "تأیید و ثبت";
  if (mutation.isPending) confirmationLabel = "در حال ثبت...";

  async function submitReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!review) return;
    const formData = new FormData(event.currentTarget);
    const referenceCode = String(formData.get("referenceCode") ?? "").trim();
    const rejectReason = String(formData.get("rejectReason") ?? "").trim();
    if (review.decision === "PAID" && !referenceCode) return;
    if (review.decision === "REJECTED" && !rejectReason) return;

    try {
      await mutation.mutateAsync({
        id: review.payout.id,
        decision: review.decision,
        ...(review.decision === "PAID" ? { referenceCode } : { rejectReason }),
      });
      toast.success(
        review.decision === "PAID" ? "نتیجه‌ی واریز برداشت ثبت شد" : "درخواست برداشت رد شد و مبلغ به کیف پول بازگشت",
      );
      setReview(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "بررسی درخواست برداشت ناموفق بود");
    }
  }

  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle>درخواست‌های برداشت سرویس‌دهندگان</CardTitle>
        <CardDescription>مقصد بانکی مطابق اطلاعات ثبت‌شده در زمان درخواست نمایش داده می‌شود.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 px-0">
        <div className="px-4">
          <Select
            value={status}
            onValueChange={(value) => {
              setStatus(value as PayoutStatus | "ALL");
              setPage(1);
            }}
          >
            <SelectTrigger size="sm" className="w-52" aria-label="فیلتر وضعیت برداشت">
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper" align="start">
              <SelectGroup>
                <SelectItem value="ALL">همه‌ی وضعیت‌ها</SelectItem>
                {payoutStatuses.map((value) => (
                  <SelectItem key={value} value={value}>
                    {payoutStatusLabels[value]}
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
                  <TableHead>سرویس‌دهنده</TableHead>
                  <TableHead>مبلغ</TableHead>
                  <TableHead>مقصد بانکی ثبت‌شده</TableHead>
                  <TableHead>وضعیت</TableHead>
                  <TableHead>تاریخ درخواست</TableHead>
                  <TableHead>نتیجه‌ی بررسی</TableHead>
                  <TableHead>عملیات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {query.data.items.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.providerName || "—"}</TableCell>
                    <TableCell className="font-medium tabular-nums">{formatToman(row.amount)}</TableCell>
                    <TableCell>
                      <div className="grid gap-1">
                        <span>{row.holderName}</span>
                        <span className="text-muted-foreground text-xs">
                          {row.bankName || "بانک نامشخص"} · <bdi dir="ltr">{row.sheba}</bdi>
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={payoutStatusTones[row.status]}>{payoutStatusLabels[row.status]}</Badge>
                    </TableCell>
                    <TableCell>{formatDate(row.createdAt)}</TableCell>
                    <TableCell className="max-w-48 whitespace-normal text-xs">
                      {row.referenceCode || row.rejectReason || (row.processedAt ? formatDate(row.processedAt) : "—")}
                    </TableCell>
                    <TableCell>
                      {row.status === "PENDING" ? (
                        <div className="flex gap-1">
                          <Button size="sm" onClick={() => setReview({ payout: row, decision: "PAID" })}>
                            ثبت واریز
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => setReview({ payout: row, decision: "REJECTED" })}
                          >
                            رد
                          </Button>
                        </div>
                      ) : (
                        "—"
                      )}
                    </TableCell>
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

      <AlertDialog open={!!review} onOpenChange={(open) => !open && !mutation.isPending && setReview(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {review?.decision === "PAID" ? "تأیید ثبت واریز" : "تأیید رد درخواست برداشت"}
            </AlertDialogTitle>
            <AlertDialogDescription>{confirmationText}</AlertDialogDescription>
          </AlertDialogHeader>
          <form id="payout-review-form" onSubmit={submitReview} className="grid gap-3">
            {review?.decision === "PAID" ? (
              <div className="grid gap-2">
                <label htmlFor="reference-code" className="font-medium text-sm">
                  کد پیگیری واریز
                </label>
                <Input id="reference-code" name="referenceCode" required maxLength={100} autoFocus />
              </div>
            ) : (
              <div className="grid gap-2">
                <label htmlFor="reject-reason" className="font-medium text-sm">
                  دلیل رد درخواست
                </label>
                <Textarea id="reject-reason" name="rejectReason" required maxLength={500} rows={4} autoFocus />
              </div>
            )}
          </form>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={mutation.isPending}>انصراف</AlertDialogCancel>
            <AlertDialogAction
              disabled={mutation.isPending || !review}
              onClick={(event) => {
                event.preventDefault();
                const form = document.getElementById("payout-review-form") as HTMLFormElement | null;
                form?.requestSubmit();
              }}
            >
              {confirmationLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
