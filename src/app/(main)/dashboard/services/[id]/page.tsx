import type { Metadata } from "next";

import { ServiceRequestDetailsPage } from "../_components/service-request-details";

export const metadata: Metadata = {
  title: "جزئیات درخواست سرویس",
};

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ServiceRequestDetailsPage requestId={id} />;
}
