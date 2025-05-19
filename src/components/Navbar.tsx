// Modify Navbar.tsx to include a branch selector
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
  Building,
} from "lucide-react";
import UserProfileMenu from "@/components/user-profile-menu";
import { useSession } from "next-auth/react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ThemeToggle } from "./theme-toggle";

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

// Branch selector component
function BranchSelector() {
  const { data: session, update } = useSession();
  const [selectedBranchId, setSelectedBranchId] = React.useState<string>(
    session?.user?.selectedBranchId || ""
  );

  // Update local state when session changes
  React.useEffect(() => {
    if (session?.user?.selectedBranchId) {
      setSelectedBranchId(session.user.selectedBranchId);
      // Also store in localStorage for fetcher.ts to use
      localStorage.setItem("selectedBranchId", session.user.selectedBranchId);
    }
  }, [session?.user?.selectedBranchId]);
  console.log("BranchSelector session", session);
  // Skip rendering if user has no branches or isn't staff/admin
  if (
    !session?.user?.branches?.length ||
    session.user.branches.length === 1 ||
    !["ADMIN", "STAFF", "TEACHER", "STUDENT"].includes(session?.user?.role as string)
  ) {
    return null;
  }

  const handleBranchChange = async (value: string) => {
    try {
      const response = await fetch("/api/branch-selection", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ branchId: value }),
      });

      if (!response.ok) {
        throw new Error("Failed to update branch selection");
      }

      // Store selected branch in localStorage for fetcher.ts
      localStorage.setItem("selectedBranchId", value);

      // Update session
      await update({
        ...session,
        user: {
          ...session?.user,
          selectedBranchId: value,
        },
      });

      // Set local state
      setSelectedBranchId(value);

      // Reload the page to refresh data with new branch context
      window.location.reload();
    } catch (error) {
      console.error("Error changing branch:", error);
    }
  };

  return (
    <div className="flex items-center mr-4">
      <Building className="mr-2 h-4 w-4" />
      <Select value={selectedBranchId} onValueChange={handleBranchChange}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Select Branch" />
        </SelectTrigger>
        <SelectContent>
          {session.user.branches.map((branch) => (
            <SelectItem key={branch.branchId} value={branch.branchId}>
              {branch.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

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
      <div className="max-w-6xl mx-auto px-4 flex h-16 items-center">
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
          <BranchSelector />
          <UserProfileMenu />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
