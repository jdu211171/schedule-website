import React, { useState } from "react";
import { getCurrentDateAdjusted } from "../date";
import CalendarWeek from "./calendar-week";
import { WeekSelector } from "./week-selector";
import { ExtendedClassSessionWithRelations, DayFilters } from "@/hooks/useClassSessionQuery";
import { LessonDialog } from "../DayCalendar/lesson-dialog";
import { useBooths } from '@/hooks/useBoothQuery';
import { useTeachers } from '@/hooks/useTeacherQuery';
import { useStudents } from '@/hooks/useStudentQuery';
import { useSubjects } from '@/hooks/useSubjectQuery';

type AdminCalendarWeekProps = {
  currentDate?: Date;
  mode?: "view" | "create";
  onLessonSelect?: (lesson: ExtendedClassSessionWithRelations) => void;
};

const AdminCalendarWeek: React.FC<AdminCalendarWeekProps> = ({
  currentDate = new Date(),
  mode = "view",
  onLessonSelect,
}) => {
  const [selectedWeeks, setSelectedWeeks] = useState<Date[]>([
    getCurrentDateAdjusted(),
  ]);

  const [selectedLesson, setSelectedLesson] = useState<ExtendedClassSessionWithRelations | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'view' | 'edit'>('view');
  const [filters, setFilters] = useState<DayFilters>({});

  const { data: boothsResponse } = useBooths();
  const { data: teachersResponse } = useTeachers();
  const { data: studentsResponse } = useStudents();
  const { data: subjectsResponse } = useSubjects();

  const booths = boothsResponse?.data || [];
  const teachers = teachersResponse?.data || [];
  const students = studentsResponse?.data || [];
  const subjects = subjectsResponse?.data || [];

  const handleDaySelect = (date: Date, isSelected: boolean) => {
    setSelectedWeeks((prev) => {
      if (isSelected) {
        const weekAlreadySelected = prev.some(
          (existingDate) => 
            existingDate.getTime() === date.getTime()
        );
        
        if (weekAlreadySelected) return prev;
        
        const newWeeks = [...prev, date];
        return newWeeks.sort((a, b) => a.getTime() - b.getTime());
      } else {
        return prev.filter((d) => d.getTime() !== date.getTime());
      }
    });
  };

  const handleLessonSelect = (lesson: ExtendedClassSessionWithRelations) => {
    if (onLessonSelect) {
      onLessonSelect(lesson);
    }
  };

  const handleEdit = (lesson: ExtendedClassSessionWithRelations) => {
    setSelectedLesson(lesson);
    setDialogMode('edit');
    setDialogOpen(true);
  };

  const handleDelete = (lessonId: string) => {
    setDialogOpen(false);
    setSelectedLesson(null);
  };

  const handleSave = (lessonId: string, wasSeriesEdit?: boolean) => {
    console.log(`Lesson ${lessonId} saved. Series edit: ${wasSeriesEdit}`);
    setDialogOpen(false);
    setSelectedLesson(null);
  };

  return (
    <div className="w-full flex flex-col gap-2 my-2">
      <div className="flex flex-col sm:flex-row justify-between items-center sm:space-y-0 mx-5">
        <h2 className="text-xl font-semibold text-foreground dark:text-foreground">
        </h2>
        <WeekSelector
          selectedWeeks={selectedWeeks}
          onSelectWeek={handleDaySelect}
        />
      </div>

      <CalendarWeek 
        selectedWeeks={selectedWeeks} 
        onLessonSelect={handleLessonSelect}
        onEdit={handleEdit}
        onDelete={handleDelete}
        filters={filters}
        onFiltersChange={setFilters}
      />

      {selectedLesson && (
        <LessonDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          lesson={selectedLesson}
          mode={dialogMode}
          onModeChange={setDialogMode}
          onSave={handleSave}
          onDelete={handleDelete}
          booths={booths}
          teachers={teachers}
          students={students}
          subjects={subjects}
        />
      )}
    </div>
  );
};

export default AdminCalendarWeek;