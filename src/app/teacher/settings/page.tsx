import type React from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { TeacherSettingsContent } from "@/components/teacher/teacher-settings/teacher-settings-content";
import { TeacherSettingsSidebar } from "@/components/teacher/teacher-settings/teacher-settings-sidebar";

const Page: React.FC = () => {
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen w-full">
        <TeacherSettingsSidebar />
        <TeacherSettingsContent />
      </div>
    </SidebarProvider>
  );
};

export default Page;
