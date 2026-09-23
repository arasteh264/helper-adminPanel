import packageJson from "../../package.json";

const currentYear = new Date().getFullYear();

export const APP_CONFIG = {
  name: " پنل مدیریت هلپرمی",
  version: packageJson.version,
  copyright: `© ${currentYear}،پنل ادمین هلپرمی`,
  meta: {
    title: "پنل مدیریت هلپرمی",
    description: "پنل مدیریت هلپرمی ",
  },
};
