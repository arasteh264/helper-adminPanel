import packageJson from "../../package.json";

const currentYear = new Date().getFullYear();

export const APP_CONFIG = {
  name: "پنل مدیریت هلپرمی",
  version: packageJson.version,
  copyright: `© ${currentYear} هلپرمی`,
  meta: {
    title: "پنل مدیریت هلپرمی",
    description: "سامانه‌ی مدیریت کاربران، سرویس‌ها و امور مالی هلپرمی",
  },
};
