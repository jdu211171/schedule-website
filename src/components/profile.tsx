"use client";

import React from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "./ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";

export default function Profile() {
  const { data: session } = useSession({
    required: true,
  });
  return (
    <div className="w-full flex justify-between items-center row-start-1">
      {session ? (
        <DropdownMenu>
          <DropdownMenuTrigger>
            <Avatar>
              <AvatarImage
                src={session.user?.image ?? ""}
                alt={session.user?.name ?? ""}
              />
              <AvatarFallback>
                {session.user?.name?.toUpperCase().slice(0, 2)}
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel className="text-center font-bold">
              {session.user?.name}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={async () => await signOut()}>
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <Button>
          <Link href="/auth/login">Login</Link>
        </Button>
      )}
    </div>
  );
}
