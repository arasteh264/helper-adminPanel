"use client";
import { useState } from "react";

import { Check, Loader2, X } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

import { useProviderDocuments, useReviewDocument, useReviewProvider } from "../use-provider-review";
import { ApiError } from "./api";
import type { ProviderRow } from "./data";
import { documentStatusMeta, documentTypeMeta, MANDATORY_DOCUMENT_TYPES, type ProviderDocument } from "./documents";

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback;
}

function DocumentStatusBadge({ status }: { status: ProviderDocument["status"] }) {
  const meta = documentStatusMeta[status];
  return (
    <Badge variant="outline" className="gap-1.5 px-2 py-1 font-medium">
      <span className={`size-1.5 rounded-full ${meta.dotClass}`} />
      {meta.label}
    </Badge>
  );
}

function DocumentRow({ document, providerProfileId }: { document: ProviderDocument; providerProfileId: string }) {
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectionNote, setRejectionNote] = useState(document.rejectionNote ?? "");
  const reviewDocument = useReviewDocument();

  function approve() {
    reviewDocument.mutate(
      { documentId: document.id, providerProfileId, decision: "APPROVED" },
      {
        onSuccess: () => {
          toast.success("مدرک تأیید شد");
          setIsRejecting(false);
        },
        onError: (error) => toast.error(getErrorMessage(error, "تأیید مدرک ناموفق بود")),
      },
    );
  }

  function reject() {
    if (!rejectionNote.trim()) return;
    reviewDocument.mutate(
      {
        documentId: document.id,
        providerProfileId,
        decision: "REJECTED",
        rejectionNote: rejectionNote.trim(),
      },
      {
        onSuccess: () => {
          toast.success("مدرک رد شد");
          setIsRejecting(false);
        },
        onError: (error) => toast.error(getErrorMessage(error, "رد مدرک ناموفق بود")),
      },
    );
  }

  const isMandatory = MANDATORY_DOCUMENT_TYPES.includes(document.type);
  const isApproving = reviewDocument.isPending && reviewDocument.variables?.decision === "APPROVED";
  const isSubmittingRejection = reviewDocument.isPending && reviewDocument.variables?.decision === "REJECTED";

  return (
    <div className="flex flex-col gap-2 rounded-md border p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">{documentTypeMeta[document.type].label}</span>
            {!isMandatory ? <Badge variant="secondary">اختیاری</Badge> : null}
          </div>
          <a
            href={document.url}
            target="_blank"
            rel="noreferrer"
            className="text-primary text-xs underline underline-offset-2"
          >
            مشاهده فایل
          </a>
        </div>

        {/* دکمه‌های تأیید/رد همیشه نمایش داده می‌شن، حتی بعد از تأیید یا رد شدن مدرک،
            تا در صورت اشتباه بشه دوباره وضعیتش رو تغییر داد (ویرایش) */}
        <div className="flex items-center gap-2">
          <DocumentStatusBadge status={document.status} />
          <Button
            size="icon-sm"
            variant={document.status === "APPROVED" ? "default" : "outline"}
            disabled={reviewDocument.isPending}
            onClick={approve}
            aria-label="تأیید مدرک"
          >
            {isApproving ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
          </Button>
          <Button
            size="icon-sm"
            variant={document.status === "REJECTED" ? "destructive" : "outline"}
            className={document.status !== "REJECTED" ? "text-destructive" : undefined}
            disabled={reviewDocument.isPending}
            onClick={() => setIsRejecting((value) => !value)}
            aria-label="رد مدرک"
          >
            <X className="size-4" />
          </Button>
        </div>
      </div>

      {document.status === "REJECTED" && document.rejectionNote && !isRejecting ? (
        <p className="text-muted-foreground text-xs">دلیل رد: {document.rejectionNote}</p>
      ) : null}

      {isRejecting ? (
        <div className="flex flex-col gap-2">
          <Textarea
            placeholder="دلیل رد مدرک را بنویسید..."
            value={rejectionNote}
            onChange={(event) => setRejectionNote(event.target.value)}
            rows={2}
          />
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => setIsRejecting(false)}>
              انصراف
            </Button>
            <Button
              size="sm"
              variant="destructive"
              disabled={!rejectionNote.trim() || reviewDocument.isPending}
              onClick={reject}
            >
              {isSubmittingRejection ? <Loader2 className="size-4 animate-spin" /> : null}
              {document.status === "REJECTED" ? "به‌روزرسانی دلیل رد" : "ثبت رد"}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function DocumentsList({
  documents,
  isLoading,
  isError,
  providerId,
}: {
  documents: ProviderDocument[];
  isLoading: boolean;
  isError: boolean;
  providerId: string | undefined;
}) {
  if (isLoading) {
    return <div className="py-6 text-center text-muted-foreground text-sm">در حال بارگذاری مدارک...</div>;
  }

  if (isError) {
    return <div className="py-6 text-center text-sm">خطا در دریافت مدارک</div>;
  }

  if (!providerId || documents.length === 0) {
    return <div className="py-6 text-center text-muted-foreground text-sm">مدرکی ثبت نشده است</div>;
  }

  return (
    <div className="flex max-h-80 flex-col gap-2 overflow-y-auto">
      {documents.map((document) => (
        <DocumentRow key={document.id} document={document} providerProfileId={providerId} />
      ))}
    </div>
  );
}

function FinalApproveButton({
  canApprove,
  isPending,
  onApprove,
}: {
  canApprove: boolean;
  isPending: boolean;
  onApprove: () => void;
}) {
  if (canApprove) {
    return (
      <Button onClick={onApprove} disabled={isPending}>
        {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
        تأیید نهایی پروفایل
      </Button>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span>
          <Button disabled>تأیید نهایی پروفایل</Button>
        </span>
      </TooltipTrigger>
      <TooltipContent>تا تأیید همه‌ی مدارک اجباری، این گزینه غیرفعال است</TooltipContent>
    </Tooltip>
  );
}

export function ProviderReviewDialog({
  provider,
  open,
  onOpenChange,
}: {
  provider: ProviderRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const providerId = provider?.id;
  const { data, isLoading, isError } = useProviderDocuments(providerId);
  const documents = data ?? [];

  const reviewProvider = useReviewProvider();
  const [isRejectingProvider, setIsRejectingProvider] = useState(false);
  const [providerRejectionNote, setProviderRejectionNote] = useState("");

  // شرط قبلی چک می‌کرد که هر ۵ نوع مدرک اجباری وجود داشته و APPROVED باشن؛
  // اگه سرویس‌دهنده کمتر از ۵ نوع آپلود کرده بود، دکمه هیچ‌وقت فعال نمی‌شد.
  // این‌جا فقط مدارک اجباریِ واقعاً ارسال‌شده رو چک می‌کنیم.
  const mandatoryDocuments = documents.filter((document) => MANDATORY_DOCUMENT_TYPES.includes(document.type));
  const mandatoryComplete =
    mandatoryDocuments.length > 0 && mandatoryDocuments.every((document) => document.status === "APPROVED");

  function closeAndReset() {
    onOpenChange(false);
    setIsRejectingProvider(false);
    setProviderRejectionNote("");
  }

  function approveProviderFinal() {
    if (!providerId) return;
    reviewProvider.mutate(
      { providerId, status: "APPROVED" },
      {
        onSuccess: () => {
          toast.success("پروفایل سرویس‌دهنده تأیید شد");
          closeAndReset();
        },
        // خطای ۴۰۰ (مثلاً «مدارک اجباری کامل نیست») همینجا با متن واقعی نشون داده می‌شه
        onError: (error) => toast.error(getErrorMessage(error, "تأیید پروفایل ناموفق بود")),
      },
    );
  }

  function rejectProviderFinal() {
    if (!providerId || !providerRejectionNote.trim()) return;
    reviewProvider.mutate(
      { providerId, status: "REJECTED", note: providerRejectionNote.trim() },
      {
        onSuccess: () => {
          toast.success("درخواست سرویس‌دهنده رد شد");
          closeAndReset();
        },
        onError: (error) => toast.error(getErrorMessage(error, "رد درخواست ناموفق بود")),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={(value) => (value ? onOpenChange(true) : closeAndReset())}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>بررسی مدارک {provider?.user.name}</DialogTitle>
          <DialogDescription>مدارک ارسالی را بررسی و تأیید یا رد کنید</DialogDescription>
        </DialogHeader>

        <DocumentsList documents={documents} isLoading={isLoading} isError={isError} providerId={providerId} />

        <Separator />

        {isRejectingProvider ? (
          <Textarea
            placeholder="دلیل رد کل درخواست را بنویسید..."
            value={providerRejectionNote}
            onChange={(event) => setProviderRejectionNote(event.target.value)}
            rows={3}
          />
        ) : null}

        <DialogFooter className="flex-row justify-between gap-2 sm:justify-between">
          {isRejectingProvider ? (
            <>
              <Button variant="ghost" onClick={() => setIsRejectingProvider(false)}>
                انصراف
              </Button>
              <Button
                variant="destructive"
                disabled={!providerRejectionNote.trim() || reviewProvider.isPending}
                onClick={rejectProviderFinal}
              >
                {reviewProvider.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                ثبت رد درخواست
              </Button>
            </>
          ) : (
            <>
              <Button variant="destructive" onClick={() => setIsRejectingProvider(true)}>
                رد کل درخواست
              </Button>

              <FinalApproveButton
                canApprove={mandatoryComplete}
                isPending={reviewProvider.isPending}
                onApprove={approveProviderFinal}
              />
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
