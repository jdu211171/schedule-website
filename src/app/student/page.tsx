"use client";
import { StudentScheduleArrows } from "@/components/student-schedule/student-schedule-arrows";
import { StudentScheduleCalendar } from "@/components/student-schedule/student-schedule-calendar";
import { StudentScheduleMonthViewer } from "@/components/student-schedule/student-schedule-month-viewer";
import { StudentScheduleWeekViewer } from "@/components/student-schedule/student-schedule-week-viewer";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import createStudentClassSessionsQueryOptions from "@/hooks/useStudentClassSessionQuery";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useState } from "react";
export interface Lesson {
  classId: string;
  date: string;
  startTime: string;
  endTime: string;
  duration: string;
  notes: string;
  booth: {
    boothId: string;
    name: string;
  };
  subject: {
    subjectId: string;
    name: string;
  };
  student: {
    studentId: string;
    name: string;
  };
  teacher: {
    teacherId: string;
    name: string;
  };
}
const daysOfWeek = ["月", "火", "水", "木", "金", "土", "日"];
const BgColors = ["#90b8ff", "#b99af4", "#ff99c2", "#ffb285", "#ffd666"];
const getColor = (subjectId: string) => {
  const hash = subjectId
    .split("")
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return BgColors[hash % BgColors.length];
};
export default function StudentPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewType, setViewType] = useState<"WEEK" | "MONTH">("WEEK");
  const { data: session } = useSession();
  const { data, error, isPending } = useQuery(
    createStudentClassSessionsQueryOptions(session?.user?.userId ?? "")
  );
  if (isPending) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error loading lessons</div>;
  }
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
            onClick={() => {
              setCurrentDate(new Date());
            }}
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
        <StudentScheduleWeekViewer
          lessons={data?.data}
          weekDate={currentDate}
          daysOfWeek={daysOfWeek}
          getColor={getColor}
        />
      </TabsContent>
      <TabsContent value="MONTH">
        <StudentScheduleMonthViewer
          getColor={getColor}
          daysOfWeek={daysOfWeek}
          lessons={data?.data}
          monthDate={currentDate}
          setViewType={setViewType}
          setCurrentDate={setCurrentDate}
        />
      </TabsContent>
    </Tabs>
  );
}
