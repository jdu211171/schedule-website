"use client";
import { StudentScheduleArrows } from "@/components/student-schedule/student-schedule-arrows";
import { StudentScheduleCalendar } from "@/components/student-schedule/student-schedule-calendar";
import { StudentScheduleMonthViewer } from "@/components/student-schedule/student-schedule-month-viewer";
import { StudentScheduleWeekViewer } from "@/components/student-schedule/student-schedule-week-viewer";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useClassSessions } from "@/hooks/useClassSessionQuery";
import { useSession } from "next-auth/react";
import { useState, useMemo } from "react"; // Added useMemo
import {
  format,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
} from "date-fns"; // Import date-fns functions

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
const getColor = (subjectId: string | null) => {
  if (!subjectId) return BgColors[0]; // Default color if subjectId is null
  const hash = subjectId
    .split("")
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return BgColors[hash % BgColors.length];
};
export default function StudentPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewType, setViewType] = useState<"WEEK" | "MONTH">("WEEK");
  const { data: session } = useSession();

  // Calculate startDate and endDate based on viewType and currentDate
  const { startDate, endDate } = useMemo(() => {
    let start;
    let end;
    if (viewType === "WEEK") {
      start = startOfWeek(currentDate, { weekStartsOn: 1 }); // Assuming week starts on Monday
      end = endOfWeek(currentDate, { weekStartsOn: 1 });
    } else {
      // MONTH
      start = startOfMonth(currentDate);
      end = endOfMonth(currentDate);
    }
    return {
      startDate: format(start, "yyyy-MM-dd"),
      endDate: format(end, "yyyy-MM-dd"),
    };
  }, [currentDate, viewType]);

  // IMPORTANT NOTE: session?.user?.id is typically the User.id.
  // The useClassSessions hook expects a Teacher.teacherId.
  // If these are different, this query might not fetch the correct data for the teacher.
  // You may need to:
  // 1. Ensure Teacher.teacherId is available in the session (e.g., session.user.teacherId).
  // 2. Or, fetch the Teacher.teacherId based on User.id before calling useClassSessions.
  const teacherIdForQuery = session?.user?.id || ""; // Placeholder: This might need adjustment

  const { data, error, isPending } = useClassSessions({
    teacherId: teacherIdForQuery, // Using the potentially problematic ID
    startDate,
    endDate,
  });

  const mappedLessons = useMemo(() => {
    if (!data?.data) {
      return [];
    }
    return data.data;
  }, [data?.data]);

  if (isPending) {
    return <div>Loading...</div>;
  }

  if (error) {
    console.error("Error fetching lessons:", error);
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
          lessons={data?.data} // Use mapped data
          weekDate={currentDate}
          daysOfWeek={daysOfWeek}
          getColor={getColor}
        />
      </TabsContent>
      <TabsContent value="MONTH">
        <StudentScheduleMonthViewer
          getColor={getColor}
          daysOfWeek={daysOfWeek}
          lessons={data?.data} // Use mapped data
          monthDate={currentDate}
          setViewType={setViewType}
          setCurrentDate={setCurrentDate}
        />
      </TabsContent>
    </Tabs>
  );
}
