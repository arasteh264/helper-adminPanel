import type { Metadata } from "next";

import { ServiceRequestsList } from "../_components/service-requests-list";

export const metadata: Metadata = {
  title: "درخواست‌های اختلاف‌دار",
};

export default function Page() {
  return <ServiceRequestsList initialStatus="DISPUTED" />;
}
