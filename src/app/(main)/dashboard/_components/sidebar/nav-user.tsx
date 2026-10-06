"use client";

import { useState } from "react";

import { LogOut } from "lucide-react";
import { signOut } from "next-auth/react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";

export function NavUser({
  user,
}: {
  readonly user: {
    readonly name: string;
    readonly email: string;
  };
}) {
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function handleSignOut() {
    setIsSigningOut(true);
    try {
      await signOut({ redirect: false });
      window.location.assign("/auth/v2/login");
    } catch {
      setIsSigningOut(false);
      toast.error("خروج از حساب انجام نشد؛ دوباره تلاش کنید.");
    }
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <div className="grid gap-2 rounded-lg border border-sidebar-border p-2">
          <SidebarMenuButton size="lg" className="h-auto cursor-default hover:bg-transparent">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
              {user.name.slice(0, 1)}
            </span>
            <span className="grid min-w-0 flex-1 text-start text-sm leading-tight">
              <span className="truncate font-medium">{user.name}</span>
              <span className="truncate text-sidebar-foreground/65 text-xs">{user.email}</span>
            </span>
          </SidebarMenuButton>
          <Button
            type="button"
            variant="ghost"
            className="w-full justify-start text-destructive hover:bg-destructive/10 hover:text-destructive"
            disabled={isSigningOut}
            onClick={() => void handleSignOut()}
          >
            <LogOut aria-hidden="true" />
            {isSigningOut ? "در حال خروج..." : "خروج از حساب"}
          </Button>
        </div>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
