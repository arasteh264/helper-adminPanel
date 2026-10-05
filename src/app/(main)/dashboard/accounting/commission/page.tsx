import type { Metadata } from "next";

import { AccountingPage } from "../_components/accounting-page";

export const metadata: Metadata = {
  title: "تنظیم کمیسیون",
};

export default function Page() {
  return <AccountingPage section="commission" />;
}
