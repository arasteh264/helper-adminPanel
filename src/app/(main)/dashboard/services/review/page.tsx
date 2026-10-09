import type { Metadata } from "next";

import { ServiceRequestsList } from "../_components/service-requests-list";

export const metadata: Metadata = {
  title: "درخواست‌های در انتظار بررسی مدیر",
};

export default function Page() {
  return <ServiceRequestsList initialStatus="PENDING_ADMIN_REVIEW" />;
}
