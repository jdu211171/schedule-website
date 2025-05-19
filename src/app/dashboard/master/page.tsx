"use client";

import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { BoothTable } from "@/components/booth/booth-table";
import { EventTable } from "@/components/event/event-table";
import { StudentTypeTable } from "@/components/student-types/student-type-table";
import { ClassTypeTable } from "@/components/class-type/class-type-table";
import { SubjectTable } from "@/components/subject/subject-table";
import { StaffTable } from "@/components/staff/staff-table";

// Storage key for tab persistence
const ACTIVE_TAB_KEY = "masterpage_active_tab";

export default function MasterDataPage() {
  // Initialize with a default value, will be updated after mount
  const [activeTab, setActiveTab] = useState("staff");
  const [isInitialized, setIsInitialized] = useState(false);

  // On component mount, load the saved tab from localStorage
  useEffect(() => {
    const savedTab = localStorage.getItem(ACTIVE_TAB_KEY);
    if (savedTab) {
      setActiveTab(savedTab);
    }
    setIsInitialized(true);
  }, []);

  // Handle tab change and save to localStorage
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    localStorage.setItem(ACTIVE_TAB_KEY, value);
  };

  // Prevent rendering with default value during SSR/hydration to avoid flicker
  if (!isInitialized) {
    return null; // Show nothing during initial render to prevent flicker
  }

  return (
    <div className="space-y-4">
      <Tabs
        defaultValue={activeTab}
        value={activeTab}
        onValueChange={handleTabChange}
        className="w-full"
      >
        <TabsList className="w-full max-w-2xl">
          <TabsTrigger value="branches">支店</TabsTrigger>
          <TabsTrigger value="staff">スタッフ</TabsTrigger>
          <TabsTrigger value="students">生徒</TabsTrigger>
          <TabsTrigger value="teachers">教師</TabsTrigger>
          <TabsTrigger value="subjects">科目</TabsTrigger>
          <TabsTrigger value="studentTypes">生徒タイプ</TabsTrigger>
          <TabsTrigger value="booths">ブース</TabsTrigger>
          <TabsTrigger value="classTypes">授業タイプ</TabsTrigger>
          <TabsTrigger value="events">イベント</TabsTrigger>
        </TabsList>

        <Card className="mt-4 p-4">
          <TabsContent value="branches" className="mt-0">
            {/* placeholder for branches data table */}
          </TabsContent>
          <TabsContent value="staff" className="mt-0">
            <StaffTable />
          </TabsContent>
          <TabsContent value="students" className="mt-0">
            {/* placeholder for students data table */}
          </TabsContent>
          <TabsContent value="teachers" className="mt-0">
            {/* placeholder for teachers data table */}
          </TabsContent>
          <TabsContent value="subjects" className="mt-0">
            <SubjectTable />
          </TabsContent>
          <TabsContent value="studentTypes" className="mt-0">
            <StudentTypeTable />
          </TabsContent>
          <TabsContent value="booths" className="mt-0">
            <BoothTable />
          </TabsContent>
          <TabsContent value="classTypes" className="mt-0">
            <ClassTypeTable />
          </TabsContent>
          <TabsContent value="events" className="mt-0">
            <EventTable />
          </TabsContent>
        </Card>
      </Tabs>
    </div>
  );
}
