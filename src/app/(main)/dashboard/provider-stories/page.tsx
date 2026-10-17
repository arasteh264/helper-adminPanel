import type { Metadata } from "next";

import { ProviderStories } from "./_components/provider-stories";

export const metadata: Metadata = {
  title: "مدیریت استوری متخصصان",
};

export default function Page() {
  return <ProviderStories />;
}
