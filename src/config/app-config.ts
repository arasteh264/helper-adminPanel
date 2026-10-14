import packageJson from "../../package.json";

const currentYear = new Date().getFullYear();

export const APP_CONFIG = {
  name: "پنل مدیریت هلپا24",
  version: packageJson.version,
  copyright: `© ${currentYear} هلپا24`,
  meta: {
    title: "پنل مدیریت هلپا24",
    description: "سامانه‌ی مدیریت کاربران، سرویس‌ها و امور مالی هلپا24",
  },
};
