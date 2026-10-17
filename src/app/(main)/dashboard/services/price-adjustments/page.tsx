import type { Metadata } from "next";

import { ServicePriceAdjustments } from "../_components/service-price-adjustments";

export const metadata: Metadata = {
  title: "اصلاح مبلغ در انتظار بررسی",
  description: "بررسی پیشنهادهای افزایش مبلغ ثبت‌شده توسط متخصصان",
};

export default function Page() {
  return <ServicePriceAdjustments />;
}
