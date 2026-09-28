import type { Metadata } from "next";

import { ServiceRequestsList } from "./_components/service-requests-list";

export const metadata: Metadata = {
  title: "لیست سرویس ها",
};

export default function Page() {
  return <ServiceRequestsList />;
}
