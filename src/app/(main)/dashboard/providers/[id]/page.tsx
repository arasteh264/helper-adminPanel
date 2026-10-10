import type { Metadata } from "next";

import { ProviderDetailsPage } from "../_components/provider-details-page";

export const metadata: Metadata = {
  title: "جزئیات متخصص",
};

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ProviderDetailsPage providerId={id} />;
}
