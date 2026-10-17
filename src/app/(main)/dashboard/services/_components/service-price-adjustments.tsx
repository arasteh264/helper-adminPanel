"use client";

import { useState } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

import { apiFetch } from "./api";

type PriceAdjustment = {
  id: string;
  reason: string;
  items: {
    description: string;
    quantity: number;
    unitPriceToman: number;
    amountToman: number;
  }[];
  previousTotalToman: number;
  newTotalToman: number;
  amountToman: number;
  createdAt: string;
  serviceRequest: {
    id: string;
    title: string;
    status: string;
    customer: { id: string; name: string; phone: string } | null;
    acceptedProviderProfile: {
      id: string;
      user: { id: string; name: string; phone: string };
    } | null;
  };
};

const dateFormatter = new Intl.DateTimeFormat("fa-IR", {
  calendar: "persian",
  dateStyle: "medium",
  timeStyle: "short",
});

const formatMoney = (amount: number) => `${amount.toLocaleString("fa-IR")} تومان`;

export function ServicePriceAdjustments() {
  const { data: session, status: sessionStatus } = useSession();
  const accessToken = session?.accessToken as string | undefined;
  const queryClient = useQueryClient();
  const [notes, setNotes] = useState<Record<string, string>>({});
  const requestsQuery = useQuery({
    queryKey: ["service-price-adjustments-pending"],
    enabled: Boolean(accessToken),
    queryFn: () => {
      if (!accessToken) throw new Error("نشست پشتیبانی در دسترس نیست.");
      return apiFetch<PriceAdjustment[]>("/admin/service-price-adjustments/pending", accessToken);
    },
  });
  const reviewMutation = useMutation({
    mutationFn: async (input: { id: string; decision: "APPROVE" | "REJECT" }) => {
      if (!accessToken) throw new Error("نشست پشتیبانی در دسترس نیست.");
      const note = notes[input.id]?.trim();
      if (input.decision === "REJECT" && (!note || note.length < 5)) {
        throw new Error("برای رد درخواست، دلیل را حداقل در ۵ نویسه بنویسید.");
      }
      return apiFetch<{ id: string; status: string }>(
        `/admin/service-price-adjustments/${encodeURIComponent(input.id)}/review`,
        accessToken,
        {
          method: "PATCH",
          body: JSON.stringify({
            decision: input.decision,
            note: note || undefined,
          }),
        },
      );
    },
    onSuccess: async (_result, input) => {
      toast.success(
        input.decision === "APPROVE"
          ? "اصلاح مبلغ تأیید شد و برای تصمیم‌گیری به مشتری نمایش داده می‌شود."
          : "اصلاح مبلغ رد شد؛ مبلغ قبلی حفظ می‌شود.",
      );
      await queryClient.invalidateQueries({
        queryKey: ["service-price-adjustments-pending"],
      });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "بررسی درخواست انجام نشد.");
    },
  });

  if (sessionStatus === "loading" || requestsQuery.isLoading) {
    return <p className="p-6 text-center text-muted-foreground text-sm">در حال دریافت درخواست‌ها…</p>;
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
        دریافت درخواست‌های اصلاح مبلغ ناموفق بود.
        <Button type="button" variant="outline" onClick={() => void requestsQuery.refetch()}>
          تلاش دوباره
        </Button>
      </div>
    );
  }

  const requests = requestsQuery.data ?? [];
  return (
    <main className="mx-auto grid w-full max-w-5xl gap-4">
      <header>
        <h1 className="font-semibold text-2xl">اصلاح مبلغ در انتظار بررسی</h1>
        <p className="mt-1 text-muted-foreground text-sm">
          پس از تأیید پشتیبانی، پیشنهاد برای مشتری ارسال می‌شود؛ پرداخت فقط بعد از تأیید مشتری انجام خواهد شد.
        </p>
      </header>
      {requests.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground text-sm">
            درخواستی برای بررسی پشتیبانی وجود ندارد.
          </CardContent>
        </Card>
      ) : (
        requests.map((request) => {
          const busy = reviewMutation.isPending && reviewMutation.variables?.id === request.id;
          const note = notes[request.id] ?? "";
          const provider = request.serviceRequest.acceptedProviderProfile?.user;
          return (
            <Card key={request.id}>
              <CardHeader>
                <CardTitle className="text-lg">{request.serviceRequest.title}</CardTitle>
                <CardDescription>
                  ثبت‌شده در {dateFormatter.format(new Date(request.createdAt))}
                  {" · "}
                  کد درخواست: {request.serviceRequest.id}
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
                      {provider?.name ?? "—"}
                      {" · "}
                      {provider?.phone ?? "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground text-xs">مبلغ فعلی</dt>
                    <dd className="mt-1 font-medium">{formatMoney(request.previousTotalToman)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground text-xs">افزایش پیشنهادی / مبلغ نهایی</dt>
                    <dd className="mt-1 font-semibold text-primary">
                      +{formatMoney(request.amountToman)} / {formatMoney(request.newTotalToman)}
                    </dd>
                  </div>
                </dl>
                <div className="rounded-lg bg-muted/50 p-3 text-sm leading-7">
                  <p className="font-medium">دلیل متخصص</p>
                  <p className="mt-1 whitespace-pre-wrap text-muted-foreground">{request.reason}</p>
                  <ul className="mt-3 space-y-1 border-t pt-3">
                    {request.items.map((item) => (
                      <li
                        key={`${item.description}-${item.quantity}-${item.unitPriceToman}`}
                        className="flex justify-between gap-3"
                      >
                        <span>
                          {item.description} × {item.quantity}
                        </span>
                        <span className="shrink-0">{formatMoney(item.amountToman)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <label htmlFor={`support-note-${request.id}`} className="grid gap-1.5 text-sm">
                  توضیح پشتیبانی {note.trim().length < 5 ? "(برای رد الزامی است)" : ""}
                  <Textarea
                    id={`support-note-${request.id}`}
                    value={note}
                    maxLength={1000}
                    onChange={(event) => setNotes((current) => ({ ...current, [request.id]: event.target.value }))}
                    placeholder="در صورت رد، دلیل را حداقل در ۵ نویسه بنویسید."
                  />
                </label>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    disabled={busy}
                    onClick={() => reviewMutation.mutate({ id: request.id, decision: "APPROVE" })}
                  >
                    تأیید و ارسال برای مشتری
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={busy || note.trim().length < 5}
                    onClick={() => reviewMutation.mutate({ id: request.id, decision: "REJECT" })}
                  >
                    رد درخواست
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
