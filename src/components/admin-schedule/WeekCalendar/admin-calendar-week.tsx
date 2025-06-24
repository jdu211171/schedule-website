import {
  ExtendedClassSessionWithRelations,
  DayFilters,
} from "@/hooks/useClassSessionQuery";
import React, { useCallback, useEffect, useState } from "react";
import { getCurrentDateAdjusted } from "../date";
import { startOfWeek } from "date-fns";
import CalendarWeek from "./calendar-week";
import { WeekSelector } from "./week-selector";
import { LessonDialog } from "../DayCalendar/lesson-dialog";
import { CreateLessonDialog } from "../DayCalendar/create-lesson-dialog";
import { useBooths } from "@/hooks/useBoothQuery";
import { useTeachers } from "@/hooks/useTeacherQuery";
import { useStudents } from "@/hooks/useStudentQuery";
import { useSubjects } from "@/hooks/useSubjectQuery";
import {
  NewClassSessionData,
  CreateClassSessionWithConflictsPayload,
  ConflictResponse,
  formatDateToString,
} from "../DayCalendar/types/class-session";

const SELECTED_WEEKS_KEY = "admin_calendar_selected_weeks";
const BASE_WEEK_KEY = "admin_calendar_base_week";

type AdminCalendarWeekProps = {
  currentDate?: Date;
  mode?: "view" | "create";
  onLessonSelect?: (lesson: ExtendedClassSessionWithRelations) => void;
  selectedBranchId?: string;
};

const getDateKey = (date: Date): string => {
  return date.toISOString().split("T")[0];
};

const AdminCalendarWeek: React.FC<AdminCalendarWeekProps> = ({
  currentDate = new Date(),
  mode = "view",
  onLessonSelect,
  selectedBranchId,
}) => {
  // Base week state for week selector
  const [baseWeek, setBaseWeek] = useState<Date>(() => {
    if (typeof window !== "undefined") {
      const savedBaseWeek = localStorage.getItem(BASE_WEEK_KEY);
      if (savedBaseWeek) {
        const date = new Date(savedBaseWeek);
        if (!isNaN(date.getTime())) {
          return startOfWeek(date, { weekStartsOn: 1 });
        }
      }
    }
    return startOfWeek(getCurrentDateAdjusted(), { weekStartsOn: 1 });
  });

  const [selectedWeeks, setSelectedWeeks] = useState<Date[]>(() => {
    const today = getCurrentDateAdjusted();
    const todayDateKey = getDateKey(today);

    if (typeof window !== "undefined") {
      const savedWeeksJson = localStorage.getItem(SELECTED_WEEKS_KEY);
      if (savedWeeksJson) {
        try {
          const savedWeeks = JSON.parse(savedWeeksJson);
          if (Array.isArray(savedWeeks) && savedWeeks.length > 0) {
            const parsedDates = savedWeeks
              .map((dateStr: string) => new Date(dateStr))
              .filter((date: Date) => !isNaN(date.getTime()));

            const validDates = parsedDates.filter((date) => {
              const dateKey = getDateKey(date);
              return dateKey >= todayDateKey;
            });

            if (validDates.length > 0) {
              return validDates;
            }
          }
        } catch (error) {
          console.error("Error parsing saved selected weeks:", error);
        }
      }
    }

    return [baseWeek];
  });

  const [selectedLesson, setSelectedLesson] =
    useState<ExtendedClassSessionWithRelations | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"view" | "edit">("view");
  const [filters, setFilters] = useState<DayFilters>({});

  // Create lesson dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createLessonData, setCreateLessonData] = useState<NewClassSessionData | null>(null);

  const { data: boothsResponse } = useBooths({ status: true });
  const { data: teachersResponse } = useTeachers();
  const { data: studentsResponse } = useStudents();
  const { data: subjectsResponse } = useSubjects();

  const booths = boothsResponse?.data || [];
  const teachers = teachersResponse?.data || [];
  const students = studentsResponse?.data || [];
  const subjects = subjectsResponse?.data || [];

  // Save base week to localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(BASE_WEEK_KEY, baseWeek.toISOString());
    }
  }, [baseWeek]);

  const handleBaseDateChange = useCallback((newBaseWeek: Date) => {
    const weekStart = startOfWeek(newBaseWeek, { weekStartsOn: 1 });
    setBaseWeek(weekStart);
    
    // Reset selected weeks to just the first week of new base
    setSelectedWeeks([weekStart]);
    
    // Clear old localStorage
    localStorage.setItem(SELECTED_WEEKS_KEY, JSON.stringify([weekStart.toISOString()]));
  }, []);

  const handleDaySelect = useCallback((date: Date, isSelected: boolean) => {
    setSelectedWeeks((prev) => {
      let newWeeks: Date[];
      if (isSelected) {
        const weekAlreadySelected = prev.some(
          (existingDate) => existingDate.getTime() === date.getTime()
        );

        if (weekAlreadySelected) return prev;

        newWeeks = [...prev, date];
        newWeeks = newWeeks.sort((a, b) => a.getTime() - b.getTime());
      } else {
        newWeeks = prev.filter((d) => d.getTime() !== date.getTime());
      }

      if (newWeeks.length > 0) {
        localStorage.setItem(
          SELECTED_WEEKS_KEY,
          JSON.stringify(newWeeks.map((d) => d.toISOString()))
        );
      } else {
        localStorage.removeItem(SELECTED_WEEKS_KEY);
      }

      return newWeeks;
    });
  }, []);

  const handleLessonSelect = (lesson: ExtendedClassSessionWithRelations) => {
    if (onLessonSelect) {
      onLessonSelect(lesson);
    }
  };

  const handleEdit = (lesson: ExtendedClassSessionWithRelations) => {
    setSelectedLesson(lesson);
    setDialogMode("edit");
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

  const handleCreateLesson = useCallback((date: Date) => {
    // Don't set a fixed booth - let user choose in dialog
    const lessonData: NewClassSessionData = {
      date: date,
      startTime: "09:00",
      endTime: "10:00", 
      boothId: "", // Empty boothId - user will select in dialog
    };

    setCreateLessonData(lessonData);
    setCreateDialogOpen(true);
  }, []);

  const handleCreateLessonSave = useCallback(async (payload: CreateClassSessionWithConflictsPayload): Promise<{ success: boolean; conflicts?: ConflictResponse }> => {
    try {
      const dateStr = typeof payload.date === 'string' ?
        payload.date : formatDateToString(payload.date);
  
      const requestBody: Record<string, unknown> = {
        date: dateStr,
        startTime: payload.startTime,
        endTime: payload.endTime,
        teacherId: payload.teacherId || "",
        studentId: payload.studentId || "",
        subjectId: payload.subjectId || "",
        boothId: payload.boothId,
        classTypeId: payload.classTypeId || "",
        notes: payload.notes || ""
      };
  
      if (payload.isRecurring) {
        requestBody.isRecurring = true;
        requestBody.startDate = payload.startDate;
        if (payload.endDate) requestBody.endDate = payload.endDate;
        if (payload.daysOfWeek && payload.daysOfWeek.length > 0) {
          requestBody.daysOfWeek = payload.daysOfWeek;
        }
      }
  
      // Add conflict resolution flags
      if (payload.skipConflicts) {
        requestBody.skipConflicts = true;
      }
      if (payload.forceCreate) {
        requestBody.forceCreate = true;
      }
  
      // Add session actions for conflict resolution
      if (payload.sessionActions && payload.sessionActions.length > 0) {
        requestBody.sessionActions = payload.sessionActions;
      }
  
      console.log("Creating lesson with payload:", JSON.stringify(requestBody, null, 2));
  
      const response = await fetch('/api/class-sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });
  
      const contentType = response.headers.get("content-type");
      
      if (!response.ok) {
        let errorData: any = {};
  
        if (contentType && contentType.includes("application/json")) {
          errorData = await response.json();
        } else {
          const errorText = await response.text();
          errorData = { message: errorText || `サーバーエラー: ${response.status}` };
        }
  
        // Check for conflicts
        if (errorData.requiresConfirmation) {
          console.log('Conflicts detected:', errorData);
          return { 
            success: false, 
            conflicts: errorData as ConflictResponse 
          };
        }
  
        // Regular error
        let errorMessage = '授業の作成に失敗しました';
  
        if (errorData.message) {
          errorMessage = errorData.message;
        } else if (errorData.error) {
          errorMessage = errorData.error;
        }
  
        if (errorData.issues && Array.isArray(errorData.issues)) {
          errorMessage += ': ' + errorData.issues.map((issue: any) => issue.message).join(', ');
        }
  
        throw new Error(errorMessage || `エラー ${response.status}: ${response.statusText}`);
      }
  
      // Success
      if (contentType && contentType.includes("application/json")) {
        try {
          await response.json();
        } catch (parseError) {
          console.warn("Response parse error:", parseError);
        }
      }
  
      console.log('Lesson created successfully');
      
      // Close dialog and refresh data if needed
      setCreateDialogOpen(false);
      setCreateLessonData(null);
      
      return { success: true };
  
    } catch (error) {
      console.error('Error creating lesson:', error);
      
      // Check if this is a conflict error
      if (error instanceof Error && (error as any).conflicts) {
        return { 
          success: false, 
          conflicts: (error as any).conflicts 
        };
      }
      
      // Regular error - rethrow for alert display
      throw error;
    }
  }, []);

  return (
    <div className="w-full flex flex-col gap-2 my-2">
      <div className="flex flex-col sm:flex-row justify-between items-center sm:space-y-0 mx-5">
        <h2 className="text-xl font-semibold text-foreground dark:text-foreground"></h2>
        <WeekSelector
          selectedWeeks={selectedWeeks}
          onSelectWeek={handleDaySelect}
          baseDate={baseWeek}
          onBaseDateChange={handleBaseDateChange}
        />
      </div>

      <CalendarWeek
        selectedWeeks={selectedWeeks}
        onLessonSelect={handleLessonSelect}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onCreateLesson={handleCreateLesson}
        filters={filters}
        onFiltersChange={setFilters}
        selectedBranchId={selectedBranchId}
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

      {createLessonData && (
        <CreateLessonDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          lessonData={createLessonData}
          onSave={handleCreateLessonSave}
          booths={booths.map(booth => ({
            boothId: booth.boothId,
            name: booth.name,
          }))}
        />
      )}
    </div>
  );
};

export default AdminCalendarWeek;