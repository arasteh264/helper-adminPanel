"use client";

import { type FormEvent, type ReactNode, useCallback, useEffect, useMemo, useState } from "react";

import Link from "next/link";

import { Check, FileSpreadsheet, LoaderCircle, RefreshCw, Search, Send, Upload } from "lucide-react";
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
  type ProviderInvitationInput,
  type ProviderInvitationListItem,
  remindProviderInvitations,
} from "@/server/admin-provider-actions";

type PreviewRow = ProviderInvitationInput & {
  rowNumber: number;
  error?: string;
};

type StatusFilter = "ALL" | "INVITED" | "REGISTERED";

const dateFormatter = new Intl.DateTimeFormat("fa-IR", {
  calendar: "persian",
  dateStyle: "medium",
  timeStyle: "short",
});

const normalizeHeader = (value: unknown) =>
  String(value ?? "")
    .trim()
    .toLocaleLowerCase("fa-IR")
    .replace(/[\s_\-\u200c]+/g, "");

const HEADER_ALIASES = {
  phone: ["phone", "mobile", "mobilenumber", "شماره", "موبایل", "شمارهتلفن", "شمارهتماس"],
  name: ["name", "fullname", "نام", "نامونامخانوادگی", "ناممتخصص"],
  specialty: ["specialty", "speciality", "skill", "تخصص", "رشته", "مهارت"],
} as const;

function formatDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : dateFormatter.format(date);
}

function getCell(row: unknown[], index: number) {
  return String(row[index] ?? "").trim();
}

function parseInvitationSheet(
  rows: unknown[][],
  existingInvitations: ProviderInvitationListItem[],
): {
  preview: PreviewRow[];
  error: string;
} {
  if (rows.length < 2) {
    return { preview: [], error: "فایل باید یک ردیف عنوان و حداقل یک مخاطب داشته باشد." };
  }

  const headers = rows[0].map(normalizeHeader);
  const findColumn = (key: keyof typeof HEADER_ALIASES) =>
    headers.findIndex((header) => (HEADER_ALIASES[key] as readonly string[]).includes(header));
  const phoneIndex = findColumn("phone");
  const nameIndex = findColumn("name");
  const specialtyIndex = findColumn("specialty");

  if (phoneIndex < 0 || nameIndex < 0 || specialtyIndex < 0) {
    return {
      preview: [],
      error: "ستون‌های فایل باید شماره موبایل، نام و تخصص را داشته باشند.",
    };
  }

  const dataRows = rows
    .map((row, index) => ({ row, rowNumber: index + 1 }))
    .slice(1)
    .filter(({ row }) => row.some((cell) => String(cell ?? "").trim()));
  if (dataRows.length > 100) {
    return {
      preview: [],
      error: "در هر نوبت حداکثر ۱۰۰ دعوت‌نامه ارسال کنید؛ فایل را به چند بخش تقسیم کنید.",
    };
  }

  const seenPhones = new Set<string>();
  const existingByPhone = new Map(existingInvitations.map((invitation) => [invitation.phone, invitation]));
  const preview = dataRows.map(({ row, rowNumber }) => {
    const rawPhone = getCell(row, phoneIndex);
    const phone = normalizeIranianMobile(rawPhone);
    const name = getCell(row, nameIndex);
    const specialty = getCell(row, specialtyIndex);
    let error: string | undefined;

    if (!phone) error = "شماره موبایل معتبر نیست.";
    else if (seenPhones.has(phone)) error = "شماره در فایل تکراری است.";
    else if (existingByPhone.get(phone)?.status === "REGISTERED") {
      error = "این شماره قبلاً ثبت‌نام کرده است.";
    } else if (existingByPhone.has(phone)) {
      error = "برای این شماره قبلاً دعوت‌نامه ثبت شده است.";
    } else if (!name) error = "نام متخصص وارد نشده است.";
    else if (!specialty) error = "تخصص وارد نشده است.";

    if (phone) seenPhones.add(phone);
    return {
      phone: phone ?? rawPhone,
      name,
      specialty,
      rowNumber,
      error,
    };
  });

  return { preview, error: "" };
}

export function ProviderInvitations({ view }: { view: "create" | "list" }) {
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [requestError, setRequestError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [invitations, setInvitations] = useState<ProviderInvitationListItem[]>([]);
  const [listError, setListError] = useState("");
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [isPending, setIsPending] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [preview, setPreview] = useState<PreviewRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [fileError, setFileError] = useState("");
  const [batchResult, setBatchResult] = useState("");
  const [isCheckingFile, setIsCheckingFile] = useState(false);

  const refreshInvitations = useCallback(async () => {
    setListError("");
    try {
      setInvitations(await getProviderInvitations());
    } catch (error) {
      setListError(error instanceof Error ? error.message : "دریافت فهرست دعوت‌ها ناموفق بود.");
    } finally {
      setIsLoadingList(false);
    }
  }, []);

  useEffect(() => {
    void refreshInvitations();
  }, [refreshInvitations]);

  const filteredInvitations = useMemo(() => {
    const normalizedSearch = toAsciiDigits(search).trim().toLocaleLowerCase();
    return invitations.filter((invitation) => {
      const matchesStatus = statusFilter === "ALL" || invitation.status === statusFilter;
      const searchable = [invitation.phone, invitation.name ?? "", invitation.specialty ?? ""]
        .join(" ")
        .toLocaleLowerCase();
      return matchesStatus && (!normalizedSearch || searchable.includes(normalizedSearch));
    });
  }, [invitations, search, statusFilter]);

  const pendingInvitations = filteredInvitations.filter((invitation) => invitation.canRemind).slice(0, 100);
  const validPreview = preview.filter((row) => !row.error);
  let invitationListContent: ReactNode;
  if (isLoadingList) {
    invitationListContent = (
      <p className="flex items-center gap-2 py-8 text-muted-foreground text-sm">
        <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
        در حال دریافت فهرست…
      </p>
    );
  } else if (filteredInvitations.length === 0) {
    invitationListContent = (
      <p className="py-8 text-center text-muted-foreground text-sm">دعوتی برای نمایش وجود ندارد.</p>
    );
  } else {
    invitationListContent = (
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[850px] text-right text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="w-10 p-3">
                <Checkbox
                  checked={
                    pendingInvitations.length > 0 && pendingInvitations.every(({ id }) => selectedIds.includes(id))
                  }
                  onCheckedChange={toggleAllPending}
                  aria-label="انتخاب دعوت‌های ثبت‌نام‌نشده (حداکثر ۱۰۰ مورد)"
                />
              </th>
              <th className="p-3">نام متخصص</th>
              <th className="p-3">موبایل</th>
              <th className="p-3">تخصص</th>
              <th className="p-3">وضعیت</th>
              <th className="p-3">دعوت‌شده در</th>
              <th className="p-3">ثبت‌نام در</th>
              <th className="p-3">عملیات</th>
            </tr>
          </thead>
          <tbody>
            {filteredInvitations.map((invitation) => (
              <tr key={invitation.id} className="border-t">
                <td className="p-3">
                  {invitation.canRemind ? (
                    <Checkbox
                      checked={selectedIds.includes(invitation.id)}
                      onCheckedChange={(checked) => toggleSelection(invitation.id, checked)}
                      aria-label={`انتخاب ${invitation.phone}`}
                    />
                  ) : null}
                </td>
                <td className="p-3">{invitation.name || "—"}</td>
                <td className="p-3" dir="ltr">
                  {invitation.phone}
                </td>
                <td className="p-3">{invitation.specialty || "—"}</td>
                <td className="p-3">
                  <Badge variant={invitation.status === "REGISTERED" ? "default" : "secondary"}>
                    {invitation.status === "REGISTERED" ? "ثبت‌نام کرده" : "ثبت‌نام نکرده"}
                  </Badge>
                  {invitation.verificationStatus ? (
                    <p className="mt-1 text-muted-foreground text-xs">بررسی: {invitation.verificationStatus}</p>
                  ) : null}
                </td>
                <td className="p-3">{formatDate(invitation.smsSentAt ?? invitation.invitedAt)}</td>
                <td className="p-3">{formatDate(invitation.registeredAt)}</td>
                <td className="p-3">
                  {invitation.canRemind ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={isPending}
                      onClick={() => void sendReminders([invitation.id])}
                    >
                      <Send aria-hidden="true" />
                      یادآوری
                    </Button>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  async function submitInvitation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setRequestError("");
    setSuccessMessage("");

    const normalizedPhone = normalizeIranianMobile(phone);
    if (!normalizedPhone) {
      setRequestError("شماره موبایل معتبر وارد کنید؛ مانند ۰۹۱۲۳۴۵۶۷۸۹.");
      return;
    }
    if (!name.trim() || !specialty.trim()) {
      setRequestError("نام و تخصص متخصص را وارد کنید.");
      return;
    }

    setIsPending(true);
    try {
      const result = await createProviderInvitation({
        phone: normalizedPhone,
        name: name.trim(),
        specialty: specialty.trim(),
      });
      if (!result.ok) {
        setRequestError(result.message);
        return;
      }

      setSuccessMessage(result.message);
      setPhone("");
      setName("");
      setSpecialty("");
      await refreshInvitations();
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : "ارسال دعوت‌نامه ناموفق بود.");
    } finally {
      setIsPending(false);
    }
  }

  async function loadSpreadsheet(file?: File) {
    setFileError("");
    setBatchResult("");
    setPreview([]);
    setFileName("");
    if (!file) return;
    if (!file.name.toLocaleLowerCase().endsWith(".xlsx")) {
      setFileError("فقط فایل Excel با پسوند .xlsx پشتیبانی می‌شود.");
      return;
    }

    setIsCheckingFile(true);
    try {
      const [sheet] = await readXlsxFile(file);
      const latestInvitations = await getProviderInvitations();
      setInvitations(latestInvitations);
      const result = parseInvitationSheet(sheet?.data ?? [], latestInvitations);
      setFileName(file.name);
      setPreview(result.preview);
      setFileError(result.error);
    } catch (error) {
      setFileError(error instanceof Error ? `بررسی فایل ممکن نشد: ${error.message}` : "خواندن یا بررسی فایل ممکن نشد.");
    } finally {
      setIsCheckingFile(false);
    }
  }

  async function sendBatchInvitations() {
    setIsPending(true);
    setFileError("");
    setBatchResult("");
    try {
      const result = await createProviderInvitationBatch(
        validPreview.map(({ phone, name, specialty }) => ({
          phone,
          name,
          specialty,
        })),
      );
      setBatchResult(`${result.sent} دعوت‌نامه ارسال شد و ${result.failed} مورد ناموفق بود.`);
      setPreview((current) =>
        current.map((row) => {
          const outcome = result.items.find((item) => normalizeIranianMobile(item.phone) === row.phone);
          return outcome && !outcome.success ? { ...row, error: outcome.message } : row;
        }),
      );
      await refreshInvitations();
    } catch (error) {
      setFileError(error instanceof Error ? error.message : "ارسال گروهی دعوت‌نامه ناموفق بود.");
    } finally {
      setIsPending(false);
    }
  }

  async function sendReminders(ids: string[]) {
    if (!ids.length) return;
    setIsPending(true);
    setRequestError("");
    setSuccessMessage("");
    try {
      const result = await remindProviderInvitations(ids);
      setSuccessMessage(`${result.sent} یادآوری ارسال شد و ${result.failed} مورد ناموفق بود.`);
      setSelectedIds([]);
      await refreshInvitations();
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : "ارسال یادآوری ناموفق بود.");
    } finally {
      setIsPending(false);
    }
  }

  function toggleSelection(id: string, checked: boolean | "indeterminate") {
    setSelectedIds((current) => {
      if (checked !== true) {
        return current.filter((selectedId) => selectedId !== id);
      }
      if (current.includes(id) || current.length >= 100) {
        return current;
      }
      return [...current, id];
    });
  }

  function toggleAllPending(checked: boolean | "indeterminate") {
    setSelectedIds(checked === true ? pendingInvitations.map(({ id }) => id) : []);
  }

  return (
    <main className="mx-auto grid w-full max-w-6xl gap-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid gap-1">
          <h1 className="font-semibold text-2xl">{view === "create" ? "دعوت متخصص" : "فهرست دعوت‌شدگان"}</h1>
          <p className="text-muted-foreground text-sm">
            {view === "create"
              ? "ارسال دعوت تکی یا گروهی با فایل Excel."
              : "مشاهده وضعیت ثبت‌نام متخصصان دعوت‌شده و ارسال یادآوری."}
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href={view === "create" ? "/dashboard/providers/invitations/list" : "/dashboard/providers/invitations"}>
            {view === "create" ? "مشاهده فهرست دعوت‌ها" : "دعوت متخصص جدید"}
          </Link>
        </Button>
      </header>

      {view === "create" ? (
        <div className="grid gap-5 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>دعوت تکی</CardTitle>
              <CardDescription>نام، شماره و تخصص در پیامک دعوت درج می‌شود.</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="grid gap-4" onSubmit={submitInvitation} noValidate>
                <div className="grid gap-2">
                  <Label htmlFor="provider-invitation-name">نام متخصص</Label>
                  <Input
                    id="provider-invitation-name"
                    value={name}
                    maxLength={120}
                    disabled={isPending}
                    onChange={(event) => setName(event.target.value)}
                    required
                  />
                </div>
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
                    disabled={isPending}
                    onChange={(event) => {
                      setPhone(toAsciiDigits(event.target.value));
                      setRequestError("");
                    }}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="provider-invitation-specialty">تخصص</Label>
                  <Input
                    id="provider-invitation-specialty"
                    value={specialty}
                    maxLength={120}
                    placeholder="مثلاً تعمیر پکیج"
                    disabled={isPending}
                    onChange={(event) => setSpecialty(event.target.value)}
                    required
                  />
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
                  {isPending ? (
                    <LoaderCircle className="animate-spin" aria-hidden="true" />
                  ) : (
                    <Send aria-hidden="true" />
                  )}
                  ارسال دعوت‌نامه
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="size-5" aria-hidden="true" />
                دعوت گروهی با Excel
              </CardTitle>
              <CardDescription>
                فایل باید ستون‌های شماره موبایل، نام و تخصص داشته باشد؛ حداکثر ۱۰۰ ردیف در هر نوبت. فایل پیش از ارسال
                بررسی می‌شود.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="provider-invitation-spreadsheet">فایل Excel (.xlsx)</Label>
                <Input
                  id="provider-invitation-spreadsheet"
                  type="file"
                  accept=".xlsx"
                  disabled={isPending || isCheckingFile}
                  onChange={(event) => void loadSpreadsheet(event.target.files?.[0])}
                />
                {isCheckingFile ? (
                  <p className="flex items-center gap-2 text-muted-foreground text-xs" role="status">
                    <LoaderCircle className="size-3 animate-spin" aria-hidden="true" />
                    در حال بررسی فایل و دعوت‌های قبلی…
                  </p>
                ) : null}
                <p className="text-muted-foreground text-xs">
                  نام‌های قابل قبول ستون‌ها: phone/mobile یا شماره موبایل، name یا نام، specialty یا تخصص.
                </p>
              </div>
              {fileName ? (
                <p className="text-muted-foreground text-sm" dir="ltr">
                  {fileName}
                </p>
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
                <p className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-sm" role="status">
                  {batchResult}
                </p>
              ) : null}
              {preview.length ? (
                <>
                  <p className="text-sm">
                    {validPreview.length} ردیف آماده ارسال از {preview.length} ردیف؛ موارد خطادار ارسال نمی‌شوند.
                  </p>
                  <div className="max-h-60 overflow-auto rounded-lg border">
                    <table className="w-full text-right text-sm">
                      <thead className="sticky top-0 bg-muted">
                        <tr>
                          <th className="p-2">ردیف</th>
                          <th className="p-2">نام</th>
                          <th className="p-2">موبایل</th>
                          <th className="p-2">تخصص</th>
                          <th className="p-2">وضعیت</th>
                        </tr>
                      </thead>
                      <tbody>
                        {preview.map((row) => (
                          <tr key={row.rowNumber} className="border-t">
                            <td className="p-2">{row.rowNumber}</td>
                            <td className="p-2">{row.name || "—"}</td>
                            <td className="p-2" dir="ltr">
                              {row.phone}
                            </td>
                            <td className="p-2">{row.specialty || "—"}</td>
                            <td className="p-2">
                              {row.error ? (
                                <span className="text-destructive text-xs">{row.error}</span>
                              ) : (
                                <Check className="size-4 text-primary" aria-label="آماده ارسال" />
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <Button
                    type="button"
                    className="w-full sm:w-fit"
                    disabled={isPending || isCheckingFile || validPreview.length === 0}
                    onClick={() => void sendBatchInvitations()}
                  >
                    {isPending ? (
                      <LoaderCircle className="animate-spin" aria-hidden="true" />
                    ) : (
                      <Upload aria-hidden="true" />
                    )}
                    ارسال {validPreview.length} دعوت‌نامه معتبر
                  </Button>
                </>
              ) : null}
            </CardContent>
          </Card>
        </div>
      ) : null}

      {view === "list" ? (
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle>فهرست دعوت‌شدگان</CardTitle>
                <CardDescription>فهرست ماندگار دعوت‌ها و وضعیت ثبت‌نام متخصصان.</CardDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                disabled={isLoadingList || isPending}
                onClick={() => void refreshInvitations()}
              >
                <RefreshCw className={isLoadingList ? "animate-spin" : ""} aria-hidden="true" />
                تازه‌سازی
              </Button>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="flex flex-wrap items-end gap-3">
              <div className="grid min-w-56 flex-1 gap-2">
                <Label htmlFor="invitation-search">جست‌وجو</Label>
                <div className="relative">
                  <Search
                    className="absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <Input
                    id="invitation-search"
                    className="pr-9"
                    placeholder="نام، شماره یا تخصص"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="invitation-status-filter">وضعیت ثبت‌نام</Label>
                <select
                  id="invitation-status-filter"
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
                >
                  <option value="ALL">همه</option>
                  <option value="INVITED">ثبت‌نام نکرده</option>
                  <option value="REGISTERED">ثبت‌نام کرده</option>
                </select>
              </div>
              <Button
                type="button"
                variant="outline"
                disabled={isPending || selectedIds.length === 0}
                onClick={() => void sendReminders(selectedIds)}
              >
                {isPending ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <Send aria-hidden="true" />}
                یادآوری به {selectedIds.length} نفر
              </Button>
            </div>

            {listError ? (
              <p
                className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-destructive text-sm"
                role="alert"
              >
                {listError}
              </p>
            ) : null}

            {invitationListContent}
          </CardContent>
        </Card>
      ) : null}
    </main>
  );
}
