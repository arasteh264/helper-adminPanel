"use client";

import { useState } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Scale } from "lucide-react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

import { ApiError, apiFetch } from "./api";
import type { ServiceRequestRow } from "./data";

type Resolution = "BUYER" | "PROVIDER";

type DisputeDetails = {
  reason: string | null;
  description: string | null;
  updatedAt: string | null;
  requestDescription: string;
  amountToman: number | null;
  customer: { name: string; phone: string; email: string };
  provider: { name: string; phone: string; email: string } | null;
  messages: {
    id: string;
    body: string;
    createdAt: string;
    author: { id: string; name: string; role: string };
  }[];
};

const DISPUTE_REASON_LABELS: Record<string, string> = {
  WORK_NOT_COMPLETED: "کار انجام نشده یا ناقص است",
  WORK_QUALITY: "کیفیت انجام کار مورد قبول نیست",
  PRICE_DISAGREEMENT: "اختلاف بر سر مبلغ یا هزینه",
  PROVIDER_NO_SHOW: "متخصص برای انجام کار حاضر نشد",
  CUSTOMER_NON_PAYMENT: "اختلاف درباره‌ی پرداخت مشتری",
  OTHER: "سایر موارد",
};

export function ResolveDisputeAction({ request }: { request: ServiceRequestRow }) {
  const [open, setOpen] = useState(false);
  const [resolution, setResolution] = useState<Resolution | null>(null);
  const [reason, setReason] = useState("");
  const [reply, setReply] = useState("");
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const detailsQuery = useQuery({
    queryKey: ["service-request-dispute", request.id],
    enabled: open && Boolean(session?.accessToken),
    queryFn: async () => {
      const token = session?.accessToken;
      if (!token) throw new Error("نشست مدیر در دسترس نیست");
      return apiFetch<DisputeDetails>(`/admin/service-requests/${encodeURIComponent(request.id)}/dispute`, token);
    },
  });
  const mutation = useMutation({
    mutationFn: async () => {
      const token = session?.accessToken;
      if (!token) throw new Error("نشست مدیر در دسترس نیست");
      return apiFetch(`/admin/service-requests/${encodeURIComponent(request.id)}/dispute`, token, {
        method: "PATCH",
        body: JSON.stringify({ resolution, reason: reason.trim() }),
      });
    },
    onSuccess: async () => {
      toast.success("اختلاف با موفقیت تعیین تکلیف شد");
      setOpen(false);
      setReason("");
      setResolution(null);
      await queryClient.invalidateQueries({ queryKey: ["service-requests"] });
    },
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : "تعیین تکلیف اختلاف ناموفق بود");
    },
  });
  const replyMutation = useMutation({
    mutationFn: async () => {
      const token = session?.accessToken;
      if (!token) throw new Error("نشست مدیر در دسترس نیست");
      return apiFetch(`/admin/service-requests/${encodeURIComponent(request.id)}/dispute/messages`, token, {
        method: "POST",
        body: JSON.stringify({ body: reply.trim() }),
      });
    },
    onSuccess: async () => {
      setReply("");
      toast.success("پیام برای طرفین اختلاف ارسال شد.");
      await queryClient.invalidateQueries({
        queryKey: ["service-request-dispute", request.id],
      });
    },
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : "ارسال پیام ناموفق بود.");
    },
  });

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Scale className="size-4" />
        حل اختلاف
      </Button>
      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          if (!mutation.isPending) setOpen(nextOpen);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تعیین تکلیف اختلاف</DialogTitle>
            <DialogDescription>بررسی اختلاف درخواست «{request.title}»؛ ثبت دلیل تصمیم الزامی است.</DialogDescription>
          </DialogHeader>
          {detailsQuery.isPending && (
            <p className="text-muted-foreground text-sm" role="status">
              در حال دریافت جزئیات پرونده...
            </p>
          )}
          {detailsQuery.isError && (
            <div className="flex items-center justify-between gap-3 text-sm" role="alert">
              <span>دریافت جزئیات اختلاف ناموفق بود.</span>
              <Button type="button" variant="outline" size="sm" onClick={() => void detailsQuery.refetch()}>
                تلاش دوباره
              </Button>
            </div>
          )}
          {detailsQuery.data ? (
            <div className="max-h-64 space-y-3 overflow-y-auto rounded-lg border p-3 text-sm">
              <div>
                <p className="font-medium">
                  {detailsQuery.data.reason
                    ? (DISPUTE_REASON_LABELS[detailsQuery.data.reason] ?? detailsQuery.data.reason)
                    : "دلیل ثبت نشده"}
                </p>
                <p className="mt-1 whitespace-pre-wrap text-muted-foreground leading-6">
                  {detailsQuery.data.description ?? "شرحی ثبت نشده است."}
                </p>
                <p className="mt-3 border-t pt-3 text-muted-foreground leading-6">
                  درخواست اولیه: {detailsQuery.data.requestDescription}
                </p>
              </div>
              <div className="grid gap-2 border-t pt-3 sm:grid-cols-2">
                <p>
                  مشتری: {detailsQuery.data.customer.name} · {detailsQuery.data.customer.phone}
                </p>
                <p>
                  متخصص: {detailsQuery.data.provider?.name ?? "مشخص نشده"} · {detailsQuery.data.provider?.phone ?? "—"}
                </p>
                <p>مبلغ پرداخت‌شده: {detailsQuery.data.amountToman?.toLocaleString("fa-IR") ?? "—"} تومان</p>
              </div>
              {detailsQuery.data.messages.length ? (
                <ol className="space-y-2 border-t pt-3">
                  {detailsQuery.data.messages.map((message) => (
                    <li key={message.id} className="rounded-md bg-muted/50 p-2">
                      <p className="text-muted-foreground text-xs">
                        {message.author.name} · {new Date(message.createdAt).toLocaleString("fa-IR")}
                      </p>
                      <p className="mt-1 whitespace-pre-wrap leading-6">{message.body}</p>
                    </li>
                  ))}
                </ol>
              ) : null}
            </div>
          ) : null}
          {detailsQuery.data ? (
            <div className="space-y-2">
              <Textarea
                value={reply}
                onChange={(event) => setReply(event.target.value)}
                minLength={2}
                maxLength={2000}
                rows={3}
                placeholder="پیام برای مشتری و متخصص"
              />
              <Button
                type="button"
                variant="outline"
                disabled={reply.trim().length < 2 || replyMutation.isPending}
                onClick={() => replyMutation.mutate()}
              >
                {replyMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                ارسال پیام به طرفین
              </Button>
            </div>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant={resolution === "BUYER" ? "default" : "outline"}
              aria-pressed={resolution === "BUYER"}
              onClick={() => setResolution("BUYER")}
            >
              به نفع مشتری (بازپرداخت)
            </Button>
            <Button
              type="button"
              variant={resolution === "PROVIDER" ? "default" : "outline"}
              aria-pressed={resolution === "PROVIDER"}
              onClick={() => setResolution("PROVIDER")}
            >
              به نفع متخصص (تسویه)
            </Button>
          </div>
          <Textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            minLength={3}
            maxLength={1000}
            rows={4}
            placeholder="دلیل تصمیم (حداقل ۳ نویسه)"
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={mutation.isPending}>
              انصراف
            </Button>
            <Button
              type="button"
              disabled={!detailsQuery.data || !resolution || reason.trim().length < 3 || mutation.isPending}
              onClick={() => mutation.mutate()}
            >
              {mutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              ثبت تصمیم
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
