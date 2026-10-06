import type { Metadata } from "next";

import { PendingProviders } from "./_components/providers";

export const metadata: Metadata = {
  title: "مدیریت سرویس‌دهندگان",
};

export default function Page() {
  return <PendingProviders />;
}
