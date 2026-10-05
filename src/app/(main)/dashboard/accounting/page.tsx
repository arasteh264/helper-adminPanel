import type { Metadata } from "next";

import { AccountingPage } from "./_components/accounting-page";

export const metadata: Metadata = {
  title: "گزارش مالی",
  description: "نمای کلی وضعیت مالی پنل هلپرمی",
};

export default function Page() {
  return <AccountingPage />;
}
