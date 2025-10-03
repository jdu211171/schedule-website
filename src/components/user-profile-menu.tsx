"use client";

import Link from "next/link";
import { LogOut, KeyRound } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOut, useSession } from "next-auth/react";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PasswordChangeForm } from "@/components/auth/password-change-form";

export default function UserProfileMenu() {
  const { data: session } = useSession({ required: true });
  const [open, setOpen] = useState(false);

  if (!session) {
    return (
      <Link
        href="/auth/login"
        className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
      >
        ログイン
      </Link>
    );
  }

  const userInitials = session.user?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  const dashboardLink =
    session.user?.role === "STUDENT"
      ? "/student"
      : session.user?.role === "TEACHER"
      ? "/teacher"
      : "/dashboard";

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger>
          <Avatar>
            <AvatarImage
              src={session.user?.image ?? ""}
              alt={session.user?.name ?? ""}
            />
            <AvatarFallback>{userInitials}</AvatarFallback>
          </Avatar>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel className="font-semibold">
            {session.user?.name}
            <DropdownMenuSeparator />
            {session.user?.email}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setOpen(true)}>
            <span className="flex items-center">
              <KeyRound className="mr-2 h-4 w-4" />
              パスワード変更
            </span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => signOut()}>
            <span className="flex items-center">
              <LogOut className="mr-2 h-4 w-4" />
              ログアウト
            </span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>パスワード変更</DialogTitle>
          </DialogHeader>
          <PasswordChangeForm onSuccess={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}
