import type { Metadata } from "next";

import { ProviderStoryAccess } from "../_components/provider-story-access";

export const metadata: Metadata = {
  title: "مجوزهای استوری متخصصان",
};

export default function Page() {
  return <ProviderStoryAccess />;
}
