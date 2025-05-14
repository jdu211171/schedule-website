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
  GraduationCap,
  Table,
} from "lucide-react";
import UserProfileMenu from "@/components/user-profile-menu";
import { ThemeToggle } from "../theme-toggle";

interface NavItemType {
  title: string;
  href: string;
  icon: LucideIcon;
  exact?: boolean;
}

const dashboardNavItems: NavItemType[] = [
  {
    title: "総合スケジュール",
    href: "/dashboard/schedules",
    icon: CalendarDays,
  },
  {
    title: "マッチング",
    href: "/dashboard/matching",
    icon: Table,
  },
  {
    title: "マッチング管理",
    href: "/dashboard/match",
    icon: MapPin,
  },
  {
    title: "マスターデータ管理",
    href: "/dashboard/master",
    icon: LayoutDashboard,
  },
];

const teacherNavItems: NavItemType[] = [
  {
    title: "先生",
    href: "/teacher",
    icon: LayoutDashboard,
    exact: true,
  },
  {
    title: "環境設定",
    href: "/teacher/preferences",
    icon: CalendarIcon,
  },
  {
    title: "設定",
    href: "/teacher/settings",
    icon: Settings,
  },
];

const studentNavItems: NavItemType[] = [
  {
    title: "学生",
    href: "/student",
    icon: GraduationCap,
    exact: true,
  },
  {
    title: "環境設定",
    href: "/student/preferences",
    icon: CalendarIcon,
  },
  {
    title: "設定",
    href: "/student/settings",
    icon: Settings,
  },
];

export default function Navbar() {
  const pathname = usePathname();
  const isTeacherRoute = pathname.startsWith("/teacher");
  const isStudentRoute = pathname.startsWith("/student");

  let navItems = dashboardNavItems;
  if (isTeacherRoute) {
    navItems = teacherNavItems;
  } else if (isStudentRoute) {
    navItems = studentNavItems;
  }
  let homeLink = "/dashboard";
  if (isTeacherRoute) {
    homeLink = "/teacher";
  } else if (isStudentRoute) {
    homeLink = "/student";
  }

  const isActive = (item: NavItemType): boolean => {
    if (item.exact) {
      return pathname === item.href;
    }
    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  };

  return (
    <header className="border-b">
      <div className="container mx-auto px-4 flex h-16 items-center">
        <div className="mr-8 font-semibold text-xl">
          <Link href={homeLink}>LightHouse</Link>
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
