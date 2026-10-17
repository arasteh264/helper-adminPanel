import type { Metadata } from "next";

import { ProviderStorySettings } from "../_components/provider-story-settings";

export const metadata: Metadata = {
  title: "تنظیمات استوری",
};

export default function Page() {
  return <ProviderStorySettings />;
}
