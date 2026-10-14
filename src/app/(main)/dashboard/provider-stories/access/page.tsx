import type { Metadata } from "next";

import { ProviderStoryAccessDashboard } from "../_components/provider-story-access-dashboard";

export const metadata: Metadata = {
  title: "مجوز انتشار استوری",
  description: "جست‌وجو و مدیریت دسترسی متخصصان برای انتشار استوری",
};

export default function Page() {
  return <ProviderStoryAccessDashboard />;
}
