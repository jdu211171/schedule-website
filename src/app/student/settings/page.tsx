import type React from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { StudentSettingsContent } from "@/components/student/student-settings/student-settings-content";
import { StudentSettingsSidebar } from "@/components/student/student-settings/student-settings-sidebar";

const Page: React.FC = () => {
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen w-full">
        <StudentSettingsSidebar />
        <StudentSettingsContent />
      </div>
    </SidebarProvider>
  );
};

export default Page;
