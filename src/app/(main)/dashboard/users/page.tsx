import type { Metadata } from "next";

import { getUsers } from "./_components/api";
import { Users } from "./_components/users";

export const metadata: Metadata = {
  title: "Open Source User Management Dashboard with shadcn/ui",
  description: "Explore an open source user management dashboard for browsing, filtering, and managing user accounts.",
};

export default async function Page() {
  const users = await getUsers();

  return <Users users={users} />;
}
