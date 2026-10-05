import type { ReactNode } from "react";

import { HeartHandshake } from "lucide-react";

import { APP_CONFIG } from "@/config/app-config";

export default function Layout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <main>
      <div className="grid h-dvh justify-center p-2 lg:grid-cols-2">
        <div className="relative order-2 hidden h-full overflow-hidden rounded-3xl bg-primary lg:flex">
          <div className="absolute inset-0 bg-linear-to-br from-primary via-primary to-primary-hover" />
          <div className="relative flex h-full w-full flex-col justify-between p-12 text-primary-foreground">
            <div className="space-y-5">
              <span className="flex size-14 items-center justify-center rounded-2xl bg-primary-foreground/15">
                <HeartHandshake className="size-8" />
              </span>
              <div className="space-y-2">
                <h1 className="font-bold text-3xl">{APP_CONFIG.name}</h1>
                <p className="text-primary-foreground/80">سامانه‌ی یکپارچه‌ی مدیریت خدمات هلپرمی</p>
              </div>
            </div>

            <div className="max-w-lg space-y-3">
              <h2 className="font-semibold text-xl">همه‌ی عملیات، در یک نگاه</h2>
              <p className="text-primary-foreground/80 leading-8">
                درخواست‌ها را بررسی کنید، گفت‌وگوها را پیگیری کنید و امور مالی را با اطمینان مدیریت کنید.
              </p>
              <p className="pt-5 text-primary-foreground/65 text-sm">{APP_CONFIG.copyright}</p>
            </div>
          </div>
        </div>
        <div className="relative order-1 flex h-full items-center justify-center rounded-3xl bg-card px-5 py-10 lg:mx-2">
          {children}
        </div>
      </div>
    </main>
  );
}
