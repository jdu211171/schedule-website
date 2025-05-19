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
  LucideIcon,
  GraduationCap,
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
import { useBranches } from "@/hooks/useBranchQuery";

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
// Update the BranchSelector component in Navbar.tsx

function BranchSelector() {
  const { data: session, update } = useSession();
  const [selectedBranchId, setSelectedBranchId] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  // Fetch all branches using the useBranches hook
  const { data: branchesData } = useBranches({ limit: 100 });
  const branches = branchesData?.data || [];

  // Initialize the selected branch from localStorage first, then from session
  React.useEffect(() => {
    const storedBranchId = localStorage.getItem("selectedBranchId");
    if (storedBranchId) {
      setSelectedBranchId(storedBranchId);
    } else if (session?.user?.selectedBranchId) {
      setSelectedBranchId(session.user.selectedBranchId);
      localStorage.setItem("selectedBranchId", session.user.selectedBranchId);
    } else if (branches.length > 0) {
      // Default to first branch if nothing is selected
      setSelectedBranchId(branches[0].branchId);
      localStorage.setItem("selectedBranchId", branches[0].branchId);
    }
  }, [session, branches]);

  // Skip rendering if user isn't authenticated or has appropriate role
  if (!session || !["ADMIN", "STAFF", "TEACHER", "STUDENT"].includes(session?.user?.role as string)) {
    return null;
  }

  const handleBranchChange = async (value: string) => {
    try {
      setIsLoading(true);

      // First update localStorage
      localStorage.setItem("selectedBranchId", value);
      setSelectedBranchId(value);

      // Then update the server-side session
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

      // Update client-side session
      await update({
        ...session,
        user: {
          ...session?.user,
          selectedBranchId: value,
        },
      });

      // Reload the page to refresh data with new branch context
      window.location.reload();
    } catch (error) {
      console.error("Error changing branch:", error);
      // Restore previous selection if there was an error
      if (session?.user?.selectedBranchId) {
        localStorage.setItem("selectedBranchId", session.user.selectedBranchId);
        setSelectedBranchId(session.user.selectedBranchId);
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (branches.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center mr-4">
      <Building className="mr-2 h-4 w-4" />
      <Select
        value={selectedBranchId || undefined}
        onValueChange={handleBranchChange}
        disabled={isLoading}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="支店を選択">
            {selectedBranchId ? branches.find(b => b.branchId === selectedBranchId)?.name : "支店を選択"}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {branches.map((branch) => (
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
