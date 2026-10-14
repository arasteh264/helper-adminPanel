import type { Metadata } from "next";

import { ProviderStoriesDashboard } from "./_components/provider-stories-dashboard";

export const metadata: Metadata = {
  title: "مدیریت استوری‌ها",
  description: "بازبینی و انتشار استوری‌های متخصصان و گزارش مالی آن‌ها",
};

export default function Page() {
  return <ProviderStoriesDashboard />;
}
