"use client";

import { type ChangeEvent, type FormEvent, type MouseEvent, useEffect, useState } from "react";

import Image from "next/image";

import { FileImage, LoaderCircle, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import { useSession } from "next-auth/react";
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
import {
  Attachment,
  AttachmentContent,
  AttachmentDescription,
  AttachmentMedia,
  AttachmentTitle,
} from "@/components/ui/attachment";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { ApiError, type Specialty, type SpecialtyGroup } from "./api";
import {
  useDeleteSpecialty,
  useDeleteSpecialtyGroup,
  useSaveSpecialty,
  useSaveSpecialtyGroup,
  useSpecialtiesByGroup,
  useSpecialtyGroups,
} from "./use-specialties";

const MAX_ICON_SIZE = 2 * 1024 * 1024;
const LIST_PAGE_SIZE = 10;

function ListPagination({
  label,
  page,
  total,
  onPageChange,
}: {
  label: string;
  page: number;
  total: number;
  onPageChange: (page: number) => void;
}) {
  const pageCount = Math.max(1, Math.ceil(total / LIST_PAGE_SIZE));
  if (total <= LIST_PAGE_SIZE) return null;

  return (
    <div className="flex items-center justify-between gap-2 border-t pt-3 text-xs">
      <span className="text-muted-foreground">
        صفحه‌ی {page.toLocaleString("fa-IR")} از {pageCount.toLocaleString("fa-IR")} · {label}:{" "}
        {total.toLocaleString("fa-IR")}
      </span>
      <div className="flex gap-1">
        <Button type="button" variant="outline" size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          قبلی
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={page >= pageCount}
          onClick={() => onPageChange(page + 1)}
        >
          بعدی
        </Button>
      </div>
    </div>
  );
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback;
}

function appendFormValues(
  formData: FormData,
  values: { name: string; slug: string; sortOrder: number; isActive: boolean },
) {
  formData.set("name", values.name.trim());
  formData.set("slug", values.slug.trim());
  formData.set("sortOrder", String(values.sortOrder));
  formData.set("isActive", String(values.isActive));
}

function IconField({
  icon,
  file,
  onChange,
}: {
  icon: string | null;
  file: File | undefined;
  onChange: (file?: File) => void;
}) {
  function selectFile(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0];
    if (!selected) return;
    if (!selected.type.startsWith("image/")) {
      toast.error("فقط فایل تصویری قابل انتخاب است");
      event.target.value = "";
      return;
    }
    if (selected.size > MAX_ICON_SIZE) {
      toast.error("حجم آیکون نباید بیشتر از ۲ مگابایت باشد");
      event.target.value = "";
      return;
    }
    onChange(selected);
  }

  return (
    <div className="grid gap-2">
      <Label htmlFor="specialty-icon">تصویر دسته یا خدمت</Label>
      {icon ? (
        <div className="grid gap-2">
          <div className="relative aspect-[16/9] overflow-hidden rounded-xl border bg-muted">
            <Image
              src={icon}
              alt="تصویر فعلی خدمت"
              fill
              sizes="(max-width: 640px) 100vw, 32rem"
              className="object-cover"
            />
          </div>
          <p className="text-muted-foreground text-xs">با انتخاب عکس جدید جایگزین می‌شود.</p>
        </div>
      ) : null}
      {file ? (
        <Attachment className="w-full">
          <AttachmentMedia>
            <FileImage />
          </AttachmentMedia>
          <AttachmentContent>
            <AttachmentTitle>{file.name}</AttachmentTitle>
            <AttachmentDescription>{(file.size / 1024).toFixed(0)} کیلوبایت</AttachmentDescription>
          </AttachmentContent>
          <Button
            type="button"
            size="icon-xs"
            variant="ghost"
            aria-label="حذف فایل انتخاب‌شده"
            onClick={() => onChange()}
          >
            <Trash2 />
          </Button>
        </Attachment>
      ) : null}
      <Input key={file?.name ?? "empty"} id="specialty-icon" type="file" accept="image/*" onChange={selectFile} />
      <p className="text-muted-foreground text-xs">
        عکس واقعی و افقی با نسبت ۱۶:۹ بهتر دیده می‌شود · حداکثر حجم: ۲ مگابایت
      </p>
    </div>
  );
}

function GroupDialog({ group, onClose }: { group?: SpecialtyGroup; onClose: () => void }) {
  const mutation = useSaveSpecialtyGroup();
  const [name, setName] = useState(group?.name ?? "");
  const [slug, setSlug] = useState(group?.slug ?? "");
  const [sortOrder, setSortOrder] = useState(String(group?.sortOrder ?? 0));
  const [isActive, setIsActive] = useState(group?.isActive ?? true);
  const [iconFile, setIconFile] = useState<File>();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData();
    appendFormValues(formData, {
      name,
      slug,
      sortOrder: Number(sortOrder),
      isActive,
    });
    if (iconFile) formData.set("icon", iconFile);

    try {
      await mutation.mutateAsync({ id: group?.id, formData });
      toast.success(group ? "گروه تخصص ویرایش شد" : "گروه تخصص ایجاد شد");
      onClose();
    } catch (error) {
      toast.error(getErrorMessage(error, "ذخیره‌ی گروه تخصص ناموفق بود"));
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{group ? "ویرایش گروه تخصص" : "افزودن گروه تخصص"}</DialogTitle>
          <DialogDescription>اطلاعات گروه تخصص را وارد کنید.</DialogDescription>
        </DialogHeader>
        <form id="group-form" className="grid gap-4" onSubmit={submit}>
          <div className="grid gap-2">
            <Label htmlFor="group-name">نام</Label>
            <Input
              id="group-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              maxLength={100}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="group-slug">شناسه‌ی انگلیسی (slug)</Label>
            <Input
              id="group-slug"
              value={slug}
              onChange={(event) => setSlug(event.target.value)}
              required
              maxLength={100}
              dir="ltr"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="group-order">ترتیب نمایش</Label>
            <Input
              id="group-order"
              type="number"
              min={0}
              step={1}
              value={sortOrder}
              onChange={(event) => setSortOrder(event.target.value)}
              required
            />
          </div>
          <ActiveCheckbox checked={isActive} onCheckedChange={setIsActive} />
          <IconField icon={group?.icon ?? null} file={iconFile} onChange={setIconFile} />
        </form>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            انصراف
          </Button>
          <Button type="submit" form="group-form" disabled={mutation.isPending}>
            {mutation.isPending ? <LoaderCircle className="animate-spin" /> : null}
            ذخیره
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SpecialtyDialog({
  specialty,
  groups,
  defaultGroupId,
  onClose,
}: {
  specialty?: Specialty;
  groups: SpecialtyGroup[];
  defaultGroupId: string;
  onClose: () => void;
}) {
  const mutation = useSaveSpecialty();
  const [groupId, setGroupId] = useState(specialty?.groupId ?? defaultGroupId);
  const [name, setName] = useState(specialty?.name ?? "");
  const [slug, setSlug] = useState(specialty?.slug ?? "");
  const [sortOrder, setSortOrder] = useState(String(specialty?.sortOrder ?? 0));
  const [isActive, setIsActive] = useState(specialty?.isActive ?? true);
  const [iconFile, setIconFile] = useState<File>();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData();
    appendFormValues(formData, {
      name,
      slug,
      sortOrder: Number(sortOrder),
      isActive,
    });
    formData.set("groupId", groupId);
    if (iconFile) formData.set("icon", iconFile);

    try {
      await mutation.mutateAsync({ id: specialty?.id, formData });
      toast.success(specialty ? "تخصص ویرایش شد" : "تخصص ایجاد شد");
      onClose();
    } catch (error) {
      toast.error(getErrorMessage(error, "ذخیره‌ی تخصص ناموفق بود"));
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{specialty ? "ویرایش تخصص" : "افزودن تخصص"}</DialogTitle>
          <DialogDescription>تخصص را به گروه موردنظر متصل کنید.</DialogDescription>
        </DialogHeader>
        <form id="specialty-form" className="grid gap-4" onSubmit={submit}>
          <div className="grid gap-2">
            <Label>گروه تخصص</Label>
            <Select value={groupId} onValueChange={setGroupId}>
              <SelectTrigger className="w-full" aria-label="گروه تخصص">
                <SelectValue placeholder="انتخاب گروه" />
              </SelectTrigger>
              <SelectContent>
                {groups.map((group) => (
                  <SelectItem key={group.id} value={group.id}>
                    {group.name}
                    {group.isActive ? "" : " (غیرفعال)"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="specialty-name">نام</Label>
            <Input
              id="specialty-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              maxLength={100}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="specialty-slug">شناسه‌ی انگلیسی (slug)</Label>
            <Input
              id="specialty-slug"
              value={slug}
              onChange={(event) => setSlug(event.target.value)}
              required
              maxLength={100}
              dir="ltr"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="specialty-order">ترتیب نمایش</Label>
            <Input
              id="specialty-order"
              type="number"
              min={0}
              step={1}
              value={sortOrder}
              onChange={(event) => setSortOrder(event.target.value)}
              required
            />
          </div>
          <ActiveCheckbox checked={isActive} onCheckedChange={setIsActive} />
          <IconField icon={specialty?.icon ?? null} file={iconFile} onChange={setIconFile} />
        </form>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            انصراف
          </Button>
          <Button type="submit" form="specialty-form" disabled={mutation.isPending || !groupId}>
            {mutation.isPending ? <LoaderCircle className="animate-spin" /> : null}
            ذخیره
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ActiveCheckbox({
  checked,
  onCheckedChange,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <Label className="flex cursor-pointer items-center gap-2">
      <Checkbox checked={checked} onCheckedChange={(value) => onCheckedChange(value === true)} />
      فعال
    </Label>
  );
}

function DeleteConfirmation({
  title,
  description,
  onDelete,
}: {
  title: string;
  description: string;
  onDelete: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  async function confirm(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    setPending(true);
    try {
      await onDelete();
      setOpen(false);
    } catch {
      setOpen(true);
    } finally {
      setPending(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <Button type="button" variant="ghost" size="icon-sm" aria-label={title} onClick={() => setOpen(true)}>
        <Trash2 />
      </Button>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>انصراف</AlertDialogCancel>
          <AlertDialogAction variant="destructive" disabled={pending} onClick={confirm}>
            {pending ? <LoaderCircle className="animate-spin" /> : null}
            حذف
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function QueryError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div
      className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm"
      role="alert"
    >
      <span>{message}</span>
      <Button variant="outline" size="sm" onClick={onRetry}>
        <RefreshCw /> تلاش دوباره
      </Button>
    </div>
  );
}

export function SpecialtyManagement() {
  const { status: sessionStatus, data: session } = useSession();
  const groupsQuery = useSpecialtyGroups();
  const groups = groupsQuery.data ?? [];
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [groupsPage, setGroupsPage] = useState(1);
  const [specialtiesPage, setSpecialtiesPage] = useState(1);
  const [groupDialog, setGroupDialog] = useState<{
    group?: SpecialtyGroup;
  } | null>(null);
  const [specialtyDialog, setSpecialtyDialog] = useState<{
    specialty?: Specialty;
  } | null>(null);
  const specialtiesQuery = useSpecialtiesByGroup(selectedGroupId || undefined);
  const deleteGroup = useDeleteSpecialtyGroup();
  const deleteSpecialty = useDeleteSpecialty();

  useEffect(() => {
    if (groups.length && !groups.some((group) => group.id === selectedGroupId)) {
      setSelectedGroupId(groups[0].id);
    } else if (!groups.length && selectedGroupId) {
      setSelectedGroupId("");
    }
  }, [groups, selectedGroupId]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: Reset pagination when the selected group changes.
  useEffect(() => {
    setSpecialtiesPage(1);
  }, [selectedGroupId]);

  const selectedGroup = groups.find((group) => group.id === selectedGroupId);
  const specialties = specialtiesQuery.data ?? [];
  const groupPageCount = Math.max(1, Math.ceil(groups.length / LIST_PAGE_SIZE));
  const specialtyPageCount = Math.max(1, Math.ceil(specialties.length / LIST_PAGE_SIZE));
  const visibleGroups = groups.slice((groupsPage - 1) * LIST_PAGE_SIZE, groupsPage * LIST_PAGE_SIZE);
  const visibleSpecialties = specialties.slice(
    (specialtiesPage - 1) * LIST_PAGE_SIZE,
    specialtiesPage * LIST_PAGE_SIZE,
  );

  useEffect(() => {
    if (groupsPage > groupPageCount) setGroupsPage(groupPageCount);
  }, [groupPageCount, groupsPage]);
  useEffect(() => {
    if (specialtiesPage > specialtyPageCount) setSpecialtiesPage(specialtyPageCount);
  }, [specialtiesPage, specialtyPageCount]);

  function removeGroup(group: SpecialtyGroup) {
    return deleteGroup
      .mutateAsync(group.id)
      .then(() => {
        toast.success("گروه تخصص حذف شد");
      })
      .catch((error: unknown) => {
        toast.error(getErrorMessage(error, "حذف گروه تخصص ناموفق بود"));
        throw error;
      });
  }

  function removeSpecialty(specialty: Specialty) {
    return deleteSpecialty
      .mutateAsync(specialty.id)
      .then(() => {
        toast.success("تخصص حذف شد");
      })
      .catch((error: unknown) => {
        toast.error(getErrorMessage(error, "حذف تخصص ناموفق بود"));
        throw error;
      });
  }

  if (sessionStatus === "loading" || (sessionStatus === "authenticated" && groupsQuery.isPending)) {
    return (
      <div className="flex min-h-48 items-center justify-center text-muted-foreground">
        <LoaderCircle className="animate-spin" /> <span className="sr-only">در حال دریافت اطلاعات</span>
      </div>
    );
  }

  if (!session?.accessToken) {
    return <QueryError message="برای مدیریت تخصص‌ها وارد حساب ادمین شوید." onRetry={() => void groupsQuery.refetch()} />;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="grid gap-1">
          <h1 className="font-semibold text-2xl">گروه‌های تخصص و تخصص‌ها</h1>
          <p className="text-muted-foreground text-sm">مدیریت نام، تصویر، ترتیب و وضعیت انتشار</p>
        </div>
        <Button onClick={() => setGroupDialog({})}>
          <Plus /> گروه تخصص
        </Button>
      </div>

      {groupsQuery.isError ? (
        <QueryError
          message={getErrorMessage(groupsQuery.error, "دریافت گروه‌های تخصص ناموفق بود")}
          onRetry={() => void groupsQuery.refetch()}
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(260px,0.8fr)_minmax(0,1.6fr)]">
          <Card>
            <CardHeader className="border-b">
              <CardTitle>گروه‌ها</CardTitle>
              <CardDescription>{groups.length} گروه</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-1">
              {groups.length ? (
                visibleGroups.map((group) => (
                  <div
                    key={group.id}
                    className={`flex items-center gap-1 rounded-md border p-2 ${selectedGroupId === group.id ? "border-primary/40 bg-muted/60" : "border-transparent"}`}
                  >
                    {group.icon ? (
                      <Image
                        src={group.icon}
                        alt=""
                        width={64}
                        height={44}
                        unoptimized
                        className="h-11 w-16 shrink-0 rounded-md object-cover"
                      />
                    ) : (
                      <span className="flex h-11 w-16 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                        <FileImage className="size-5" />
                      </span>
                    )}
                    <button
                      type="button"
                      className="min-w-0 flex-1 text-start"
                      onClick={() => setSelectedGroupId(group.id)}
                    >
                      <span className="block truncate font-medium">{group.name}</span>
                      <span className="block truncate text-muted-foreground text-xs" dir="ltr">
                        {group.slug}
                      </span>
                    </button>
                    <Badge variant={group.isActive ? "default" : "secondary"}>
                      {group.isActive ? "فعال" : "غیرفعال"}
                    </Badge>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`ویرایش ${group.name}`}
                      onClick={() => setGroupDialog({ group })}
                    >
                      <Pencil />
                    </Button>
                    <DeleteConfirmation
                      title="حذف گروه تخصص"
                      description={`گروه «${group.name}» حذف شود؟`}
                      onDelete={() => removeGroup(group)}
                    />
                  </div>
                ))
              ) : (
                <p className="py-5 text-center text-muted-foreground text-sm">گروهی ثبت نشده است.</p>
              )}
              <ListPagination label="گروه" page={groupsPage} total={groups.length} onPageChange={setGroupsPage} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b md:grid-cols-[1fr_auto]">
              <CardTitle>{selectedGroup ? `تخصص‌های ${selectedGroup.name}` : "تخصص‌ها"}</CardTitle>
              <CardDescription>
                {selectedGroup ? `${specialties.length} تخصص` : "ابتدا گروه تخصص را ایجاد کنید."}
              </CardDescription>
              {selectedGroup ? (
                <Button size="sm" onClick={() => setSpecialtyDialog({})}>
                  <Plus /> تخصص
                </Button>
              ) : null}
            </CardHeader>
            <CardContent className="grid gap-2">
              {specialtiesQuery.isError ? (
                <QueryError
                  message={getErrorMessage(specialtiesQuery.error, "دریافت تخصص‌ها ناموفق بود")}
                  onRetry={() => void specialtiesQuery.refetch()}
                />
              ) : specialtiesQuery.isPending && selectedGroupId ? (
                <div className="flex justify-center py-8 text-muted-foreground">
                  <LoaderCircle className="animate-spin" />
                  <span className="sr-only">در حال دریافت تخصص‌ها</span>
                </div>
              ) : specialties.length ? (
                visibleSpecialties.map((specialty) => (
                  <div key={specialty.id} className="flex flex-wrap items-center gap-2 border-b py-2 last:border-b-0">
                    {specialty.icon ? (
                      <Image
                        src={specialty.icon}
                        alt=""
                        width={64}
                        height={44}
                        unoptimized
                        className="h-11 w-16 shrink-0 rounded-md object-cover"
                      />
                    ) : (
                      <span className="flex h-11 w-16 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                        <FileImage className="size-5" />
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{specialty.name}</span>
                        <Badge variant={specialty.isActive ? "default" : "secondary"}>
                          {specialty.isActive ? "فعال" : "غیرفعال"}
                        </Badge>
                      </div>
                      <span className="text-muted-foreground text-xs" dir="ltr">
                        {specialty.slug} · ترتیب {specialty.sortOrder}
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`ویرایش ${specialty.name}`}
                      onClick={() => setSpecialtyDialog({ specialty })}
                    >
                      <Pencil />
                    </Button>
                    <DeleteConfirmation
                      title="حذف تخصص"
                      description={`تخصص «${specialty.name}» حذف شود؟`}
                      onDelete={() => removeSpecialty(specialty)}
                    />
                  </div>
                ))
              ) : selectedGroup ? (
                <p className="py-5 text-center text-muted-foreground text-sm">تخصصی در این گروه ثبت نشده است.</p>
              ) : null}
              <ListPagination
                label="تخصص"
                page={specialtiesPage}
                total={specialties.length}
                onPageChange={setSpecialtiesPage}
              />
            </CardContent>
          </Card>
        </div>
      )}

      {groupDialog ? (
        <GroupDialog
          key={groupDialog.group?.id ?? "new-group"}
          group={groupDialog.group}
          onClose={() => setGroupDialog(null)}
        />
      ) : null}
      {specialtyDialog && selectedGroup ? (
        <SpecialtyDialog
          key={specialtyDialog.specialty?.id ?? `new-${selectedGroup.id}`}
          specialty={specialtyDialog.specialty}
          groups={groups}
          defaultGroupId={selectedGroup.id}
          onClose={() => setSpecialtyDialog(null)}
        />
      ) : null}
    </div>
  );
}
