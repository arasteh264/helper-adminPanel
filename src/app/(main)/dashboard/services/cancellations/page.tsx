import type { Metadata } from "next";

import { ProviderCancellationRequests } from "../_components/provider-cancellation-requests";

export const metadata: Metadata = {
  title: "درخواست‌های لغو متخصص",
  description: "بررسی و تصمیم‌گیری درباره‌ی درخواست لغو کار توسط متخصص",
};

export default function Page() {
  return <ProviderCancellationRequests />;
}
