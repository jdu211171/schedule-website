"use client";
import { StudentScheduleArrows } from "@/components/student-schedule/student-schedule-arrows";
import { StudentScheduleCalendar } from "@/components/student-schedule/student-schedule-calendar";
import { StudentScheduleMonthViewer } from "@/components/student-schedule/student-schedule-month-viewer";
import { StudentScheduleWeekViewer } from "@/components/student-schedule/student-schedule-week-viewer";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useStudentClassSessionsDateRange } from "@/hooks/useClassSessionQuery";
import {
  endOfMonth,
  endOfWeek,
  format,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { useMemo, useState } from "react";

const daysOfWeek = ["月", "火", "水", "木", "金", "土", "日"];
const getColor = (subjecType: "通常授業" | "特別授業") => {
  if (subjecType === "通常授業") {
    return {
      background: "bg-blue-100 dark:bg-blue-900/70",
      border: "border-blue-300 dark:border-blue-700",
      text: "text-blue-900 dark:text-blue-100",
      hover: "hover:bg-blue-200 dark:hover:bg-blue-800",
      iconColor: "text-blue-600 dark:text-blue-400",
    };
  } else {
    return {
      background: "bg-red-100 dark:bg-red-900/70",
      border: "border-red-300 dark:border-red-700",
      text: "text-red-800 dark:text-red-100",
      hover: "hover:bg-red-200 dark:hover:bg-red-800",
      iconColor: "text-red-600 dark:text-red-400",
    };
  }
};

export default function StudentPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewType, setViewType] = useState<"WEEK" | "MONTH">("WEEK");

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

  const { data, error, isPending } = useStudentClassSessionsDateRange({
    startDate,
    endDate,
  });

  if (isPending) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <div className="text-gray-600 dark:text-gray-400">読み込み中...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center text-red-600 dark:text-red-400">
          <div className="text-lg font-semibold mb-2">エラーが発生しました</div>
          <div>授業データの読み込みに失敗しました</div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Tabs
        defaultValue="WEEK"
        value={viewType}
        onValueChange={(val) => setViewType(val as "WEEK" | "MONTH")}
        className="w-full"
      >
        {/* Header Controls */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 p-4 sm:p-0">
          {/* Navigation Controls */}
          <div className="flex items-center gap-2 order-2 sm:order-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setCurrentDate(new Date());
              }}
              className="text-sm px-3 py-2"
            >
              今日
            </Button>
            <StudentScheduleArrows
              setCurrentDate={setCurrentDate}
              viewType={viewType}
            />
            <div className="hidden sm:block">
              <StudentScheduleCalendar
                setCurrentDate={setCurrentDate}
                currentDate={currentDate}
              />
            </div>
          </div>

          {/* View Toggle */}
          <TabsList className="order-1 sm:order-2 w-full sm:w-auto">
            <TabsTrigger
              value="WEEK"
              onClick={() => {
                setViewType("WEEK");
              }}
              className="flex-1 sm:flex-none"
            >
              週表示
            </TabsTrigger>
            <TabsTrigger
              value="MONTH"
              onClick={() => {
                setViewType("MONTH");
              }}
              className="flex-1 sm:flex-none"
            >
              月表示
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Mobile Calendar Button */}
        <div className="sm:hidden px-4 mb-4">
          <StudentScheduleCalendar
            setCurrentDate={setCurrentDate}
            currentDate={currentDate}
          />
        </div>

        {/* Content */}
        <div className="px-2 sm:px-4">
          <TabsContent value="WEEK" className="mt-0">
            <StudentScheduleWeekViewer
              lessons={data?.data || []}
              weekDate={currentDate}
              daysOfWeek={daysOfWeek}
              getColor={getColor}
            />
          </TabsContent>
          <TabsContent value="MONTH" className="mt-0">
            <StudentScheduleMonthViewer
              getColor={getColor}
              daysOfWeek={daysOfWeek}
              lessons={data?.data || []}
              monthDate={currentDate}
              setViewType={setViewType}
              setCurrentDate={setCurrentDate}
            />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
