import type { Metadata } from "next";

import { ServiceRequestsList } from "./_components/service-requests-list";

export const metadata: Metadata = {
  title: "درخواست‌های سرویس",
  description: "جستجو و پیگیری درخواست‌های ثبت‌شده در سامانه",
};

export default function Page() {
  return <ServiceRequestsList />;
}
