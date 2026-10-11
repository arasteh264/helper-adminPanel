"use client";

import { type FormEvent, useState } from "react";

import { Check, LoaderCircle, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { normalizeIranianMobile, toAsciiDigits } from "@/lib/iranian-phone";
import { createProviderInvitation } from "@/server/admin-provider-actions";

type RecentInvitation = {
  id: string;
  phone: string;
  message: string;
  expiresAt: string;
};

const dateFormatter = new Intl.DateTimeFormat("fa-IR", {
  calendar: "persian",
  dateStyle: "medium",
});

function formatExpiryDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : dateFormatter.format(date);
}

export function ProviderInvitations() {
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [requestError, setRequestError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [recentInvitations, setRecentInvitations] = useState<RecentInvitation[]>([]);
  const [isPending, setIsPending] = useState(false);

  async function submitInvitation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPhoneError("");
    setRequestError("");
    setSuccessMessage("");

    const normalizedPhone = normalizeIranianMobile(phone);
    if (!normalizedPhone) {
      setPhoneError("شماره موبایل معتبر وارد کنید؛ مانند ۰۹۱۲۳۴۵۶۷۸۹.");
      return;
    }

    setPhone(normalizedPhone);
    setIsPending(true);
    try {
      const result = await createProviderInvitation(normalizedPhone);
      if (!result.ok) {
        setRequestError(result.message);
        return;
      }

      setRecentInvitations((current) =>
        [
          { id: crypto.randomUUID(), phone: normalizedPhone, message: result.message, expiresAt: result.expiresAt },
          ...current,
        ].slice(0, 5),
      );
      setSuccessMessage(result.message);
      setPhone("");
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : "ارسال دعوت‌نامه ناموفق بود.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <main className="mx-auto grid w-full max-w-4xl gap-5">
      <header className="grid gap-1">
        <h1 className="font-semibold text-2xl">دعوت متخصص با پیامک</h1>
        <p className="text-muted-foreground text-sm">
          شماره موبایل متخصص را وارد کنید تا لینک ثبت‌نام برای او پیامک شود.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>ارسال دعوت‌نامه</CardTitle>
          <CardDescription>پیامک مستقیماً برای متخصص ارسال می‌شود و لینک دعوت تا ۷ روز اعتبار دارد.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4" onSubmit={submitInvitation} noValidate>
            <div className="grid gap-2">
              <Label htmlFor="provider-invitation-phone">شماره موبایل</Label>
              <Input
                id="provider-invitation-phone"
                type="tel"
                inputMode="tel"
                dir="ltr"
                autoComplete="tel"
                placeholder="۰۹۱۲۳۴۵۶۷۸۹"
                value={phone}
                aria-invalid={Boolean(phoneError)}
                aria-describedby={phoneError ? "provider-invitation-phone-error" : "provider-invitation-phone-hint"}
                disabled={isPending}
                onChange={(event) => {
                  setPhone(toAsciiDigits(event.target.value));
                  setPhoneError("");
                  setRequestError("");
                }}
                onBlur={() => {
                  const normalizedPhone = normalizeIranianMobile(phone);
                  if (normalizedPhone) setPhone(normalizedPhone);
                }}
              />
              {phoneError ? (
                <p id="provider-invitation-phone-error" className="text-destructive text-xs" role="alert">
                  {phoneError}
                </p>
              ) : (
                <p id="provider-invitation-phone-hint" className="text-muted-foreground text-xs">
                  شماره‌های ایران مانند ۰۹۱۲۳۴۵۶۷۸۹ یا ‎+۹۸۹۱۲۳۴۵۶۷۸۹ پذیرفته می‌شوند.
                </p>
              )}
            </div>

            {requestError ? (
              <p
                className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-destructive text-sm"
                role="alert"
              >
                {requestError}
              </p>
            ) : null}

            {successMessage ? (
              <p className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-sm" role="status">
                {successMessage}
              </p>
            ) : null}

            <Button type="submit" className="w-full sm:w-fit" disabled={isPending}>
              {isPending ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <Send aria-hidden="true" />}
              {isPending ? "در حال ارسال..." : "ارسال دعوت‌نامه"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {recentInvitations.length ? (
        <Card>
          <CardHeader>
            <CardTitle>دعوت‌های ارسال‌شده در این نشست</CardTitle>
            <CardDescription>این فهرست فقط دعوت‌های ارسال‌شده از زمان باز کردن این صفحه را نگه می‌دارد.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-3">
              {recentInvitations.map((invitation) => (
                <li
                  key={invitation.id}
                  className="flex flex-wrap items-start justify-between gap-3 rounded-lg border p-3"
                >
                  <div className="flex min-w-0 items-start gap-2">
                    <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                    <div className="grid gap-1">
                      <p className="font-medium" dir="ltr">
                        {invitation.phone}
                      </p>
                      <p className="text-muted-foreground text-xs">{invitation.message}</p>
                    </div>
                  </div>
                  <p className="text-muted-foreground text-xs">اعتبار تا {formatExpiryDate(invitation.expiresAt)}</p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}
    </main>
  );
}
