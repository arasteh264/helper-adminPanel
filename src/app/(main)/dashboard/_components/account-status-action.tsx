"use client";

import { useState } from "react";

import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import { adminApiFetch } from "@/lib/admin-api";

type AccountStatusActionProps = {
  targetType: "user" | "provider";
  targetId: string;
  currentStatus: "ACTIVE" | "INACTIVE" | "SUSPENDED";
  name: string;
};

export function AccountStatusAction({ targetType, targetId, currentStatus, name }: AccountStatusActionProps) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const nextStatus = currentStatus === "SUSPENDED" ? "ACTIVE" : "SUSPENDED";
  const mutation = useMutation({
    mutationFn: () => {
      if (!session?.accessToken) throw new Error("نشست مدیر در دسترس نیست.");
      return adminApiFetch(
        `/admin/${targetType === "user" ? "users" : "providers"}/${encodeURIComponent(targetId)}/status`,
        session.accessToken,
        { method: "PATCH", body: JSON.stringify({ status: nextStatus, reason }) },
      );
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-users"] }),
        queryClient.invalidateQueries({ queryKey: ["providers"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-provider-details"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-audit-logs"] }),
      ]);
      toast.success(nextStatus === "SUSPENDED" ? "حساب تعلیق شد" : "حساب دوباره فعال شد");
      setReason("");
      setOpen(false);
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "تغییر وضعیت حساب ناموفق بود"),
  });

  if (currentStatus === "INACTIVE") return null;

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant={nextStatus === "SUSPENDED" ? "destructive" : "outline"}
        onClick={() => setOpen(true)}
      >
        {nextStatus === "SUSPENDED" ? "تعلیق" : "فعال‌سازی"}
      </Button>
      <Dialog open={open} onOpenChange={(value) => !mutation.isPending && setOpen(value)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{nextStatus === "SUSPENDED" ? "تعلیق حساب" : "فعال‌سازی دوباره"}</DialogTitle>
            <DialogDescription>
              وضعیت حساب «{name}» تغییر می‌کند. برای ثبت در سابقه‌ی مدیر، دلیل را وارد کنید.
              {targetType === "provider" && nextStatus === "SUSPENDED"
                ? " دسترس‌پذیری متخصص هم غیرفعال می‌شود؛ فعال‌سازی حساب، دسترس‌پذیری را خودکار روشن نمی‌کند."
                : ""}
            </DialogDescription>
          </DialogHeader>
          <form
            className="grid gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              mutation.mutate();
            }}
          >
            <Textarea
              autoComplete="off"
              maxLength={500}
              minLength={3}
              required
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="دلیل (حداقل ۳ نویسه)"
              aria-label="دلیل تغییر وضعیت"
            />
            <DialogFooter>
              <Button type="button" variant="outline" disabled={mutation.isPending} onClick={() => setOpen(false)}>
                انصراف
              </Button>
              <Button
                type="submit"
                variant={nextStatus === "SUSPENDED" ? "destructive" : "default"}
                disabled={mutation.isPending || reason.trim().length < 3}
              >
                {mutation.isPending ? "در حال ثبت..." : "تأیید"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
