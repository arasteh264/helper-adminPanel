import type { Metadata } from "next";

import { OperationsDashboard } from "./_components/operations-dashboard";

export const metadata: Metadata = {
  title: "داشبورد مدیریت",
  description: "نمای کلی عملیات و موارد نیازمند پیگیری در پنل هلپا24",
};

export default function Page() {
  return <OperationsDashboard />;
}
