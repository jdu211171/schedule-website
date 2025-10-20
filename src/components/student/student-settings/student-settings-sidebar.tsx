"use client";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import {
  User,
  KeyRound,
  Bell,
  Shield,
  Settings,
  Palette,
  HelpCircle,
} from "lucide-react";
import { useStudentSettingsStore } from "./student-settings-store";

const settingsNavigation = [
  {
    title: "アカウント",
    items: [
      {
        title: "プロフィール",
        icon: User,
        id: "profile",
      },
      {
        title: "パスワードとセキュリティ",
        icon: KeyRound,
        id: "password",
      },
    ],
  },
  {
    title: "設定",
    items: [
      {
        title: "通知",
        icon: Bell,
        id: "notifications",
      },
      {
        title: "プライバシー",
        icon: Shield,
        id: "privacy",
      },
      {
        title: "外観",
        icon: Palette,
        id: "appearance",
      },
    ],
  },
  {
    title: "サポート",
    items: [
      {
        title: "ヘルプとサポート",
        icon: HelpCircle,
        id: "help",
      },
    ],
  },
];

export function StudentSettingsSidebar() {
  const { activeSection, setActiveSection } = useStudentSettingsStore();

  return (
    <Sidebar className="border-r">
      <SidebarHeader className="border-b px-6 py-4.5">
        <div className="flex items-center gap-2">
          <Settings className="h-6 w-6" />
          <h1 className="text-lg font-semibold">設定</h1>
        </div>
      </SidebarHeader>
      <SidebarContent className="px-2">
        {settingsNavigation.map((group) => (
          <SidebarGroup key={group.title}>
            <SidebarGroupLabel className="px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {group.title}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      onClick={() => setActiveSection(item.id)}
                      isActive={activeSection === item.id}
                      className="w-full justify-start px-4 py-3"
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}
