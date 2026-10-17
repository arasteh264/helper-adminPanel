"use client";

import { useState } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

import { apiFetch } from "./api";

type CancellationRequest = {
  id: string;
  reason: string;
  note: string | null;
  requestedAt: string;
  serviceRequest: {
    id: string;
    title: string;
    description: string;
    status: string;
    address: string | null;
    payments: { status: string; amountToman: number }[];
    customer: { id: string; name: string; phone: string; email: string } | null;
  };
  provider: {
    id: string;
    user: { id: string; name: string; phone: string };
  };
};

const reasonLabels: Record<string, string> = {
  PROJECT_NOT_FOUND: "پروژه یا محل کار وجود ندارد",
  CUSTOMER_UNAVAILABLE: "مشتری در دسترس نیست",
  ACCESS_ISSUE: "مشکل دسترسی به محل",
  SCOPE_MISMATCH: "شرح کار با درخواست متفاوت است",
  SAFETY_CONCERN: "نگرانی ایمنی",
  OTHER: "سایر",
};

const paymentLabels: Record<string, string> = {
  PENDING: "در انتظار پرداخت",
  PAID: "پرداخت‌شده",
  FAILED: "ناموفق",
  REFUNDED: "بازپرداخت‌شده",
};

const dateFormatter = new Intl.DateTimeFormat("fa-IR", {
  calendar: "persian",
  dateStyle: "medium",
  timeStyle: "short",
});

export function ProviderCancellationRequests() {
  const { data: session, status: sessionStatus } = useSession();
  const accessToken = session?.accessToken as string | undefined;
  const queryClient = useQueryClient();
  const [notes, setNotes] = useState<Record<string, string>>({});
  const requestsQuery = useQuery({
    queryKey: ["provider-cancellation-requests"],
    enabled: Boolean(accessToken),
    queryFn: () => {
      if (!accessToken) throw new Error("نشست مدیر در دسترس نیست.");
      return apiFetch<CancellationRequest[]>("/admin/service-requests/cancellation-requests", accessToken);
    },
  });
  const reviewMutation = useMutation({
    mutationFn: async (input: { id: string; decision: "APPROVE" | "REJECT" }) => {
      if (!accessToken) throw new Error("نشست مدیر در دسترس نیست.");
      return apiFetch<{ id: string; status: string }>(
        `/admin/service-requests/${encodeURIComponent(input.id)}/cancellation-review`,
        accessToken,
        {
          method: "PATCH",
          body: JSON.stringify({
            decision: input.decision,
            note: notes[input.id]?.trim() || undefined,
          }),
        },
      );
    },
    onSuccess: async (_result, input) => {
      toast.success(
        input.decision === "APPROVE"
          ? "لغو کار تأیید شد؛ مشتری می‌تواند درخواست مشابه تازه‌ای ثبت کند."
          : "درخواست لغو رد شد و کار به وضعیت قبلی ادامه می‌دهد.",
      );
      await queryClient.invalidateQueries({
        queryKey: ["provider-cancellation-requests"],
      });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "بررسی درخواست ناموفق بود.");
    },
  });

  if (sessionStatus === "loading" || requestsQuery.isLoading) {
    return <p className="p-6 text-center text-muted-foreground text-sm">در حال دریافت درخواست‌های لغو...</p>;
  }
  if (sessionStatus === "unauthenticated") {
    return (
      <p className="p-6 text-center text-sm" role="alert">
        برای مشاهده‌ی این بخش وارد پنل شوید.
      </p>
    );
  }
  if (requestsQuery.isError) {
    return (
      <div className="grid justify-items-center gap-3 p-6 text-sm" role="alert">
        دریافت درخواست‌های لغو ناموفق بود.
        <Button type="button" variant="outline" onClick={() => requestsQuery.refetch()}>
          تلاش دوباره
        </Button>
      </div>
    );
  }

  const requests = requestsQuery.data ?? [];
  return (
    <main className="mx-auto grid w-full max-w-5xl gap-4">
      <header>
        <h1 className="font-semibold text-2xl">درخواست‌های لغو متخصص</h1>
        <p className="mt-1 text-muted-foreground text-sm">
          متخصص پس از پذیرش یا شروع کار، برای لغو باید دلیل ثبت کند و تصمیم نهایی با مدیر است.
        </p>
      </header>
      {requests.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground text-sm">
            درخواست لغوِ در انتظار بررسی وجود ندارد.
          </CardContent>
        </Card>
      ) : (
        requests.map((request) => {
          const payment = request.serviceRequest.payments[0];
          const busy = reviewMutation.isPending && reviewMutation.variables?.id === request.id;
          const note = notes[request.id] ?? "";
          return (
            <Card key={request.id}>
              <CardHeader>
                <CardTitle className="text-lg">{request.serviceRequest.title}</CardTitle>
                <CardDescription>
                  ثبت‌شده در {dateFormatter.format(new Date(request.requestedAt))}
                  {" · "}
                  دلیل: {reasonLabels[request.reason] ?? request.reason}
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                <dl className="grid gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-muted-foreground text-xs">مشتری</dt>
                    <dd className="mt-1 font-medium">
                      {request.serviceRequest.customer?.name ?? "—"}
                      {" · "}
                      {request.serviceRequest.customer?.phone ?? "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground text-xs">متخصص</dt>
                    <dd className="mt-1 font-medium">
                      {request.provider.user.name}
                      {" · "}
                      {request.provider.user.phone}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground text-xs">وضعیت پرداخت آخر</dt>
                    <dd className="mt-1 font-medium">
                      {payment
                        ? `${paymentLabels[payment.status] ?? payment.status} · ${payment.amountToman.toLocaleString("fa-IR")} تومان`
                        : "پرداختی ثبت نشده"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground text-xs">نشانی</dt>
                    <dd className="mt-1 font-medium">{request.serviceRequest.address ?? "—"}</dd>
                  </div>
                </dl>
                {payment?.status === "PAID" ? (
                  <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm leading-6">
                    تأیید لغو به‌تنهایی مبلغ پرداخت‌شده را بازپرداخت نمی‌کند؛ وضعیت مالی این درخواست باید جداگانه در بخش
                    امور مالی بررسی شود.
                  </p>
                ) : null}
                <div className="rounded-lg bg-muted/50 p-3 text-sm leading-7">
                  <p className="font-medium">شرح درخواست مشتری</p>
                  <p className="mt-1 whitespace-pre-wrap text-muted-foreground">{request.serviceRequest.description}</p>
                  {request.note ? (
                    <p className="mt-3 border-t pt-3">
                      <span className="font-medium">توضیح متخصص: </span>
                      {request.note}
                    </p>
                  ) : null}
                </div>
                <label htmlFor={`decision-note-${request.id}`} className="grid gap-1.5 text-sm">
                  توضیح تصمیم مدیر {note.trim().length < 5 ? "(برای رد الزامی است)" : ""}
                  <Textarea
                    id={`decision-note-${request.id}`}
                    value={note}
                    maxLength={1000}
                    onChange={(event) =>
                      setNotes((current) => ({
                        ...current,
                        [request.id]: event.target.value,
                      }))
                    }
                    placeholder="در صورت رد، دلیل را حداقل در ۵ نویسه بنویسید."
                  />
                </label>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    disabled={busy}
                    onClick={() => reviewMutation.mutate({ id: request.id, decision: "APPROVE" })}
                  >
                    تأیید لغو و آزادسازی درخواست
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={busy || note.trim().length < 5}
                    onClick={() => reviewMutation.mutate({ id: request.id, decision: "REJECT" })}
                  >
                    رد درخواست لغو
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })
      )}
    </main>
  );
}
