import type { Metadata } from "next";

import { PendingProviders } from "../pending-providers/_components/providers";

export const metadata: Metadata = {
  title: "فهرست متخصصان",
};

export default function Page() {
  return <PendingProviders verificationStatus="APPROVED" />;
}
