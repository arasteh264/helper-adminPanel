"use client";

import { type FormEvent, type ReactNode, useEffect, useState } from "react";

import Link from "next/link";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, BriefcaseBusiness, MapPin, Pencil, Save, ShieldCheck, UserRound, X } from "lucide-react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

import { AccountStatusAction } from "@/app/(main)/dashboard/_components/account-status-action";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { adminApiFetch } from "@/lib/admin-api";
import { formatGroupedInteger, normalizeIntegerInput } from "@/lib/number-format";

type ProviderDetails = {
  id: string;
  bio: string | null;
  rating?: number | null;
  isVerified: boolean;
  verificationStatus: "PENDING" | "APPROVED" | "REJECTED";
  verificationNote: string | null;
  verifiedAt: string | null;
  isAvailable: boolean;
  avatarUrl: string | null;
  serviceAreaLatitude: number | null;
  serviceAreaLongitude: number | null;
  serviceAreaRadiusKm?: number | null;
  providerAddress: string | null;
  providerAddressType: "HOME" | "BUSINESS";
  createdAt: string;
  updatedAt: string;
  completedJobs?: number | null;
  user: {
    name: string;
    email: string;
    phone: string;
    status?: "ACTIVE" | "INACTIVE" | "SUSPENDED";
  };
  skills: { id: string; name: string }[];
  specialties: { id: string; name: string; groupName: string }[];
  documents?: {
    id: string;
    type: string;
    url: string;
    status: "PENDING" | "APPROVED" | "REJECTED";
    rejectionNote: string | null;
    createdAt: string;
  }[];
};

type ProviderEditForm = {
  name: string;
  email: string;
  phone: string;
  bio: string;
  providerAddress: string;
  providerAddressType: "HOME" | "BUSINESS";
  serviceAreaRadiusKm: string;
  specialtyIds: string[];
  skillNames: string;
  reason: string;
};

type ProviderDecline = {
  id: string;
  declineReason: string | null;
  declineNote: string | null;
  respondedAt: string | null;
  serviceRequest: {
    id: string;
    title: string;
    createdAt: string;
    specialty: { name: string } | null;
  };
};

type SpecialtyOption = { id: string; name: string; groupName: string };
type SpecialtyGroupOption = { id: string; name: string };
type SpecialtyApiOption = { id: string; name: string };

function unwrapData<T>(response: T[] | { data: T[] }): T[] {
  return Array.isArray(response) ? response : response.data;
}

const dateFormatter = new Intl.DateTimeFormat("fa-IR", {
  calendar: "persian",
  dateStyle: "medium",
  timeStyle: "short",
});

const verificationLabels = {
  PENDING: "در انتظار تأیید",
  APPROVED: "تأییدشده",
  REJECTED: "ردشده",
} as const;

const documentLabels: Record<string, string> = {
  NATIONAL_CARD: "کارت ملی",
  BUSINESS_LICENSE: "پروانه کسب",
  CERTIFICATE: "گواهی‌نامه",
  COMMITMENT_LETTER: "تعهدنامه",
  CRIMINAL_RECORD: "گواهی عدم سوءپیشینه",
  OTHER: "سایر مدارک",
};

const documentStatusLabels: Record<NonNullable<ProviderDetails["documents"]>[number]["status"], string> = {
  APPROVED: "تأییدشده",
  REJECTED: "ردشده",
  PENDING: "در انتظار بررسی",
};

const declineReasonLabels: Record<string, string> = {
  NOT_MY_SPECIALTY: "خارج از تخصص",
  OUT_OF_SERVICE_AREA: "خارج از محدوده‌ی خدمت‌رسانی",
  SCHEDULE_UNAVAILABLE: "عدم امکان در زمان درخواستی",
  REQUEST_DETAILS_INSUFFICIENT: "جزئیات ناکافی درخواست",
  PRICE_OR_BUDGET: "شرایط یا بودجه‌ی نامتناسب",
  OTHER: "سایر",
};

function formatDate(value: string | null) {
  if (!value) return "ثبت نشده";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "ثبت نشده" : dateFormatter.format(date);
}

function formatNumber(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value.toLocaleString("fa-IR") : "دریافت نشده";
}

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid min-w-0 gap-1">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="break-words font-medium text-sm">{children ?? "—"}</dd>
    </div>
  );
}

export function ProviderDetailsPage({ providerId }: { providerId: string }) {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<ProviderEditForm>({
    name: "",
    email: "",
    phone: "",
    bio: "",
    providerAddress: "",
    providerAddressType: "HOME",
    serviceAreaRadiusKm: "10",
    specialtyIds: [],
    skillNames: "",
    reason: "",
  });

  const detailsQuery = useQuery({
    queryKey: ["admin-provider-details", providerId],
    enabled: Boolean(session?.accessToken),
    queryFn: () => {
      if (!session?.accessToken) throw new Error("نشست مدیر در دسترس نیست.");
      return adminApiFetch<ProviderDetails>(
        `/admin/providers/${encodeURIComponent(providerId)}/details`,
        session.accessToken,
      );
    },
  });
  const declinesQuery = useQuery({
    queryKey: ["admin-provider-declines", providerId],
    enabled: Boolean(session?.accessToken),
    queryFn: () => {
      if (!session?.accessToken) throw new Error("نشست مدیر در دسترس نیست.");
      return adminApiFetch<ProviderDecline[]>(
        `/admin/providers/${encodeURIComponent(providerId)}/declines`,
        session.accessToken,
      );
    },
  });
  const details = detailsQuery.data;
  const specialtyOptionsQuery = useQuery({
    queryKey: ["admin-provider-specialty-options"],
    enabled: Boolean(session?.accessToken),
    queryFn: async (): Promise<SpecialtyOption[]> => {
      const token = session?.accessToken;
      if (!token) throw new Error("نشست مدیر در دسترس نیست.");

      const groups = unwrapData(
        await adminApiFetch<SpecialtyGroupOption[] | { data: SpecialtyGroupOption[] }>(
          "/admin/specialties/groups",
          token,
        ),
      );
      const groupedOptions = await Promise.all(
        groups.map(async (group) => {
          const specialties = unwrapData(
            await adminApiFetch<SpecialtyApiOption[] | { data: SpecialtyApiOption[] }>(
              `/admin/specialties/groups/${encodeURIComponent(group.id)}/specialties`,
              token,
            ),
          );
          return specialties.map(({ id, name }) => ({ id, name, groupName: group.name }));
        }),
      );
      return groupedOptions.flat();
    },
  });
  const availableSpecialties = new Map(
    (specialtyOptionsQuery.data ?? []).map((specialty) => [specialty.id, specialty]),
  );
  details?.specialties.forEach((specialty) => {
    if (!availableSpecialties.has(specialty.id)) availableSpecialties.set(specialty.id, specialty);
  });
  const specialtyOptions = [...availableSpecialties.values()];

  useEffect(() => {
    if (!details) return;
    setForm({
      name: details.user.name,
      email: details.user.email,
      phone: details.user.phone,
      bio: details.bio ?? "",
      providerAddress: details.providerAddress ?? "",
      providerAddressType: details.providerAddressType,
      serviceAreaRadiusKm: String(details.serviceAreaRadiusKm ?? 10),
      specialtyIds: details.specialties.map(({ id }) => id),
      skillNames: details.skills.map(({ name }) => name).join("\n"),
      reason: "",
    });
  }, [details]);

  const updateMutation = useMutation({
    mutationFn: () => {
      if (!session?.accessToken) throw new Error("نشست مدیر در دسترس نیست.");
      return adminApiFetch<{ updated: boolean }>(
        `/admin/providers/${encodeURIComponent(providerId)}/details`,
        session.accessToken,
        {
          method: "PATCH",
          body: JSON.stringify({
            name: form.name.trim(),
            email: form.email.trim(),
            phone: form.phone.trim(),
            bio: form.bio.trim() || null,
            providerAddress: form.providerAddress.trim() || null,
            providerAddressType: form.providerAddressType,
            serviceAreaRadiusKm: Number(form.serviceAreaRadiusKm),
            specialtyIds: form.specialtyIds,
            skillNames: form.skillNames
              .split(/\r?\n/)
              .map((name) => name.trim())
              .filter(Boolean),
            reason: form.reason.trim(),
          }),
        },
      );
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-provider-details", providerId] }),
        queryClient.invalidateQueries({ queryKey: ["providers"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-audit-logs"] }),
      ]);
      toast.success("اطلاعات متخصص به‌روزرسانی و در سوابق مدیران ثبت شد.");
      setEditing(false);
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "ویرایش اطلاعات متخصص ناموفق بود."),
  });

  function submitEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isServiceAreaRadiusValid) {
      toast.error("شعاع خدمت‌رسانی باید عددی بین ۱ تا ۲۰۰ کیلومتر باشد.");
      return;
    }
    updateMutation.mutate();
  }

  function renderDeclines() {
    if (declinesQuery.isPending) {
      return (
        <p className="text-muted-foreground text-sm" role="status">
          در حال دریافت سوابق...
        </p>
      );
    }
    if (declinesQuery.isError) {
      return (
        <div className="grid gap-2 text-sm" role="alert">
          <p>
            {declinesQuery.error instanceof Error ? declinesQuery.error.message : "دریافت سوابق رد درخواست ناموفق بود."}
          </p>
          <Button type="button" variant="outline" className="w-fit" onClick={() => void declinesQuery.refetch()}>
            تلاش دوباره
          </Button>
        </div>
      );
    }
    if (!declinesQuery.data?.length) {
      return <p className="text-muted-foreground text-sm">هنوز درخواستی توسط این متخصص رد نشده است.</p>;
    }
    return declinesQuery.data.map((decline) => (
      <article key={decline.id} className="grid gap-1 rounded-lg border p-3 text-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="font-medium">{decline.serviceRequest.title}</span>
          <span className="text-muted-foreground text-xs">{formatDate(decline.respondedAt)}</span>
        </div>
        <p className="text-muted-foreground text-xs">
          {decline.serviceRequest.specialty?.name ?? "خدمت ثبت‌نشده"} · علت:{" "}
          {declineReasonLabels[decline.declineReason ?? ""] ?? "ثبت نشده"}
        </p>
        {decline.declineNote ? <p className="leading-6">{decline.declineNote}</p> : null}
      </article>
    ));
  }

  if (detailsQuery.isPending) {
    return (
      <p className="p-8 text-center text-muted-foreground text-sm" role="status">
        در حال دریافت اطلاعات متخصص...
      </p>
    );
  }
  if (detailsQuery.isError || !details) {
    return (
      <div className="grid justify-items-center gap-3 p-8 text-sm" role="alert">
        <p>{detailsQuery.error instanceof Error ? detailsQuery.error.message : "دریافت اطلاعات متخصص ناموفق بود."}</p>
        <Button type="button" variant="outline" onClick={() => void detailsQuery.refetch()}>
          تلاش دوباره
        </Button>
      </div>
    );
  }

  const serviceAreaRadius = Number(form.serviceAreaRadiusKm);
  const isServiceAreaRadiusValid =
    Number.isInteger(serviceAreaRadius) && serviceAreaRadius >= 1 && serviceAreaRadius <= 200;
  const documentEmptyMessage =
    details.documents === undefined ? "اطلاعات مدارک از سرویس دریافت نشد." : "مدرکی ثبت نشده است.";

  return (
    <main className="mx-auto grid w-full max-w-5xl gap-4">
      <header className="grid gap-3">
        <Button asChild variant="ghost" className="w-fit">
          <Link href="/dashboard/providers">
            <ArrowLeft className="size-4" />
            بازگشت به فهرست متخصصان
          </Link>
        </Button>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-semibold text-2xl">{details.user.name}</h1>
            <p className="mt-1 text-muted-foreground text-sm">جزئیات و مدیریت پروفایل متخصص</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {details.user.status ? (
              <>
                <Badge variant={details.user.status === "SUSPENDED" ? "destructive" : "outline"}>
                  {details.user.status === "SUSPENDED" ? "تعلیق‌شده" : "حساب فعال"}
                </Badge>
                <AccountStatusAction
                  targetType="provider"
                  targetId={details.id}
                  currentStatus={details.user.status}
                  name={details.user.name}
                />
              </>
            ) : (
              <Badge variant="outline">وضعیت حساب دریافت نشد</Badge>
            )}
            {!editing ? (
              <Button type="button" variant="outline" onClick={() => setEditing(true)}>
                <Pencil className="size-4" />
                ویرایش اطلاعات
              </Button>
            ) : null}
          </div>
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>خلاصه‌ی عملکرد</CardTitle>
          <CardDescription>وضعیت ثبت‌نام، امتیاز و سابقه‌ی فعالیت متخصص</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Detail label="وضعیت ثبت‌نام">{verificationLabels[details.verificationStatus]}</Detail>
          <Detail label="امتیاز">{formatNumber(details.rating)}</Detail>
          <Detail label="کارهای تکمیل‌شده">{formatNumber(details.completedJobs)}</Detail>
          <Detail label="تاریخ ثبت‌نام">{formatDate(details.createdAt)}</Detail>
          <Detail label="آماده‌ی دریافت کار">{details.isAvailable ? "بله" : "خیر"}</Detail>
          <Detail label="آخرین تأیید">{formatDate(details.verifiedAt)}</Detail>
          <Detail label="شعاع خدمت‌رسانی">
            {details.serviceAreaRadiusKm == null
              ? "دریافت نشده"
              : `${formatNumber(details.serviceAreaRadiusKm)} کیلومتر`}
          </Detail>
          <Detail label="مختصات محدوده">
            {details.serviceAreaLatitude == null || details.serviceAreaLongitude == null
              ? "ثبت نشده"
              : `${details.serviceAreaLatitude}, ${details.serviceAreaLongitude}`}
          </Detail>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>اطلاعات تماس و پروفایل</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Detail label="نام">{details.user.name}</Detail>
          <Detail label="شماره تماس">
            <span dir="ltr">{details.user.phone}</span>
          </Detail>
          <Detail label="ایمیل">
            <span dir="ltr">{details.user.email}</span>
          </Detail>
          <Detail label="نوع نشانی">{details.providerAddressType === "BUSINESS" ? "کاری" : "منزل"}</Detail>
          <Detail label="نشانی">{details.providerAddress || "ثبت نشده"}</Detail>
          <Detail label="معرفی">{details.bio || "متنی ثبت نشده است."}</Detail>
          {details.verificationNote ? <Detail label="یادداشت بررسی">{details.verificationNote}</Detail> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>سوابق رد درخواست</CardTitle>
          <CardDescription>علت‌هایی که متخصص هنگام رد درخواست ثبت کرده است؛ حداکثر ۱۰۰ مورد اخیر.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">{renderDeclines()}</CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>تخصص‌ها و مهارت‌ها</CardTitle>
          <CardDescription>تخصص‌ها با گروه مربوط و مهارت‌های ثبت‌شده نمایش داده می‌شوند.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5">
          <section className="grid gap-2">
            <h2 className="font-medium text-sm">تخصص‌ها</h2>
            {details.specialties.length ? (
              <div className="flex flex-wrap gap-2">
                {details.specialties.map((specialty) => (
                  <Badge key={specialty.id} variant="secondary">
                    {specialty.groupName} · {specialty.name}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">تخصصی ثبت نشده است.</p>
            )}
          </section>
          <section className="grid gap-2">
            <h2 className="font-medium text-sm">مهارت‌ها</h2>
            {details.skills.length ? (
              <div className="flex flex-wrap gap-2">
                {details.skills.map((skill) => (
                  <Badge key={skill.id} variant="outline">
                    {skill.name}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">مهارتی ثبت نشده است.</p>
            )}
          </section>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>مدارک ثبت‌شده</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2">
          {details.documents?.length ? (
            details.documents.map((document) => (
              <div
                key={document.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3"
              >
                <div className="grid gap-1">
                  <span className="font-medium text-sm">{documentLabels[document.type] ?? "مدرک"}</span>
                  <span className="text-muted-foreground text-xs">{documentStatusLabels[document.status]}</span>
                  {document.rejectionNote ? <span className="text-xs">دلیل رد: {document.rejectionNote}</span> : null}
                </div>
                <Button asChild variant="outline" size="sm">
                  <a href={document.url} target="_blank" rel="noreferrer">
                    مشاهده مدرک
                  </a>
                </Button>
              </div>
            ))
          ) : (
            <p className="text-muted-foreground text-sm">{documentEmptyMessage}</p>
          )}
        </CardContent>
      </Card>

      {editing ? (
        <Card className="border-primary/15 shadow-sm">
          <CardHeader className="border-b bg-muted/20">
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Pencil className="size-5" />
              </div>
              <div className="grid gap-1">
                <CardTitle>اصلاح اطلاعات متخصص</CardTitle>
                <CardDescription>تغییرات همراه با دلیل و اطلاعات قبل/بعد در سوابق مدیران ثبت می‌شود.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <form className="grid gap-5 p-4 sm:gap-6 sm:p-6" onSubmit={submitEdit}>
              <section className="grid gap-4 rounded-xl border bg-muted/20 p-4 sm:p-5">
                <div className="flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-lg bg-background text-primary shadow-xs">
                    <UserRound className="size-4" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-sm">اطلاعات پایه و تماس</h2>
                    <p className="text-muted-foreground text-xs">مشخصات حساب و راه‌های ارتباطی متخصص</p>
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="provider-name">نام و نام خانوادگی</Label>
                    <Input
                      id="provider-name"
                      className="h-10 bg-background"
                      required
                      minLength={2}
                      maxLength={100}
                      value={form.name}
                      onChange={(event) => setForm({ ...form, name: event.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="provider-phone">شماره تماس</Label>
                    <Input
                      id="provider-phone"
                      className="h-10 bg-background"
                      required
                      dir="ltr"
                      value={form.phone}
                      onChange={(event) => setForm({ ...form, phone: event.target.value })}
                    />
                  </div>
                  <div className="grid gap-2 sm:col-span-2">
                    <Label htmlFor="provider-email">ایمیل</Label>
                    <Input
                      id="provider-email"
                      className="h-10 bg-background"
                      type="email"
                      required
                      dir="ltr"
                      value={form.email}
                      onChange={(event) => setForm({ ...form, email: event.target.value })}
                    />
                  </div>
                </div>
              </section>

              <section className="grid gap-4 rounded-xl border bg-muted/20 p-4 sm:p-5">
                <div className="flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-lg bg-background text-primary shadow-xs">
                    <MapPin className="size-4" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-sm">اطلاعات محدوده‌ی خدمت</h2>
                    <p className="text-muted-foreground text-xs">نشانی کاری و شعاع تحت پوشش متخصص</p>
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="provider-address-type">نوع نشانی</Label>
                    <select
                      id="provider-address-type"
                      className="h-10 rounded-lg border border-input bg-background px-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                      value={form.providerAddressType}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          providerAddressType: event.target.value as ProviderEditForm["providerAddressType"],
                        })
                      }
                    >
                      <option value="HOME">منزل</option>
                      <option value="BUSINESS">کاری</option>
                    </select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="provider-radius">شعاع خدمت‌رسانی (کیلومتر)</Label>
                    <Input
                      id="provider-radius"
                      className="h-10 bg-background"
                      type="text"
                      inputMode="numeric"
                      required
                      value={formatGroupedInteger(form.serviceAreaRadiusKm)}
                      onChange={(event) =>
                        setForm({ ...form, serviceAreaRadiusKm: normalizeIntegerInput(event.target.value) })
                      }
                    />
                  </div>
                  <div className="grid gap-2 sm:col-span-2">
                    <Label htmlFor="provider-address">نشانی</Label>
                    <Input
                      id="provider-address"
                      className="h-10 bg-background"
                      maxLength={500}
                      value={form.providerAddress}
                      onChange={(event) => setForm({ ...form, providerAddress: event.target.value })}
                    />
                  </div>
                  <div className="grid gap-2 sm:col-span-2">
                    <Label htmlFor="provider-bio">معرفی و توضیحات پروفایل</Label>
                    <Textarea
                      id="provider-bio"
                      className="min-h-28 bg-background"
                      maxLength={1000}
                      rows={4}
                      value={form.bio}
                      onChange={(event) => setForm({ ...form, bio: event.target.value })}
                    />
                    <span className="text-muted-foreground text-xs">{form.bio.length}/۱۰۰۰ نویسه</span>
                  </div>
                </div>
              </section>

              <section className="grid gap-4 rounded-xl border bg-muted/20 p-4 sm:p-5">
                <div className="flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-lg bg-background text-primary shadow-xs">
                    <BriefcaseBusiness className="size-4" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-sm">تخصص‌ها و مهارت‌ها</h2>
                    <p className="text-muted-foreground text-xs">موارد قابل ارائه توسط این متخصص را انتخاب کنید</p>
                  </div>
                  <Badge variant="secondary" className="ms-auto">
                    {form.specialtyIds.length.toLocaleString("fa-IR")} تخصص
                  </Badge>
                </div>
                <fieldset className="grid gap-3">
                  <legend className="font-medium text-sm">تخصص‌ها</legend>
                  {specialtyOptionsQuery.isPending ? (
                    <p className="rounded-lg border bg-background p-4 text-muted-foreground text-sm" role="status">
                      در حال دریافت فهرست تخصص‌ها...
                    </p>
                  ) : null}
                  {specialtyOptionsQuery.isError ? (
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
                      <p className="text-destructive text-sm" role="alert">
                        {specialtyOptionsQuery.error.message || "دریافت فهرست تخصص‌ها ناموفق بود."}
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => void specialtyOptionsQuery.refetch()}
                      >
                        تلاش دوباره
                      </Button>
                    </div>
                  ) : null}
                  {!specialtyOptionsQuery.isPending && !specialtyOptionsQuery.isError && specialtyOptions.length > 0 ? (
                    <div className="grid max-h-80 gap-2 overflow-y-auto rounded-xl border bg-background p-3 sm:grid-cols-2">
                      {specialtyOptions.map((specialty) => {
                        const selected = form.specialtyIds.includes(specialty.id);
                        return (
                          <label
                            key={specialty.id}
                            htmlFor={`provider-specialty-${specialty.id}`}
                            className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm transition-colors ${
                              selected
                                ? "border-primary/30 bg-primary/5"
                                : "border-transparent hover:border-border hover:bg-muted/60"
                            }`}
                          >
                            <Checkbox
                              id={`provider-specialty-${specialty.id}`}
                              checked={selected}
                              onCheckedChange={(checked) => {
                                if (checked === true && form.specialtyIds.length >= 20) {
                                  toast.error("حداکثر ۲۰ تخصص قابل انتخاب است.");
                                  return;
                                }
                                setForm({
                                  ...form,
                                  specialtyIds:
                                    checked === true
                                      ? [...form.specialtyIds, specialty.id]
                                      : form.specialtyIds.filter((id) => id !== specialty.id),
                                });
                              }}
                            />
                            <span className="grid gap-0.5">
                              <span className="font-medium">{specialty.name}</span>
                              <span className="text-muted-foreground text-xs">{specialty.groupName}</span>
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  ) : null}
                  {!specialtyOptionsQuery.isPending &&
                  !specialtyOptionsQuery.isError &&
                  specialtyOptions.length === 0 ? (
                    <p className="rounded-lg border bg-background p-4 text-muted-foreground text-sm">
                      تخصصی برای انتخاب ثبت نشده است.
                    </p>
                  ) : null}
                </fieldset>
                <div className="grid gap-2">
                  <Label htmlFor="provider-skills">مهارت‌ها</Label>
                  <Textarea
                    id="provider-skills"
                    className="min-h-28 bg-background"
                    rows={4}
                    value={form.skillNames}
                    onChange={(event) => setForm({ ...form, skillNames: event.target.value })}
                  />
                  <span className="text-muted-foreground text-xs">هر مهارت را در یک خط وارد کنید.</span>
                </div>
              </section>

              <section className="grid gap-4 rounded-xl border border-amber-500/25 bg-amber-500/5 p-4 sm:p-5">
                <div className="flex items-start gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-background text-amber-600 shadow-xs dark:text-amber-400">
                    <ShieldCheck className="size-4" />
                  </div>
                  <div className="grid gap-1">
                    <Label htmlFor="provider-edit-reason">دلیل اصلاح (اجباری)</Label>
                    <p className="text-muted-foreground text-xs">
                      این توضیح برای شفافیت و پیگیری در سابقه‌ی اقدامات مدیر ثبت می‌شود.
                    </p>
                  </div>
                </div>
                <Textarea
                  id="provider-edit-reason"
                  className="min-h-24 bg-background"
                  required
                  minLength={3}
                  maxLength={500}
                  value={form.reason}
                  onChange={(event) => setForm({ ...form, reason: event.target.value })}
                  placeholder="مثلاً: اصلاح شماره تماس طبق درخواست متخصص"
                />
              </section>

              <div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  disabled={updateMutation.isPending}
                  onClick={() => setEditing(false)}
                >
                  <X className="size-4" />
                  انصراف
                </Button>
                <Button
                  type="submit"
                  disabled={
                    updateMutation.isPending ||
                    specialtyOptionsQuery.isPending ||
                    specialtyOptionsQuery.isError ||
                    !isServiceAreaRadiusValid ||
                    form.reason.trim().length < 3
                  }
                >
                  <Save className="size-4" />
                  {updateMutation.isPending ? "در حال ذخیره..." : "ذخیره تغییرات"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}
    </main>
  );
}
