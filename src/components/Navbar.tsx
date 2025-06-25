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
  Menu,
} from "lucide-react";

// Custom LINE icon component using text
const LineTextIcon = React.forwardRef<
  HTMLDivElement,
  React.HTMLProps<HTMLDivElement> & { className?: string }
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("flex items-center justify-center h-4 w-4", className)} {...props}>
    <span className="text-[8px] font-bold bg-[#00B900] text-white px-0.5 py-0.5 rounded leading-none">
      LINE
    </span>
  </div>
));
LineTextIcon.displayName = "LineTextIcon";

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
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useUserBranches } from "@/hooks/useBranchQuery";

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
  {
    title: "LINE通知",
    href: "/dashboard/line-test",
    icon: Settings, // Placeholder - will be replaced in render
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
  // Hidden navigation items - pages still exist but not shown in navbar
  // {
  //   title: "環境設定",
  //   href: "/student/preferences",
  //   icon: CalendarIcon,
  // },
  // {
  //   title: "設定",
  //   href: "/student/settings",
  //   icon: Settings,
  // },
];

// Branch selector component
function BranchSelector() {
  const { data: session, update } = useSession();
  const [selectedBranchId, setSelectedBranchId] = React.useState<string | null>(
    null
  );
  const [isLoading, setIsLoading] = React.useState(false);

  const { data: branches = [], isLoading: isBranchesLoading } = useUserBranches();

  const handleBranchChange = React.useCallback(
    async (value: string) => {
      try {
        setIsLoading(true);

        localStorage.setItem("selectedBranchId", value);
        setSelectedBranchId(value);

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

        await update({
          user: {
            selectedBranchId: value,
          },
        });

        setTimeout(() => {
          window.location.reload();
        }, 100);
      } catch (error) {
        console.error("Error changing branch:", error);
        if (session?.user?.selectedBranchId) {
          localStorage.setItem(
            "selectedBranchId",
            session.user.selectedBranchId
          );
          setSelectedBranchId(session.user.selectedBranchId);
        }
      } finally {
        setIsLoading(false);
      }
    },
    [session, update]
  );

  React.useEffect(() => {
    if (
      session?.user?.selectedBranchId &&
      branches.some((b) => b.branchId === session.user!.selectedBranchId)
    ) {
      setSelectedBranchId(session.user.selectedBranchId);
      localStorage.setItem("selectedBranchId", session.user.selectedBranchId);
      return;
    }

    const storedBranchId = localStorage.getItem("selectedBranchId");
    const isValidStored =
      storedBranchId && branches.some((b) => b.branchId === storedBranchId);
    if (isValidStored) {
      setSelectedBranchId(storedBranchId);
    } else if (branches.length > 0) {
      const firstBranchId = branches[0].branchId;
      setSelectedBranchId(firstBranchId);
      localStorage.setItem("selectedBranchId", firstBranchId);
    }
  }, [session, branches]);

  React.useEffect(() => {
    if (
      selectedBranchId &&
      session?.user?.selectedBranchId &&
      selectedBranchId !== session.user.selectedBranchId &&
      branches.some((b) => b.branchId === selectedBranchId)
    ) {
      update({
        ...session,
        user: {
          ...session?.user,
          selectedBranchId: selectedBranchId,
        },
      });
    }
  }, [selectedBranchId, session, update, branches]);

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
    <div className="flex items-center">
      <Building className="mr-2 h-4 w-4 flex-shrink-0" />
      <Select
        value={selectedBranchId || undefined}
        onValueChange={handleBranchChange}
        disabled={isLoading || isBranchesLoading}
      >
        <SelectTrigger className="w-full sm:w-[180px] text-sm">
          <SelectValue placeholder="校舎を選択">
            {selectedBranchId
              ? branches.find((b) => b.branchId === selectedBranchId)?.name
              : "校舎を選択"}
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

// Mobile Navigation Menu Component
function MobileNavMenu({
  navItems,
  homeLink,
  isActive,
}: {
  navItems: NavItemType[];
  homeLink: string;
  isActive: (item: NavItemType) => boolean;
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" className="md:hidden p-2">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle navigation menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[300px] sm:w-[400px]">
        <SheetHeader>
          <SheetTitle>
            <Link href={homeLink} onClick={() => setOpen(false)}>
              LightHouse
            </Link>
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          <div className="px-2">
            <BranchSelector />
          </div>

          <nav className="space-y-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center space-x-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive(item)
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                {item.href === "/dashboard/line-test" ? (
                  <span className="text-[8px] font-bold bg-[#00B900] text-white px-1 py-0.5 rounded h-4 w-4 flex items-center justify-center">
                    LINE
                  </span>
                ) : (
                  <item.icon className="h-4 w-4" />
                )}
                <span>{item.title}</span>
              </Link>
            ))}
          </nav>

          <div className="border-t pt-4 space-y-4">
            <div className="px-2">
              <div className="text-sm text-muted-foreground mb-2">
                アカウント
              </div>
              <UserProfileMenu />
            </div>
            <div className="px-2">
              <div className="text-sm text-muted-foreground mb-2">テーマ</div>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
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
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="container mx-auto sm:px-6">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center space-x-4 lg:space-x-8">
            <div className="flex-shrink-0">
              <Link
                href={homeLink}
                className="font-semibold text-xl hover:opacity-80 transition-opacity"
              >
                LightHouse
              </Link>
            </div>

            <NavigationMenu className="hidden md:flex">
              <NavigationMenuList>
                {navItems.map((item) => (
                  <NavigationMenuItem key={item.href}>
                    <Link href={item.href} legacyBehavior passHref>
                      <NavigationMenuLink
                        className={cn(
                          navigationMenuTriggerStyle(),
                          "text-sm font-medium transition-colors",
                          isActive(item)
                            ? "bg-accent text-accent-foreground"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        <div className="flex items-center space-x-2">
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                        </div>
                      </NavigationMenuLink>
                    </Link>
                  </NavigationMenuItem>
                ))}
              </NavigationMenuList>
            </NavigationMenu>
          </div>

          <div className="hidden md:flex items-center space-x-4">
            <BranchSelector />
            <div className="flex items-center space-x-2">
              <UserProfileMenu />
              <ThemeToggle />
            </div>
          </div>

          <MobileNavMenu
            navItems={navItems}
            homeLink={homeLink}
            isActive={isActive}
          />
        </div>
      </div>
    </header>
  );
}
