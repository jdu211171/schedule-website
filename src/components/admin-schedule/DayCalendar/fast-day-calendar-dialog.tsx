"use client";

import React, { useMemo, useState, useCallback } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { DayCalendar } from "./day-calendar";
import { getDateKey } from "../date";
import { useBooths } from "@/hooks/useBoothQuery";
import { useTeachers } from "@/hooks/useTeacherQuery";
import { useStudents } from "@/hooks/useStudentQuery";
import { useSubjects } from "@/hooks/useSubjectQuery";
import {
  useMultipleDaysClassSessions,
  ExtendedClassSessionWithRelations,
} from "@/hooks/useClassSessionQuery";
import { LessonDialog } from "./lesson-dialog";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: string | Date; // YYYY-MM-DD or Date
  onAfterChange?: () => void;
};

const TIME_SLOTS: {
  index: number;
  start: string;
  end: string;
  display: string;
  shortDisplay: string;
}[] = Array.from({ length: 57 }, (_el, i) => {
  const hours = Math.floor(i / 4) + 8;
  const startMinutes = (i % 4) * 15;
  let endHours, endMinutes;
  if (startMinutes === 45) {
    endHours = hours + 1;
    endMinutes = 0;
  } else {
    endHours = hours;
    endMinutes = startMinutes + 15;
  }
  return {
    index: i,
    start: `${hours.toString().padStart(2, "0")}:${startMinutes.toString().padStart(2, "0")}`,
    end: `${endHours.toString().padStart(2, "0")}:${endMinutes.toString().padStart(2, "0")}`,
    display: `${hours}:${startMinutes === 0 ? "00" : startMinutes} - ${endHours}:${endMinutes === 0 ? "00" : endMinutes}`,
    shortDisplay: i % 4 === 0 ? `${hours}:00` : "",
  };
});

export default function FastDayCalendarDialog({
  open,
  onOpenChange,
  date,
  onAfterChange,
}: Props) {
  const day = useMemo(
    () => (typeof date === "string" ? new Date(`${date}T12:00:00`) : date),
    [date]
  );
  const dateKey = useMemo(() => getDateKey(day), [day]);

  const { data: boothsRes } = useBooths({ limit: 100, status: true });
  const booths = boothsRes?.data || [];

  const classSessionQueries = useMultipleDaysClassSessions([dateKey], {});
  const sessions = (classSessionQueries[0]?.data?.data ||
    []) as ExtendedClassSessionWithRelations[];
  const isFetching = Boolean(
    classSessionQueries[0]?.isFetching || classSessionQueries[0]?.isLoading
  );

  const { data: teachersRes } = useTeachers();
  const { data: studentsRes } = useStudents();
  const { data: subjectsRes } = useSubjects();
  const teachers = teachersRes?.data || [];
  const students = studentsRes?.data || [];
  const subjects = subjectsRes?.data || [];

  const [selectedLesson, setSelectedLesson] =
    useState<ExtendedClassSessionWithRelations | null>(null);
  const [dialogMode, setDialogMode] = useState<"view" | "edit">("edit");

  const onLessonClick = useCallback(
    (lesson: ExtendedClassSessionWithRelations) => {
      setSelectedLesson(lesson);
      setDialogMode("edit");
    },
    []
  );

  const onCreateLesson = useCallback(() => {
    toast.info("このビューでは新規作成は未対応です");
  }, []);

  const formattedDate = useMemo(
    () => format(day, "yyyy年MM月dd日 (eee)", { locale: ja }),
    [day]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-[min(1200px,100vw-2rem)] sm:max-w-[1200px] max-h-[92vh] overflow-hidden p-3 sm:p-4 flex flex-col"
        aria-label={`${formattedDate} の日次カレンダー`}
      >
        <div className="flex-1 min-h-0">
          <DayCalendar
            date={day}
            booths={booths}
            timeSlots={TIME_SLOTS}
            classSessions={sessions}
            onLessonClick={onLessonClick}
            onCreateLesson={onCreateLesson}
            isFetching={isFetching}
            preserveScrollOnFetch
            hideHeader
          />
        </div>

        {selectedLesson && (
          <LessonDialog
            open={!!selectedLesson}
            onOpenChange={(o) => {
              if (!o) setSelectedLesson(null);
            }}
            lesson={selectedLesson}
            mode={dialogMode}
            onModeChange={setDialogMode}
            onSave={async () => {
              setSelectedLesson(null);
              // refetch day data
              await classSessionQueries[0]?.refetch?.();
              onAfterChange?.();
            }}
            onDelete={async () => {
              setSelectedLesson(null);
              await classSessionQueries[0]?.refetch?.();
              onAfterChange?.();
            }}
            booths={booths.map((b) => ({ boothId: b.boothId, name: b.name }))}
            teachers={teachers}
            students={students}
            subjects={subjects}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
