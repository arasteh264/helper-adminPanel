import type { Metadata } from "next";

import { AccountingPage } from "../_components/accounting-page";

export const metadata: Metadata = {
  title: "گردش کیف پول",
};

export default function Page() {
  return <AccountingPage section="ledger" />;
}
