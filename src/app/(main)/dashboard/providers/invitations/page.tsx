import type { Metadata } from "next";

import { ProviderInvitations } from "../_components/provider-invitations";

export const metadata: Metadata = {
  title: "دعوت متخصصان و فهرست دعوت‌ها",
};

export default function Page() {
  return <ProviderInvitations />;
}
