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
  // {
  //   title: "先生",
  //   href: "/teacher",
  //   icon: LayoutDashboard,
  //   exact: true,
  // },
  // {
  //   title: "環境設定",
  //   href: "/teacher/preferences",
  //   icon: CalendarIcon,
  // },
  // {
  //   title: "設定",
  //   href: "/teacher/settings",
  //   icon: Settings,
  // },
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
  const [selectedBranchId, setSelectedBranchId] = React.useState<string | null>(
    null
  );
  const [isLoading, setIsLoading] = React.useState(false);

  // Use branches from session instead of making an API request
  const branches = React.useMemo(() => session?.user?.branches || [], [session]);

  const handleBranchChange = React.useCallback(async (value: string) => {
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

      // Update client-side session with the new selectedBranchId
      await update({
        user: {
          selectedBranchId: value,
        },
      });

      // Small delay to ensure session update is processed before reload
      setTimeout(() => {
        window.location.reload();
      }, 100);
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
  }, [session, update]);

  // Initialize the selected branch from session first, then localStorage
  React.useEffect(() => {
    // If user has a selected branch in session, prioritize that
    if (session?.user?.selectedBranchId && branches.some(b => b.branchId === session.user!.selectedBranchId)) {
      setSelectedBranchId(session.user.selectedBranchId);
      // Sync localStorage with session
      localStorage.setItem("selectedBranchId", session.user.selectedBranchId);
      return;
    }

    // Otherwise, check localStorage for a valid stored branch
    const storedBranchId = localStorage.getItem("selectedBranchId");
    const isValidStored = storedBranchId && branches.some(b => b.branchId === storedBranchId);
    if (isValidStored) {
      setSelectedBranchId(storedBranchId);
    } else if (branches.length > 0) {
      // Default to first branch if nothing is selected
      const firstBranchId = branches[0].branchId;
      setSelectedBranchId(firstBranchId);
      localStorage.setItem("selectedBranchId", firstBranchId);
    }
  }, [session, branches]);

  // Separate effect to handle session sync when there's a mismatch
  React.useEffect(() => {
    if (
      selectedBranchId &&
      session?.user?.selectedBranchId &&
      selectedBranchId !== session.user.selectedBranchId &&
      branches.some(b => b.branchId === selectedBranchId)
    ) {
      // Update session to match the local state without triggering a reload
      update({
        ...session,
        user: {
          ...session?.user,
          selectedBranchId: selectedBranchId,
        },
      });
    }
  }, [selectedBranchId, session, update, branches]);

  // Skip rendering if user isn't authenticated or has appropriate role
  if (
    !session ||
    !["ADMIN", "STAFF", "TEACHER", "STUDENT"].includes(
      session?.user?.role as string
    )
  ) {
    return null;
  }

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
            {selectedBranchId
              ? branches.find((b) => b.branchId === selectedBranchId)?.name
              : "支店を選択"}
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
