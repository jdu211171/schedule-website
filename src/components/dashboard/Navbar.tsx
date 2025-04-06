"use client";

import { memo, useCallback } from "react";
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
  LogOut,
  LucideIcon
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSession, signOut } from "next-auth/react";

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
    exact: true 
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

const studentNavItems: NavItemType[] = [
  {
    title: "設定",
    href: "/student/settings",
    icon: Settings,
    exact: true
  },
  {
    title: "プリファレンス",
    href: "/student/preferences",
    icon: LayoutDashboard,
  },
];

const teacherNavItems: NavItemType[] = [
  {
    title: "設定",
    href: "/teacher/settings",
    icon: Settings,
    exact: true
  },
  {
    title: "プリファレンス",
    href: "/teacher/preferences",
    icon: LayoutDashboard,
  },
];

interface NavItemProps {
  item: NavItemType;
  isActive: boolean;
}

const NavItem = memo(({ item, isActive }: NavItemProps) => {
  return (
    <Button 
      variant="ghost" 
      size="sm" 
      asChild
      className={cn(
        isActive ? "bg-accent text-accent-foreground" : "hover:bg-muted"
      )}
    >
      <Link href={item.href} className="flex items-center">
        <item.icon className="mr-2 h-4 w-4" />
        <span>{item.title}</span>
      </Link>
    </Button>
  );
});
NavItem.displayName = "NavItem";

interface NavbarProps {
  type?: 'dashboard' | 'student' | 'teacher';
}

const Navbar = ({ type = 'dashboard' }: NavbarProps) => {
  const pathname = usePathname();
  const { data: session } = useSession();

  const currentNavItems = 
    type === 'student' ? studentNavItems : 
    type === 'teacher' ? teacherNavItems : 
    navItems;

  const isActive = useCallback((item: NavItemType): boolean => {
    if (item.exact) {
      return pathname === item.href;
    }
    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  }, [pathname]);

  const handleSignOut = useCallback(() => {
    signOut();
  }, []);

  return (
    <header className="border-b">
      <div className="max-w-6xl mx-auto px-4 flex h-16 items-center">
        <div className="mr-8 font-semibold text-xl">
          <Link href={type === 'dashboard' ? "/dashboard" : `/${type}`}>LightHouse</Link>
        </div>

        <nav className="flex flex-1 items-center space-x-1 lg:space-x-2">
          {currentNavItems.map((item) => (
            <NavItem 
              key={item.href}
              item={item}
              isActive={isActive(item)}
            />
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
                    {session.user?.name ? session.user.name.slice(0, 2).toUpperCase() : "U"}
                  </AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  <Link href="/profile" className="flex items-center w-full">
                    プロフィール
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleSignOut}>
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