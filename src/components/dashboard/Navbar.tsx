"use client";

import * as React from "react";
import Link from "next/link";
import {usePathname} from "next/navigation";
import {cn} from "@/lib/utils";
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
    LogOut,
    LucideIcon
} from "lucide-react";
import {Avatar, AvatarFallback, AvatarImage} from "@/components/ui/avatar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {useSession, signOut} from "next-auth/react";

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

export default function Navbar() {
    const pathname = usePathname();
    const {data: session} = useSession();

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
                                            <item.icon className="mr-2 h-4 w-4"/>
                                            {item.title}
                                        </div>
                                    </NavigationMenuLink>
                                </Link>
                            </NavigationMenuItem>
                        ))}
                    </NavigationMenuList>
                </NavigationMenu>

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
                                <DropdownMenuItem asChild>
                                    <Link href="/profile" className="flex items-center w-full">
                                        プロフィール
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => signOut()}>
                  <span className="flex items-center">
                    <LogOut className="mr-2 h-4 w-4"/>
                    ログアウト
                  </span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    ) : (<Link href="/auth/login"
                               className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2">
                            ログイン
                        </Link>
                    )}
                </div>
            </div>
        </header>
    );
}