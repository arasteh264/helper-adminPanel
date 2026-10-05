import type { Metadata } from "next";

import { Users } from "./_components/users";

export const metadata: Metadata = {
  title: "مدیریت کاربران",
  description: "فهرست و مدیریت کاربران پنل هلپر",
};

export default function Page() {
  return <Users />;
}
