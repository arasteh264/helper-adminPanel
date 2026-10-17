"use client";

import { type ChangeEvent, type FormEvent, type ReactNode, useEffect, useMemo, useState } from "react";

import { FileSpreadsheet, LoaderCircle, RefreshCw, Search, Send, Upload } from "lucide-react";
import readXlsxFile from "read-excel-file/browser";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { normalizeIranianMobile, toAsciiDigits } from "@/lib/iranian-phone";
import {
  createProviderInvitation,
  createProviderInvitationBatch,
  getProviderInvitations,
  type ProviderInvitation,
  type ProviderInvitationBatchItem,
  type ProviderInvitationBatchResult,
  remindProviderInvitations,
} from "@/server/admin-provider-actions";

const dateFormatter = new Intl.DateTimeFormat("fa-IR", {
  calendar: "persian",
  dateStyle: "medium",
});
const pageSize = 50;

function formatDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : dateFormatter.format(date);
}

function getCellText(value: unknown) {
  return value === null || value === undefined ? "" : String(value).trim();
}

function normalizeHeader(value: unknown) {
  return getCellText(value)
    .toLocaleLowerCase("fa-IR")
    .replace(/[\s_\-\u200c]+/g, "");
}

function getColumnIndex(headers: unknown[], aliases: string[]) {
  return headers.findIndex((header) => aliases.includes(normalizeHeader(header)));
}

function invitationStatusLabel(invitation: ProviderInvitation) {
  if (invitation.status === "REGISTERED") {
    if (invitation.verificationStatus === "APPROVED") return "ثبت‌نام و تأییدشده";
    if (invitation.verificationStatus === "REJECTED") return "ثبت‌نام · ردشده";
    if (invitation.verificationStatus === "PENDING_REVIEW") return "ثبت‌نام · در انتظار بررسی";
    return "ثبت‌نام کرده";
  }
  if (new Date(invitation.expiresAt).getTime() < Date.now()) return "منقضی‌شده";
  return "دعوت‌شده";
}

export function ProviderInvitations() {
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [requestError, setRequestError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isPending, setIsPending] = useState(false);

  const [invitations, setInvitations] = useState<ProviderInvitation[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "INVITED" | "REGISTERED">("ALL");
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [reminding, setReminding] = useState(false);
  const [reminderResult, setReminderResult] = useState<ProviderInvitationBatchResult | null>(null);

  const [fileName, setFileName] = useState("");
  const [fileError, setFileError] = useState("");
  const [previewRows, setPreviewRows] = useState<ProviderInvitationBatchItem[]>([]);
  const [batchResult, setBatchResult] = useState<ProviderInvitationBatchResult | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isSendingBatch, setIsSendingBatch] = useState(false);
  const [reload, setReload] = useState(0);

  // biome-ignore lint/correctness/useExhaustiveDependencies: reload refreshes backend history after invite mutations.
  useEffect(() => {
    let active = true;
    setListLoading(true);
    setListError("");
    getProviderInvitations()
      .then((items) => {
        if (active) {
          setInvitations(items);
          setSelectedIds([]);
        }
      })
      .catch((reason: unknown) => {
        if (active) setListError(reason instanceof Error ? reason.message : "دریافت فهرست دعوت‌ها ناموفق بود.");
      })
      .finally(() => {
        if (active) setListLoading(false);
      });
    return () => {
      active = false;
    };
  }, [reload]);

  const filteredInvitations = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("fa-IR");
    return invitations.filter((invitation) => {
      if (statusFilter === "INVITED" && invitation.status !== "INVITED") return false;
      if (statusFilter === "REGISTERED" && invitation.status !== "REGISTERED") return false;
      if (!query) return true;
      return [invitation.phone, invitation.name, invitation.specialty]
        .filter(Boolean)
        .some((value) => value?.toLocaleLowerCase("fa-IR").includes(query));
    });
  }, [invitations, search, statusFilter]);

  const pageCount = Math.max(1, Math.ceil(filteredInvitations.length / pageSize));
  const visibleInvitations = filteredInvitations.slice((page - 1) * pageSize, page * pageSize);
  const visibleRemindableIds = visibleInvitations.filter((item) => item.canRemind).map((item) => item.id);

  function refreshInvitations() {
    setReload((value) => value + 1);
  }

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
      setSuccessMessage(`${result.message} · اعتبار تا ${formatDate(result.expiresAt)}`);
      setPhone("");
      await refreshInvitations();
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : "ارسال دعوت‌نامه ناموفق بود.");
    } finally {
      setIsPending(false);
    }
  }

  async function parseSpreadsheet(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setFileError("");
    setBatchResult(null);
    setPreviewRows([]);

    if (!/\.xlsx$/i.test(file.name)) {
      setFileError("فقط فایل اکسل با پسوند ‎.xlsx پشتیبانی می‌شود.");
      event.target.value = "";
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setFileError("حجم فایل اکسل نباید بیشتر از ۱۰ مگابایت باشد.");
      event.target.value = "";
      return;
    }

    setIsParsing(true);
    try {
      const sheets = await readXlsxFile(file);
      const rows = sheets[0]?.data;
      if (!rows) throw new Error("فایل اکسل هیچ برگی برای خواندن ندارد.");
      const headerIndex = rows.findIndex((row) =>
        row.some((cell) => ["phone", "mobile", "شماره", "موبایل", "تلفن"].includes(normalizeHeader(cell))),
      );
      if (headerIndex < 0) {
        throw new Error("ستون شماره موبایل پیدا نشد. سرستون را «شماره موبایل» یا phone بگذارید.");
      }

      const headers = rows[headerIndex];
      const phoneColumn = getColumnIndex(headers, [
        "phone",
        "mobile",
        "شماره",
        "شمارهتلفن",
        "شمارهتماس",
        "موبایل",
        "تلفن",
      ]);
      if (phoneColumn < 0) throw new Error("ستون شماره موبایل پیدا نشد.");
      const nameColumn = getColumnIndex(headers, ["name", "fullname", "نام", "ناممتخصص", "نامونامخانوادگی"]);
      const specialtyColumn = getColumnIndex(headers, ["specialty", "profession", "service", "تخصص", "حرفه", "خدمت"]);

      const imported: ProviderInvitationBatchItem[] = rows
        .slice(headerIndex + 1)
        .filter((row) => row.some((cell) => getCellText(cell)))
        .map((row) => {
          const phoneCell = row[phoneColumn];
          const cellText = toAsciiDigits(getCellText(phoneCell));
          const rawPhone = typeof phoneCell === "number" && /^9\d{9}$/.test(cellText) ? `0${cellText}` : cellText;
          const normalizedPhone = normalizeIranianMobile(rawPhone);
          const name = nameColumn >= 0 ? getCellText(row[nameColumn]) : "";
          const specialty = specialtyColumn >= 0 ? getCellText(row[specialtyColumn]) : "";
          return {
            phone: normalizedPhone ?? (rawPhone || "شماره وارد نشده"),
            ...(name ? { name } : {}),
            ...(specialty ? { specialty } : {}),
          };
        });

      if (!imported.length) throw new Error("هیچ ردیف دعوتی در فایل پیدا نشد.");
      if (imported.length > 100)
        throw new Error(`فایل ${imported.length.toLocaleString("fa-IR")} ردیف دارد؛ سقف هر نوبت ۱۰۰ دعوت است.`);
      setPreviewRows(imported);
    } catch (reason) {
      setFileError(reason instanceof Error ? reason.message : "خواندن فایل اکسل ناموفق بود.");
    } finally {
      setIsParsing(false);
      event.target.value = "";
    }
  }

  async function submitBatch() {
    setIsSendingBatch(true);
    setFileError("");
    setBatchResult(null);
    try {
      const result = await createProviderInvitationBatch(previewRows);
      setBatchResult(result);
      setPreviewRows([]);
      setFileName("");
      await refreshInvitations();
    } catch (reason) {
      setFileError(reason instanceof Error ? reason.message : "ارسال گروهی دعوت‌ها ناموفق بود.");
    } finally {
      setIsSendingBatch(false);
    }
  }

  async function sendReminders() {
    if (!selectedIds.length) return;
    setReminding(true);
    setListError("");
    setReminderResult(null);
    try {
      setReminderResult(await remindProviderInvitations(selectedIds));
      await refreshInvitations();
    } catch (reason) {
      setListError(reason instanceof Error ? reason.message : "ارسال یادآوری ناموفق بود.");
    } finally {
      setReminding(false);
    }
  }

  function toggleSelected(id: string, checked: boolean) {
    setSelectedIds((current) => (checked ? [...new Set([...current, id])] : current.filter((value) => value !== id)));
  }

  const allVisibleSelected =
    visibleRemindableIds.length > 0 && visibleRemindableIds.every((id) => selectedIds.includes(id));
  let invitationList: ReactNode;
  if (listLoading) {
    invitationList = (
      <p className="flex items-center justify-center gap-2 py-10 text-muted-foreground" role="status">
        <LoaderCircle className="animate-spin" aria-hidden="true" />
        در حال دریافت دعوت‌ها...
      </p>
    );
  } else if (visibleInvitations.length) {
    invitationList = (
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b text-right text-muted-foreground">
              <th className="w-10 px-2 py-3">
                <Checkbox
                  aria-label="انتخاب دعوت‌های قابل یادآوری این صفحه"
                  checked={allVisibleSelected}
                  onCheckedChange={(checked) => {
                    if (checked === true) {
                      setSelectedIds((current) => [...new Set([...current, ...visibleRemindableIds])].slice(0, 100));
                    } else {
                      setSelectedIds((current) => current.filter((id) => !visibleRemindableIds.includes(id)));
                    }
                  }}
                />
              </th>
              <th className="px-2 py-3">متخصص</th>
              <th className="px-2 py-3">شماره موبایل</th>
              <th className="px-2 py-3">وضعیت</th>
              <th className="px-2 py-3">تاریخ دعوت</th>
              <th className="px-2 py-3">اعتبار تا</th>
            </tr>
          </thead>
          <tbody>
            {visibleInvitations.map((invitation) => (
              <tr key={invitation.id} className="border-b last:border-0">
                <td className="px-2 py-3">
                  {invitation.canRemind ? (
                    <Checkbox
                      aria-label={`انتخاب دعوت ${invitation.phone}`}
                      checked={selectedIds.includes(invitation.id)}
                      disabled={!selectedIds.includes(invitation.id) && selectedIds.length >= 100}
                      onCheckedChange={(checked) => toggleSelected(invitation.id, checked === true)}
                    />
                  ) : null}
                </td>
                <td className="px-2 py-3">
                  <div className="grid gap-1">
                    <span>{invitation.name || "نامشخص"}</span>
                    {invitation.specialty ? (
                      <span className="text-muted-foreground text-xs">{invitation.specialty}</span>
                    ) : null}
                  </div>
                </td>
                <td className="px-2 py-3" dir="ltr">
                  {invitation.phone}
                </td>
                <td className="px-2 py-3">
                  <Badge variant={invitation.status === "REGISTERED" ? "secondary" : "outline"}>
                    {invitationStatusLabel(invitation)}
                  </Badge>
                </td>
                <td className="px-2 py-3">{formatDate(invitation.invitedAt)}</td>
                <td className="px-2 py-3">{formatDate(invitation.expiresAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  } else {
    invitationList = (
      <p className="py-10 text-center text-muted-foreground">
        {listError ? "به‌دلیل خطا فهرست دعوت‌ها در دسترس نیست." : "دعوتی با این مشخصات پیدا نشد."}
      </p>
    );
  }

  return (
    <main className="mx-auto grid w-full max-w-6xl gap-5">
      <header className="grid gap-1">
        <h1 className="font-semibold text-2xl">دعوت متخصصان و فهرست دعوت‌ها</h1>
        <p className="text-muted-foreground text-sm">
          دعوت تک‌نفره یا ارسال گروهی از فایل اکسل، مشاهده وضعیت ثبت‌نام و یادآوری دعوت‌های باز.
        </p>
      </header>

      <section className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>دعوت با پیامک</CardTitle>
            <CardDescription>لینک ثبت‌نام مستقیم برای شماره واردشده پیامک می‌شود و ۷ روز اعتبار دارد.</CardDescription>
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

        <Card>
          <CardHeader>
            <CardTitle>دعوت گروهی با فایل اکسل</CardTitle>
            <CardDescription>
              فایل ‎.xlsx با ستون‌های شماره موبایل، نام و تخصص؛ نام و تخصص اختیاری هستند. هر بار حداکثر ۱۰۰ ردیف.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <label className="grid cursor-pointer gap-2 rounded-xl border border-dashed p-5 text-center transition-colors hover:bg-muted/50">
              <FileSpreadsheet className="mx-auto size-7 text-primary" aria-hidden="true" />
              <span className="font-medium">{fileName || "انتخاب فایل اکسل"}</span>
              <span className="text-muted-foreground text-xs">قالب: ‎.xlsx · حداکثر حجم فایل: ۱۰ مگابایت</span>
              <input
                type="file"
                accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                className="sr-only"
                disabled={isParsing || isSendingBatch}
                onChange={(event) => void parseSpreadsheet(event)}
              />
            </label>

            {isParsing ? (
              <p className="flex items-center justify-center gap-2 text-muted-foreground text-sm" role="status">
                <LoaderCircle className="animate-spin" aria-hidden="true" />
                در حال خواندن فایل...
              </p>
            ) : null}
            {previewRows.length ? (
              <div className="grid gap-3 rounded-lg border p-3">
                <p className="text-sm">
                  {previewRows.length.toLocaleString("fa-IR")} دعوت آماده ارسال است. شماره‌های نامعتبر یا تکراری در
                  نتیجه‌ی هر ردیف مشخص می‌شوند.
                </p>
                <Button disabled={isSendingBatch} onClick={() => void submitBatch()}>
                  {isSendingBatch ? (
                    <LoaderCircle className="animate-spin" aria-hidden="true" />
                  ) : (
                    <Upload aria-hidden="true" />
                  )}
                  {isSendingBatch ? "در حال ارسال پیامک‌ها..." : "ارسال دعوت‌ها"}
                </Button>
              </div>
            ) : null}
            {fileError ? (
              <p
                className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-destructive text-sm"
                role="alert"
              >
                {fileError}
              </p>
            ) : null}
            {batchResult ? (
              <div className="grid gap-2 rounded-lg border p-3" role="status">
                <p className="font-medium">
                  ارسال‌شده: {batchResult.sent.toLocaleString("fa-IR")} · ناموفق:{" "}
                  {batchResult.failed.toLocaleString("fa-IR")}
                </p>
                {batchResult.items.some((item) => !item.success) ? (
                  <p className="max-h-40 overflow-y-auto whitespace-pre-wrap text-xs">
                    {batchResult.items
                      .filter((item) => !item.success)
                      .map((item) => `${item.phone || "بدون شماره"}: ${item.message}`)
                      .join("\n")}
                  </p>
                ) : null}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader className="gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <CardTitle>فهرست دعوت‌ها</CardTitle>
            <CardDescription>
              آخرین دعوت هر شماره، وضعیت ثبت‌نام و انقضای دعوت از سرویس بک‌اند دریافت می‌شود.
              {` ${invitations.length.toLocaleString("fa-IR")} مورد`}
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="provider-invitation-search" className="relative">
              <Search
                className="absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                id="provider-invitation-search"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="جست‌وجو"
                aria-label="جست‌وجوی دعوت‌ها"
                className="pr-9"
              />
            </label>
            <select
              aria-label="وضعیت دعوت"
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value as typeof statusFilter);
                setPage(1);
              }}
              className="h-9 rounded-lg border border-input bg-background px-3 text-sm"
            >
              <option value="ALL">همه وضعیت‌ها</option>
              <option value="INVITED">دعوت‌شده</option>
              <option value="REGISTERED">ثبت‌نام‌کرده</option>
            </select>
            <Button
              variant="outline"
              size="icon"
              aria-label="تازه‌سازی فهرست"
              disabled={listLoading}
              onClick={() => void refreshInvitations()}
            >
              {listLoading ? (
                <LoaderCircle className="animate-spin" aria-hidden="true" />
              ) : (
                <RefreshCw aria-hidden="true" />
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4">
          {listError ? (
            <div
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-destructive text-sm"
              role="alert"
            >
              <span>{listError}</span>
              <Button variant="outline" size="sm" onClick={() => void refreshInvitations()}>
                تلاش دوباره
              </Button>
            </div>
          ) : null}
          {reminderResult ? (
            <p className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-sm" role="status">
              یادآوری ارسال‌شده: {reminderResult.sent.toLocaleString("fa-IR")} · ناموفق:{" "}
              {reminderResult.failed.toLocaleString("fa-IR")}
            </p>
          ) : null}
          {selectedIds.length ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-muted/50 p-3">
              <span className="text-sm">{selectedIds.length.toLocaleString("fa-IR")} دعوت انتخاب شده</span>
              <Button size="sm" disabled={reminding} onClick={() => void sendReminders()}>
                {reminding ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <Send aria-hidden="true" />}
                {reminding ? "در حال ارسال..." : "ارسال یادآوری"}
              </Button>
            </div>
          ) : null}
          {invitationList}
          {!listLoading && filteredInvitations.length ? (
            <footer className="flex items-center justify-between gap-3 border-t pt-3">
              <span className="text-muted-foreground text-sm">
                صفحه {page.toLocaleString("fa-IR")} از {pageCount.toLocaleString("fa-IR")}
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>
                  قبلی
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= pageCount}
                  onClick={() => setPage((value) => value + 1)}
                >
                  بعدی
                </Button>
              </div>
            </footer>
          ) : null}
        </CardContent>
      </Card>
    </main>
  );
}
