import { format } from "date-fns";

import type { UserRole, UserRow, UserStatus } from "./data";

const API_URL = process.env.API_URL ?? "http://localhost:3005";

type ApiUser = {
  id: string;
  _name: string;
  _email: string;
  _phone: string;
  _role: UserRole;
  _status: UserStatus;
  createdAt: string;
  _updatedAt: string;
};

type ApiUsersResponse = {
  items: ApiUser[];
  total: number;
};

function mapUser(user: ApiUser): UserRow {
  return {
    id: user.id,
    name: user._name,
    email: user._email,
    phone: user._phone,
    role: user._role,
    // team: "-",
    // workspace: [],
    status: user._status,
    joinedDate: format(new Date(user.createdAt), "dd MMM yyyy, h:mm a"),
    // lastActive: Math.floor((Date.now() - new Date(user._updatedAt).getTime()) / 60000),
  };
}

export async function getUsers(): Promise<UserRow[]> {
  const res = await fetch(`${API_URL}/users`, { cache: "no-store" });

  if (!res.ok) throw new Error("خطا در دریافت کاربران");

  const data: ApiUsersResponse = await res.json();

  return data.items.map(mapUser);
}
