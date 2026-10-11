"use client";

import { useState } from "react";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { LoaderCircle, Trash2 } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { adminApiFetch } from "@/lib/admin-api";

export function UserDeleteAction({ userId, name }: { userId: string; name: string }) {
  const [open, setOpen] = useState(false);
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: () => {
      if (!session?.accessToken) throw new Error("نشست مدیر در دسترس نیست.");
      return adminApiFetch<{ id: string; cleanupWarning?: string }>(
        `/users/${encodeURIComponent(userId)}`,
        session.accessToken,
        {
          method: "DELETE",
        },
      );
    },
    onSuccess: async (result) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-users"] }),
        queryClient.invalidateQueries({ queryKey: ["providers"] }),
      ]);
      if (result.cleanupWarning) {
        toast.error(result.cleanupWarning);
      } else {
        toast.success("حساب کاربر حذف شد.");
      }
      setOpen(false);
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "حذف کاربر ناموفق بود."),
  });

  return (
    <AlertDialog open={open} onOpenChange={(nextOpen) => !mutation.isPending && setOpen(nextOpen)}>
      <Button
        type="button"
        size="icon-sm"
        variant="ghost"
        className="text-destructive hover:text-destructive"
        aria-label={`حذف حساب ${name}`}
        title="حذف کاربر بدون سابقه"
        onClick={() => setOpen(true)}
      >
        <Trash2 />
      </Button>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>حذف حساب کاربر</AlertDialogTitle>
          <AlertDialogDescription>
            حساب «{name}» برای همیشه حذف می‌شود. این کار فقط برای حساب‌های بدون درخواست سرویس، کار انجام‌شده و سابقه‌ی مالی
            مجاز است.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={mutation.isPending}>انصراف</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={mutation.isPending}
            onClick={(event) => {
              event.preventDefault();
              mutation.mutate();
            }}
          >
            {mutation.isPending ? <LoaderCircle className="animate-spin" /> : <Trash2 />}
            حذف دائمی
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
