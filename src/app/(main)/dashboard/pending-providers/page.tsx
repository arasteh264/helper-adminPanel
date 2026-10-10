import type { Metadata } from "next";

import { PendingProviders } from "./_components/providers";

export const metadata: Metadata = {
  title: "ثبت‌نام‌های در انتظار تأیید",
};

export default function Page() {
  return <PendingProviders />;
}
