import type { Metadata } from "next";

import { BlogManagement } from "./_components/blog-management";

export const metadata: Metadata = {
  title: "مدیریت وبلاگ",
  description: "تولید، ویرایش و انتشار محتوای وبلاگ هلپر",
};

export default function Page() {
  return <BlogManagement />;
}
