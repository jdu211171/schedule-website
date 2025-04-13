"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from "@/components/navigation-menu";
import {
  CalendarIcon,
  Settings,
  CalendarDays,
  LayoutDashboard,
  MapPin,
  LucideIcon,
} from "lucide-react";
import UserProfileMenu from "@/components/user-profile-menu"; // Import the new component
import { ThemeToggle } from "../theme-toggle";

interface NavItemType {
  title: string;
  href: string;
  icon: LucideIcon;
  exact?: boolean;
}

const navItems: NavItemType[] = [
  {
    title: "個人スケジュール",
    href: "/dashboard",
    icon: CalendarIcon,
    exact: true,
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

export default function Navbar() {
  const pathname = usePathname();

  const isActive = (item: NavItemType): boolean => {
    if (item.exact) {
      return pathname === item.href;
    }
    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  };

  return (
    <header className="border-b">
      <div className="max-w-6xl mx-auto px-4 flex h-16 items-center">
        <div className="mr-8 font-semibold text-xl">
          <Link href="/dashboard">LightHouse</Link>
        </div>

        <NavigationMenu>
          <NavigationMenuList>
            {navItems.map((item) => (
              <NavigationMenuItem key={item.href}>
                <Link href={item.href} legacyBehavior passHref>
                  <NavigationMenuLink
                    className={cn(
                      navigationMenuTriggerStyle(),
                      isActive(item) ? "bg-accent text-accent-foreground" : ""
                    )}
                  >
                    <div className="flex items-center">
                      <item.icon className="mr-2 h-4 w-4" />
                      {item.title}
                    </div>
                  </NavigationMenuLink>
                </Link>
              </NavigationMenuItem>
            ))}
          </NavigationMenuList>
        </NavigationMenu>

        <div className="ml-auto flex items-center gap-2">
          <UserProfileMenu />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
