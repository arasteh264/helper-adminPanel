"use client";

import { type FormEvent, type ReactNode, useEffect, useState } from "react";

import Link from "next/link";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Pencil, Save, X } from "lucide-react";
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

type ProviderDetails = {
  id: string;
  bio: string | null;
  rating: number;
  isVerified: boolean;
  verificationStatus: "PENDING" | "APPROVED" | "REJECTED";
  verificationNote: string | null;
  verifiedAt: string | null;
  isAvailable: boolean;
  avatarUrl: string | null;
  serviceAreaLatitude: number | null;
  serviceAreaLongitude: number | null;
  serviceAreaRadiusKm: number;
  providerAddress: string | null;
  providerAddressType: "HOME" | "BUSINESS";
  createdAt: string;
  updatedAt: string;
  completedJobs: number;
  user: { name: string; email: string; phone: string; status: "ACTIVE" | "INACTIVE" | "SUSPENDED" };
  skills: { id: string; name: string }[];
  specialties: { id: string; name: string; groupName: string }[];
  specialtyOptions: { id: string; name: string; groupName: string }[];
  documents: {
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

const documentStatusLabels: Record<ProviderDetails["documents"][number]["status"], string> = {
  APPROVED: "تأییدشده",
  REJECTED: "ردشده",
  PENDING: "در انتظار بررسی",
};

function formatDate(value: string | null) {
  if (!value) return "ثبت نشده";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "ثبت نشده" : dateFormatter.format(date);
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
  const details = detailsQuery.data;

  useEffect(() => {
    if (!details) return;
    setForm({
      name: details.user.name,
      email: details.user.email,
      phone: details.user.phone,
      bio: details.bio ?? "",
      providerAddress: details.providerAddress ?? "",
      providerAddressType: details.providerAddressType,
      serviceAreaRadiusKm: String(details.serviceAreaRadiusKm),
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
    updateMutation.mutate();
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
            <Badge variant={details.user.status === "SUSPENDED" ? "destructive" : "outline"}>
              {details.user.status === "SUSPENDED" ? "تعلیق‌شده" : "حساب فعال"}
            </Badge>
            <AccountStatusAction
              targetType="provider"
              targetId={details.id}
              currentStatus={details.user.status}
              name={details.user.name}
            />
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
          <Detail label="امتیاز">{details.rating.toLocaleString("fa-IR")}</Detail>
          <Detail label="کارهای تکمیل‌شده">{details.completedJobs.toLocaleString("fa-IR")}</Detail>
          <Detail label="تاریخ ثبت‌نام">{formatDate(details.createdAt)}</Detail>
          <Detail label="آماده‌ی دریافت کار">{details.isAvailable ? "بله" : "خیر"}</Detail>
          <Detail label="آخرین تأیید">{formatDate(details.verifiedAt)}</Detail>
          <Detail label="شعاع خدمت‌رسانی">{details.serviceAreaRadiusKm.toLocaleString("fa-IR")} کیلومتر</Detail>
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
          {details.documents.length ? (
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
            <p className="text-muted-foreground text-sm">مدرکی ثبت نشده است.</p>
          )}
        </CardContent>
      </Card>

      {editing ? (
        <Card>
          <CardHeader>
            <CardTitle>اصلاح اطلاعات متخصص</CardTitle>
            <CardDescription>
              تغییرات این فرم همراه با دلیل و اطلاعات قبل/بعد در سوابق مدیران ثبت می‌شود.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="grid gap-5" onSubmit={submitEdit}>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="provider-name">نام</Label>
                  <Input
                    id="provider-name"
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
                    required
                    dir="ltr"
                    value={form.phone}
                    onChange={(event) => setForm({ ...form, phone: event.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="provider-email">ایمیل</Label>
                  <Input
                    id="provider-email"
                    type="email"
                    required
                    dir="ltr"
                    value={form.email}
                    onChange={(event) => setForm({ ...form, email: event.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="provider-radius">شعاع خدمت‌رسانی (کیلومتر)</Label>
                  <Input
                    id="provider-radius"
                    type="number"
                    min={1}
                    max={200}
                    required
                    value={form.serviceAreaRadiusKm}
                    onChange={(event) => setForm({ ...form, serviceAreaRadiusKm: event.target.value })}
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="provider-address">نشانی</Label>
                <Input
                  id="provider-address"
                  maxLength={500}
                  value={form.providerAddress}
                  onChange={(event) => setForm({ ...form, providerAddress: event.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="provider-address-type">نوع نشانی</Label>
                <select
                  id="provider-address-type"
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm"
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
                <Label htmlFor="provider-bio">معرفی و توضیحات پروفایل</Label>
                <Textarea
                  id="provider-bio"
                  maxLength={1000}
                  rows={4}
                  value={form.bio}
                  onChange={(event) => setForm({ ...form, bio: event.target.value })}
                />
              </div>
              <fieldset className="grid gap-3">
                <legend className="font-medium text-sm">تخصص‌ها</legend>
                <div className="grid max-h-72 gap-2 overflow-y-auto rounded-md border p-3 sm:grid-cols-2">
                  {details.specialtyOptions.map((specialty) => (
                    <label
                      key={specialty.id}
                      htmlFor={`provider-specialty-${specialty.id}`}
                      className="flex cursor-pointer items-center gap-2 rounded-sm p-1.5 text-sm hover:bg-muted"
                    >
                      <Checkbox
                        id={`provider-specialty-${specialty.id}`}
                        checked={form.specialtyIds.includes(specialty.id)}
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
                      <span>
                        {specialty.groupName} · {specialty.name}
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <div className="grid gap-2">
                <Label htmlFor="provider-skills">مهارت‌ها (هر مهارت در یک خط)</Label>
                <Textarea
                  id="provider-skills"
                  rows={4}
                  value={form.skillNames}
                  onChange={(event) => setForm({ ...form, skillNames: event.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="provider-edit-reason">دلیل اصلاح (اجباری)</Label>
                <Textarea
                  id="provider-edit-reason"
                  required
                  minLength={3}
                  maxLength={500}
                  value={form.reason}
                  onChange={(event) => setForm({ ...form, reason: event.target.value })}
                />
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={updateMutation.isPending}
                  onClick={() => setEditing(false)}
                >
                  <X className="size-4" />
                  انصراف
                </Button>
                <Button type="submit" disabled={updateMutation.isPending || form.reason.trim().length < 3}>
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
