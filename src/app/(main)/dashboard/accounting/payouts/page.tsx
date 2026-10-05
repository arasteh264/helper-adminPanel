import type { Metadata } from "next";

import { AccountingPage } from "../_components/accounting-page";

export const metadata: Metadata = {
  title: "درخواست‌های برداشت",
};

export default function Page() {
  return <AccountingPage section="payouts" />;
}
