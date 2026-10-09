"use client";

import { useState } from "react";

import { Download } from "lucide-react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { downloadAdminCsv } from "@/lib/admin-api";

export function AdminExportButton({ dataset, label }: { dataset: string; label: string }) {
  const { data: session } = useSession();
  const [pending, setPending] = useState(false);

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={pending || !session?.accessToken}
      onClick={async () => {
        if (!session?.accessToken) return;
        setPending(true);
        try {
          const result = await downloadAdminCsv(dataset, session.accessToken);
          if (result.truncated) {
            toast.warning("فایل دانلود شد اما فقط ۱۰٬۰۰۰ ردیف اول را دارد؛ برای خروجی کامل بازه را محدود کنید.");
          } else {
            toast.success("خروجی CSV آماده شد");
          }
        } catch (error) {
          toast.error(error instanceof Error ? error.message : "گرفتن خروجی ناموفق بود");
        } finally {
          setPending(false);
        }
      }}
    >
      <Download className="size-4" />
      {pending ? "در حال آماده‌سازی..." : label}
    </Button>
  );
}
