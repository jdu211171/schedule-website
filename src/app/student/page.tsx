"use client";
import { StudentScheduleCalendar } from "@/components/student-schedule/student-schedule-calendar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StudentScheduleArrows } from "@/components/student-schedule/student-schedule-arrows";
import { Button } from "@/components/ui/button";
import { StudentScheduleMonthViewer } from "@/components/student-schedule/student-schedule-month-viewer";
import { useState } from "react";
import { StudentScheduleWeekViewer } from "@/components/student-schedule/student-schedule-week-viewer";
const lessons = [
  { name: "Math", date: "2025-05-06" },
  { name: "Biology", date: "2025-05-08" },
  { name: "IT", date: "2025-05-08" },
  { name: "Fizika", date: "2025-05-08" },
];
export default function StudentPage() {
  const [currentDate, setCurrentDate] = useState(new Date(2025, 4, 1));
  const [viewType, setViewType] = useState<"WEEK" | "MONTH">("WEEK");
  return (
    <Tabs
      defaultValue="WEEK"
      value={viewType}
      onValueChange={(val) => setViewType(val as "WEEK" | "MONTH")}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center justify-center gap-4">
          <Button
            variant={"outline"}
            onClick={() => setCurrentDate(new Date())}
          >
            TODAY
          </Button>
          <StudentScheduleArrows
            setCurrentDate={setCurrentDate}
            viewType={viewType}
          />
          <StudentScheduleCalendar
            setCurrentDate={setCurrentDate}
            currentDate={currentDate}
          />
        </div>
        <TabsList>
          <TabsTrigger
            value="WEEK"
            onClick={() => {
              setViewType("WEEK");
            }}
          >
            WEEK
          </TabsTrigger>
          <TabsTrigger
            value="MONTH"
            onClick={() => {
              setViewType("MONTH");
            }}
          >
            MONTH
          </TabsTrigger>
        </TabsList>
      </div>
      <TabsContent value="WEEK">
        <StudentScheduleWeekViewer lessons={lessons} weekDate={currentDate} />
      </TabsContent>
      <TabsContent value="MONTH">
        <StudentScheduleMonthViewer
          lessons={lessons}
          monthDate={currentDate}
          setViewType={setViewType}
          setCurrentDate={setCurrentDate}
        />
      </TabsContent>
    </Tabs>
  );
}
