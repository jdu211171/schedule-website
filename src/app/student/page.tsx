"use client";
import { StudentScheduleArrows } from "@/components/student-schedule/student-schedule-arrows";
import { StudentScheduleCalendar } from "@/components/student-schedule/student-schedule-calendar";
import { StudentScheduleMonthViewer } from "@/components/student-schedule/student-schedule-month-viewer";
import { StudentScheduleWeekViewer } from "@/components/student-schedule/student-schedule-week-viewer";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useClassSessionsDateRange } from "@/hooks/useClassSessionQuery";
import {
  endOfMonth,
  endOfWeek,
  format,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { useSession } from "next-auth/react";
import { useMemo, useState } from "react";

const daysOfWeek = ["月", "火", "水", "木", "金", "土", "日"];
const getColor = (subjecType: "通常授業" | "特別授業") => {
  if (subjecType === "通常授業") {
    return {
      background: "bg-blue-100 dark:bg-blue-900/70",
      border: "border-blue-300 dark:border-blue-700",
      text: "text-blue-900 dark:text-blue-100",
      hover: "hover:bg-blue-200 dark:hover:bg-blue-800",
      iconColor: "text-black dark:text-white",
    };
  } else {
    return {
      background: "bg-red-100 dark:bg-red-900/70",
      border: "border-red-300 dark:border-red-700",
      text: "text-red-800 dark:text-red-100",
      hover: "hover:bg-red-200 dark:hover:bg-red-800",
      iconColor: "text-black dark:text-white",
    };
  }
};

export default function StudentPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewType, setViewType] = useState<"WEEK" | "MONTH">("WEEK");
  const { data: session } = useSession();
  // Calculate date ranges based on view type
  const { startDate, endDate } = useMemo(() => {
    if (viewType === "WEEK") {
      const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
      return {
        startDate: format(weekStart, "yyyy-MM-dd"),
        endDate: format(weekEnd, "yyyy-MM-dd"),
      };
    } else {
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);
      // For month view, get the full calendar view (including partial weeks)
      const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
      const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
      return {
        startDate: format(calendarStart, "yyyy-MM-dd"),
        endDate: format(calendarEnd, "yyyy-MM-dd"),
      };
    }
  }, [currentDate, viewType]);

  const { data, error, isPending } = useClassSessionsDateRange({
    startDate,
    endDate,
    studentId: session?.user?.userId || "",
  });

  if (isPending) {
    return <div>読み込み中...</div>;
  }

  if (error) {
    return <div>授業データの読み込みエラー</div>;
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
            今日
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
            週表示
          </TabsTrigger>
          <TabsTrigger
            value="MONTH"
            onClick={() => {
              setViewType("MONTH");
            }}
          >
            月表示
          </TabsTrigger>
        </TabsList>
      </div>
      <TabsContent value="WEEK">
        <StudentScheduleWeekViewer
          lessons={data.data}
          weekDate={currentDate}
          daysOfWeek={daysOfWeek}
          getColor={getColor}
        />
      </TabsContent>
      <TabsContent value="MONTH">
        <StudentScheduleMonthViewer
          getColor={getColor}
          daysOfWeek={daysOfWeek}
          lessons={data.data}
          monthDate={currentDate}
          setViewType={setViewType}
          setCurrentDate={setCurrentDate}
        />
      </TabsContent>
    </Tabs>
  );
}
