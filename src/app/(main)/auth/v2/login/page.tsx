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
          <h1 className="font-medium text-3xl">ورود مدیر</h1>
          <p className="text-muted-foreground text-sm">برای ورود به پنل، اطلاعات حساب ادمین را وارد کنید.</p>
        </div>
        <LoginForm />
      </div>

      <div className="absolute bottom-5 flex w-full justify-center px-10">
        <div className="text-sm">{APP_CONFIG.copyright}</div>
      </div>
    </>
  );
}
