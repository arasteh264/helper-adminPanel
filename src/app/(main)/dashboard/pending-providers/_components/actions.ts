"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

type ActionResult = { ok: boolean };

async function updateVerification(id: string, status: "APPROVED" | "REJECTED", note?: string): Promise<ActionResult> {
  const token = (await cookies()).get("access_token")?.value;

  const res = await fetch(`${process.env.API_URL}/admin/providers/pending`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ status, note }),
  });

  if (!res.ok) return { ok: false };

  revalidatePath("/dashboard/pending-providers");
  return { ok: true };
}

export async function approveProvider(id: string): Promise<ActionResult> {
  return updateVerification(id, "APPROVED");
}

export async function rejectProvider(id: string, note: string): Promise<ActionResult> {
  return updateVerification(id, "REJECTED", note);
}
