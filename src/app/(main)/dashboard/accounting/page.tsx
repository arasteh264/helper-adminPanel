import type { Metadata } from "next";

import { AccountingPage } from "./_components/accounting-page";

export const metadata: Metadata = {
  title: "حسابداری و پرداخت‌ها",
  description: "گزارش حسابداری، دفترکل، پرداخت مشتریان و برداشت Providerها",
};

export default function Page() {
  return <AccountingPage />;
}
