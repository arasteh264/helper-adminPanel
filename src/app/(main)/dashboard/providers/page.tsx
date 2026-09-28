import type { Metadata } from "next";

import { ProvidersList } from "./_components/providers";

export const metadata: Metadata = {
  title: "لیست سرویس دهنگان",
};

export default function Page() {
  return <ProvidersList />;
}
