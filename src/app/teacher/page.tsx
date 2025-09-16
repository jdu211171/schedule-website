"use client";
import { StudentScheduleArrows } from "@/components/student-schedule/student-schedule-arrows";
import { StudentScheduleCalendar } from "@/components/student-schedule/student-schedule-calendar";
import { StudentScheduleMonthViewer } from "@/components/student-schedule/student-schedule-month-viewer";
import { StudentScheduleWeekViewer } from "@/components/student-schedule/student-schedule-week-viewer";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTeacherClassSessionsDateRange } from "@/hooks/useClassSessionQuery";
import {
  endOfMonth,
  endOfWeek,
  format,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { useMemo, useState } from "react";
import { SPECIAL_CLASS_COLOR_CLASSES } from "@/lib/special-class-constants";

const daysOfWeek = ["月", "火", "水", "木", "金", "土", "日"];
const getColor = (subjecType: "通常授業" | "特別授業") => {
  if (subjecType === "通常授業") {
    return {
      background: "bg-green-100 dark:bg-green-900/70",
      border: "border-green-300 dark:border-green-700",
      text: "text-green-900 dark:text-green-100",
      hover: "hover:bg-green-200 dark:hover:bg-green-800",
      iconColor: "text-green-600 dark:text-green-400",
    };
  }

  return {
    background: SPECIAL_CLASS_COLOR_CLASSES.background,
    border: SPECIAL_CLASS_COLOR_CLASSES.border,
    text: SPECIAL_CLASS_COLOR_CLASSES.text,
    hover: SPECIAL_CLASS_COLOR_CLASSES.hover,
    iconColor: SPECIAL_CLASS_COLOR_CLASSES.icon,
  };
};

export default function TeacherPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewType, setViewType] = useState<"WEEK" | "MONTH">("WEEK");

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
      const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
      const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
      return {
        startDate: format(calendarStart, "yyyy-MM-dd"),
        endDate: format(calendarEnd, "yyyy-MM-dd"),
      };
    }
  }, [currentDate, viewType]);

  const { data, error, isPending } = useTeacherClassSessionsDateRange({
    startDate,
    endDate,
  });

  if (isPending) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-2"></div>
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
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 p-4 sm:p-0">
          
          <div className="flex items-center gap-3 order-2 sm:order-1 ml-2 sm:ml-4">
            <StudentScheduleArrows
              setCurrentDate={setCurrentDate}
              viewType={viewType}
              position="left"
            />
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setCurrentDate(new Date());
              }}
              className="text-sm px-3 py-2 rounded-md"
            >
              今日
            </Button>
            
            <StudentScheduleArrows
              setCurrentDate={setCurrentDate}
              viewType={viewType}
              position="right"
            />
            
            <div className="hidden sm:block ml-2">
              <StudentScheduleCalendar
                setCurrentDate={setCurrentDate}
                currentDate={currentDate}
              />
            </div>
          </div>

          <TabsList className="order-1 sm:order-2 w-full sm:w-auto">
            <TabsTrigger
              value="WEEK"
              onClick={() => {
                setViewType("WEEK");
              }}
              className="flex-1 sm:flex-none"
            >
              週間
            </TabsTrigger>
            <TabsTrigger
              value="MONTH"
              onClick={() => {
                setViewType("MONTH");
              }}
              className="flex-1 sm:flex-none"
            >
              月間
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="sm:hidden px-4 mb-4">
          <StudentScheduleCalendar
            setCurrentDate={setCurrentDate}
            currentDate={currentDate}
          />
        </div>

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
