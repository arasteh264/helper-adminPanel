import type { Metadata } from "next";

import { SpecialtyManagement } from "./_components/specialty-management";

export const metadata: Metadata = {
  title: "مدیریت گروه‌های تخصص و تخصص‌ها",
  description: "مدیریت گروه‌های تخصص و تخصص‌های پنل هلپا24",
};

export default function Page() {
  return <SpecialtyManagement />;
}
