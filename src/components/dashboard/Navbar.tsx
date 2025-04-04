"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { 
  CalendarIcon, 
  Settings, 
  CalendarDays, 
  LayoutDashboard,
  MapPin,
  LogOut
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSession, signOut } from "next-auth/react";

const navItems = [
  {
    title: "個人スケジュール",
    href: "/dashboard",
    icon: CalendarIcon,
  },
  {
    title: "総合スケジュール",
    href: "/dashboard/schedules",
    icon: CalendarDays,
  },
  {
    title: "部屋マッピング",
    href: "/dashboard/match",
    icon: MapPin,
  },
  {
    title: "タスク管理",
    href: "/dashboard/master",
    icon: LayoutDashboard,
  },
  {
    title: "設定",
    href: "/dashboard/settings",
    icon: Settings,
  },
];

const Navbar = () => {
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    <header className="border-b">
      <div className="max-w-6xl mx-auto px-4 flex h-16 items-center">
        <div className="mr-8 font-semibold text-xl">
          <Link href="/dashboard">LightHouse</Link>
        </div>

        <nav className="flex flex-1 items-center space-x-1 lg:space-x-2">
          {navItems.map((item) => (
            <Button 
              key={item.href}
              variant="ghost" 
              size="sm" 
              asChild
              className={cn(
                pathname === item.href || pathname.startsWith(`${item.href}/`)
                  ? "bg-accent"
                  : ""
              )}
            >
              <Link href={item.href} className="flex items-center">
                <item.icon className="mr-2 h-4 w-4" />
                <span>{item.title}</span>
              </Link>
            </Button>
          ))}
        </nav>
        
        <div className="ml-auto">
          {session ? (
            <DropdownMenu>
              <DropdownMenuTrigger>
                <Avatar>
                  <AvatarImage
                    src={session.user?.image ?? ""}
                    alt={session.user?.name ?? ""}
                  />
                  <AvatarFallback>
                    {session.user?.name?.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  <Link href="/profile" className="flex items-center w-full">
                    プロフィール
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => signOut()}>
                  <span className="flex items-center">
                    <LogOut className="mr-2 h-4 w-4" />
                    ログアウト
                  </span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button asChild>
              <Link href="/auth/login">ログイン</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;