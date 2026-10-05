import type { Metadata } from "next";

import { APP_CONFIG } from "@/config/app-config";

import { LoginForm } from "../../_components/login-form";

export const metadata: Metadata = {
  title: "ورود مدیر",
  description: "ورود مدیران به پنل مدیریت هلپر",
};

export default function LoginV2() {
  return (
    <>
      <div className="mx-auto flex w-full flex-col justify-center space-y-8 sm:w-87.5">
        <div className="space-y-2 text-center">
          <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <span className="font-bold text-xl">ه</span>
          </span>
          <h1 className="font-bold text-3xl">خوش آمدید</h1>
          <p className="text-muted-foreground text-sm">برای ورود امن به پنل مدیریت، اطلاعات حساب مدیر را وارد کنید.</p>
        </div>
        <div className="rounded-2xl border border-border/80 bg-background p-5 shadow-sm sm:p-6">
          <LoginForm />
        </div>
      </div>

      <div className="absolute bottom-5 flex w-full justify-center px-10">
        <div className="text-muted-foreground text-sm">{APP_CONFIG.copyright}</div>
      </div>
    </>
  );
}
