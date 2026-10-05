"use client";

import { useState } from "react";

import { useMutation, useQueryClient } from "@tanstack/react-query";
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

export function ResolveDisputeAction({ request }: { request: ServiceRequestRow }) {
  const [open, setOpen] = useState(false);
  const [resolution, setResolution] = useState<Resolution | null>(null);
  const [reason, setReason] = useState("");
  const { data: session } = useSession();
  const queryClient = useQueryClient();
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
            <DialogDescription>
              نتیجه‌ی بررسی درخواست «{request.title}» را انتخاب کنید. دلیل تصمیم برای ثبت سابقه الزامی است.
            </DialogDescription>
          </DialogHeader>
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
              disabled={!resolution || reason.trim().length < 3 || mutation.isPending}
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
