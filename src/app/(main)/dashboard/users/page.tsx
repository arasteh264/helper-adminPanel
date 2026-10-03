import type { Metadata } from "next";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { getUsers } from "./_components/api";
import { Users } from "./_components/users";

export const metadata: Metadata = {
  title: "مدیریت کاربران",
  description: "فهرست و مدیریت کاربران پنل هلپر",
};

export default async function Page() {
  try {
    const users = await getUsers();
    return <Users users={users} />;
  } catch {
    return (
      <Card>
        <CardHeader>
          <CardTitle>دریافت کاربران ناموفق بود</CardTitle>
          <CardDescription>اتصال API را بررسی کنید و پس از برقراری ارتباط دوباره تلاش کنید.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline">
            <a href="/dashboard/users">تلاش دوباره</a>
          </Button>
        </CardContent>
      </Card>
    );
  }
}
