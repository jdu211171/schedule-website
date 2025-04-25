"use client";

import { useState, useEffect, ChangeEvent, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BookOpen, X, AlertTriangle } from "lucide-react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import WeeklySchedule from "./weekly-schedule";
import { DisplayLesson } from "./lesson-card";
import {
  getAvailableSubjects,
  getAvailableDays,
  getAvailableTimeSlots,
  getLessonDurations,
  isTimeSlotAvailableForDuration,
  calculateEndTime,
  getDayOfWeekNumber,
  getDayOfWeekString,
  getSubjectNameJapanese,
} from "./lesson-modal-utils";
import { Subject } from "@/schemas/subject.schema";
import { ClassSession as PrismaClassSession } from "@prisma/client";

// -----------------------------------------------------------------------------
// 型定義
// -----------------------------------------------------------------------------
// Prisma の ClassSession に UI で必要なプロパティを追加
export type ClassSession = PrismaClassSession & {
  id?: string; // UI 識別用
  subject?: Subject | null;
  dayOfWeek?: string | number;
  name?: string;
  status?: string;
  teacherName?: string;
  studentName?: string;
  room?: string;
};

// ExtendedLesson for internal modal needs
interface ExtendedLesson {
  id: string;
  name: string;
  subjectName: string;
  subjectId?: string;
  teacherName: string;
  studentName: string;
  dayOfWeek: string | number;
  startTime: string;
  endTime: string;
  status: string;
  teacherId: string;
  studentId: string;
  room?: string;
}

interface LessonScheduleModalProps {
  lessons: ClassSession[];
  onClose: () => void;
  teacherName: string;
  studentName: string;
  teacherId: string;
  studentId: string;
  open: boolean;
  onAddLesson?: (lesson: Partial<ClassSession>) => void;
}

// Function to check lesson overlap
function checkLessonOverlap(
  newLessonDay: number,
  newLessonStart: string,
  newLessonEnd: string,
  existingLessons: ExtendedLesson[],
  currentTeacherId: string,
  currentStudentId: string,
  editingLessonId?: string
): { hasOverlap: boolean; overlapMessage: string } {
  // Convert time to minutes for comparison
  const newStartMinutes = timeStringToMinutes(newLessonStart);
  const newEndMinutes = timeStringToMinutes(newLessonEnd);

  // Check each lesson for overlap
  for (const lesson of existingLessons) {
    // Skip the current lesson being edited
    if (editingLessonId && lesson.id === editingLessonId) {
      continue;
    }

    // Only check lessons on the same day
    const lessonDay = typeof lesson.dayOfWeek === 'string'
      ? parseInt(lesson.dayOfWeek)
      : lesson.dayOfWeek;

    if (lessonDay !== newLessonDay) {
      continue;
    }

    const lessonStartMinutes = timeStringToMinutes(lesson.startTime);
    const lessonEndMinutes = timeStringToMinutes(lesson.endTime);

    // Check for time intersection
    // (new lesson starts before existing lesson ends AND ends after existing lesson starts)
    if (newStartMinutes < lessonEndMinutes && newEndMinutes > lessonStartMinutes) {
      let overlapMessage = "";

      // Teacher's lessons
      if (lesson.teacherId === currentTeacherId) {
        overlapMessage = `先生はすでに${lesson.startTime}〜${lesson.endTime}に授業があります。`;
      }
      // Student's lessons
      else if (lesson.studentId === currentStudentId) {
        overlapMessage = `生徒はすでに${lesson.startTime}〜${lesson.endTime}に授業があります。`;
      }
      // Other lessons
      else {
        overlapMessage = `授業時間が${lesson.startTime}〜${lesson.endTime}の授業と重複しています。`;
      }

      return { hasOverlap: true, overlapMessage };
    }
  }

  return { hasOverlap: false, overlapMessage: "" };
}

// Helper function to convert time to minutes
function timeStringToMinutes(timeString: string): number {
  const [hours, minutes] = timeString.split(':').map(Number);
  return hours * 60 + minutes;
}

// Error notification component
function ErrorNotification({ message, onClose }: { message: string; onClose: () => void }) {
  if (!message) return null;

  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-white border border-red-300 rounded-md shadow-md flex items-center py-2 px-4 max-w-md animate-in fade-in slide-in-from-top-5">
      <span className="text-red-600 mr-2 flex-shrink-0">
        <AlertTriangle className="h-5 w-5" />
      </span>
      <span className="text-sm">{message}</span>
      <button onClick={onClose} className="ml-3 text-gray-400 hover:text-gray-600 flex-shrink-0">
        <X className="h-5 w-5" />
      </button>
    </div>
  );
}

export default function CustomLessonModal({
  lessons: propsLessons,
  onClose,
  teacherName,
  studentName,
  teacherId,
  studentId,
  open,
  onAddLesson,
}: LessonScheduleModalProps) {
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [selectedDay, setSelectedDay] = useState<string>("");
  const [selectedDuration, setSelectedDuration] = useState<string>("90分");
  const [startTime, setStartTime] = useState<string>("");
  const [endTime, setEndTime] = useState<string>("");
  const [selectedRoom, setSelectedRoom] = useState<string>("");
  const [timeError, setTimeError] = useState<string | null>(null);
  const [lessons, setLessons] = useState<ExtendedLesson[]>([]);
  const [editMode, setEditMode] = useState(false);
  const [editingLesson, setEditingLesson] = useState<ExtendedLesson | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [previousDay, setPreviousDay] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");

  const [availableSubjects, setAvailableSubjects] = useState<{ subjectId: string, name: string }[]>([]);
  const [availableDays, setAvailableDays] = useState<{ value: string, label: string }[]>([]);
  // availableTimeSlots is used inside getAvailableTimeSlots, but not directly in the component
  const [, setAvailableTimeSlots] = useState<{ start: string, end: string }[]>([]);

  const durations = useMemo(() => [
    { value: "60分", label: "60分" },
    { value: "90分", label: "90分" },
    { value: "120分", label: "120分" }
  ], []);
  const [availableDurations, setAvailableDurations] = useState<{ value: string, isAvailable: boolean }[]>(
    durations.map(d => ({ value: d.value, isAvailable: true }))
  );

  const [hasCommonSubjects, setHasCommonSubjects] = useState(true);
  const [hasCommonDays, setHasCommonDays] = useState(true);
  const [hasCommonTimeSlots, setHasCommonTimeSlots] = useState(true);

  const shouldSetEarliestTime = !startTime && !editMode;

  useEffect(() => {
    if (teacherId && studentId) {
      const { subjects, hasSubjects } = getAvailableSubjects(teacherId, studentId);
      setAvailableSubjects(subjects);
      setHasCommonSubjects(hasSubjects);

      if (subjects.length === 1 && !selectedSubject) {
        setSelectedSubject(subjects[0].subjectId);
      }

      const { days, hasDays } = getAvailableDays(teacherId, studentId);
      setAvailableDays(days);
      setHasCommonDays(hasDays);

      if (days.length === 1 && !selectedDay) {
        setSelectedDay(days[0].value);
      }
    }
  }, [teacherId, studentId, selectedSubject, selectedDay]);

  useEffect(() => {
    if (teacherId && studentId && selectedDay) {
      const { timeSlots, hasTimeSlots, earliestAvailableTime } = getAvailableTimeSlots(
        teacherId,
        studentId,
        selectedDay
      );

      setAvailableTimeSlots(timeSlots);
      setHasCommonTimeSlots(hasTimeSlots);

      // If the day changed, or this is not edit mode and time is not set yet
      const dayChanged = editMode && previousDay !== "" && previousDay !== selectedDay;

      if (hasTimeSlots && earliestAvailableTime && (shouldSetEarliestTime || dayChanged)) {
        setStartTime(earliestAvailableTime);
        setTimeError(null);
      }

      // Save current day for tracking changes
      setPreviousDay(selectedDay);
    }
  }, [teacherId, studentId, selectedDay, shouldSetEarliestTime, editMode, previousDay]);

  useEffect(() => {
    if (startTime) {
      setAvailableDurations(getLessonDurations(startTime, ""));
    } else {
      setAvailableDurations(durations.map(d => ({ value: d.value, isAvailable: true })));
    }
  }, [startTime, durations]);

  useEffect(() => {
    const formattedLessons: ExtendedLesson[] = propsLessons.map(lesson => {
      const subjectName = lesson.subject ? lesson.subject.name :
                          (lesson.name || getSubjectNameJapanese(lesson.subjectId || ''));

      // Ensure id, startTime, endTime, teacherId, studentId, and status are not undefined/null
      const id: string = (lesson.classId || lesson.id || `temp-${Date.now()}`) as string;
      const startTime: string = typeof lesson.startTime === "string"
        ? lesson.startTime
        : lesson.startTime instanceof Date
          ? lesson.startTime.toTimeString().slice(0, 5)
          : "";
      const endTime: string = typeof lesson.endTime === "string"
        ? lesson.endTime
        : lesson.endTime instanceof Date
          ? lesson.endTime.toTimeString().slice(0, 5)
          : "";
      const teacherIdSafe: string = lesson.teacherId ?? teacherId ?? "";
      const studentIdSafe: string = lesson.studentId ?? studentId ?? "";
      const statusSafe: string = lesson.status ?? "有効";

      return {
        id,
        name: subjectName,
        subjectName: subjectName,
        subjectId: lesson.subjectId ?? "",
        teacherName: teacherName,
        studentName: studentName,
        dayOfWeek: typeof lesson.dayOfWeek === 'string' ? parseInt(lesson.dayOfWeek) : lesson.dayOfWeek || 0,
        startTime: startTime,
        endTime,
        status: statusSafe,
        teacherId: teacherIdSafe,
        studentId: studentIdSafe,
        room: selectedRoom || "未設定"
      };
    });

    setLessons(prevLessons => {
      const tempLessons = prevLessons.filter(lesson =>
        lesson.id.startsWith('temp-') &&
        !formattedLessons.some(l => l.id === lesson.id)
      );

      return [...formattedLessons, ...tempLessons];
    });
  }, [propsLessons, teacherName, studentName, selectedRoom, teacherId, studentId]);

  useEffect(() => {
    if (startTime && !timeError) {
      const newEndTime = calculateEndTime(startTime, selectedDuration);
      setEndTime(newEndTime);

      if (selectedDay) {
        const durationMinutes = selectedDuration === "60分" ? 60 : selectedDuration === "120分" ? 120 : 90;
        const isAvailable = isTimeSlotAvailableForDuration(
          teacherId,
          studentId,
          selectedDay,
          typeof startTime === "string" ? startTime : "",
          durationMinutes
        );

        if (!isAvailable) {
          setTimeError(`選択した時間枠は${selectedDuration}の授業には短すぎます`);
        } else {
          setTimeError(null);
        }
      }
    } else {
      setEndTime("");
    }
  }, [startTime, selectedDuration, timeError, teacherId, studentId, selectedDay]);

  useEffect(() => {
    const initialLessonsLength = propsLessons.length;

    if (lessons.filter(lesson => !lesson.id.startsWith('temp-')).length !== initialLessonsLength ||
        lessons.some(lesson => lesson.id.startsWith('temp-'))) {
      setHasChanges(true);
    } else {
      setHasChanges(false);
    }
  }, [lessons, propsLessons]);

  const handleTimeChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setStartTime(value);

    if (value) {
      const timePattern = /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/;

      if (!timePattern.test(value)) {
        setTimeError("正しい時間形式を入力してください (HH:MM)");
        return;
      }

      const minutes = parseInt(value.split(":")[1]);
      if (minutes % 15 !== 0) {
        setTimeError("時間は15分単位でなければなりません (00, 15, 30, 45)");
        return;
      }

      setTimeError(null);
    } else {
      setTimeError(null);
    }
  };

  const handleTimeStep = (minutesToAdd: number) => {
    if (!startTime) {
      if (teacherId && studentId && selectedDay) {
        const { earliestAvailableTime, hasTimeSlots } = getAvailableTimeSlots(
          teacherId,
          studentId,
          selectedDay
        );

        if (hasTimeSlots && earliestAvailableTime) {
          setStartTime(earliestAvailableTime);
        } else {
          setStartTime("12:00");
        }
      } else {
        setStartTime("12:00");
      }
      return;
    }

    try {
      const [hours, minutes] = startTime.split(":").map(Number);

      let totalMinutes = hours * 60 + minutes + minutesToAdd;

      if (totalMinutes < 0) totalMinutes += 24 * 60;
      totalMinutes %= 24 * 60;

      const newHours = Math.floor(totalMinutes / 60);
      const newMinutes = totalMinutes % 60;

      const formattedHours = newHours.toString().padStart(2, "0");
      const formattedMinutes = newMinutes.toString().padStart(2, "0");

      const newTime = `${formattedHours}:${formattedMinutes}`;
      setStartTime(newTime);
      setTimeError(null);
    } catch (e) {
      console.error("Error when changing time:", e);
    }
  };

  const handleLessonClick = (lesson: DisplayLesson) => {
    if (!lesson.subjectId) return; // Can't edit without subjectId

    setEditMode(true);

    // Convert to ExtendedLesson type
    const extendedLesson: ExtendedLesson = {
      ...lesson,
      subjectName: lesson.name,
      teacherName: lesson.teacherName ?? teacherName ?? "",
      studentName: lesson.studentName ?? studentName ?? ""
    };

    setEditingLesson(extendedLesson);
    setSelectedSubject(lesson.subjectId);

    // Save current day before change for tracking changes
    const dayOfWeek = typeof lesson.dayOfWeek === 'string'
      ? parseInt(lesson.dayOfWeek)
      : lesson.dayOfWeek;

    const dayString = getDayOfWeekString(dayOfWeek);
    setPreviousDay(dayString);
    setSelectedDay(dayString);

    const [startHours, startMinutes] = lesson.startTime.split(":").map(Number);
    const [endHours, endMinutes] = lesson.endTime.split(":").map(Number);

    const startTotalMinutes = startHours * 60 + startMinutes;
    const endTotalMinutes = endHours * 60 + endMinutes;

    let duration = endTotalMinutes - startTotalMinutes;
    if (duration < 0) {
      duration += 24 * 60;
    }

    if (duration <= 60) {
      setSelectedDuration("60分");
    } else if (duration <= 90) {
      setSelectedDuration("90分");
    } else {
      setSelectedDuration("120分");
    }

    setStartTime(lesson.startTime);
    setEndTime(lesson.endTime);
    setSelectedRoom(lesson.room || "");
  };

  if (!open) return null;

  const handleSaveLesson = () => {
    if (!selectedSubject || !selectedDay || !startTime || !endTime) {
      setErrorMessage("すべてのフィールドに入力してください。");
      return;
    }

    const now = new Date();
    const today = now.getDay();
    const currentTime = now.getHours() * 60 + now.getMinutes();

    const selectedDayNumber = getDayOfWeekNumber(selectedDay);
    const [startHours, startMinutes] = startTime.split(':').map(Number);
    const lessonStartTimeInMinutes = startHours * 60 + startMinutes;

    if (selectedDayNumber < today ||
        (selectedDayNumber === today && lessonStartTimeInMinutes <= currentTime)) {
      setErrorMessage("過去の時間に授業を追加することはできません。");
      return;
    }

    // Check for overlap with existing classes
    const editingId = editMode && editingLesson ? editingLesson.id : undefined;
    const { hasOverlap, overlapMessage } = checkLessonOverlap(
      selectedDayNumber,
      startTime,
      endTime,
      lessons,
      teacherId,
      studentId,
      editingId
    );

    if (hasOverlap) {
      setErrorMessage(overlapMessage);
      return;
    }

    const subjectName = getSubjectNameJapanese(selectedSubject);

    if (editMode && editingLesson) {
      const updatedLesson: ExtendedLesson = {
        ...editingLesson,
        subjectId: selectedSubject,
        subjectName: subjectName,
        name: subjectName,
        dayOfWeek: getDayOfWeekNumber(selectedDay),
        startTime,
        endTime,
        room: selectedRoom || "未設定"
      };

      setLessons(prevLessons =>
        prevLessons.map(lesson =>
          lesson.id === editingLesson.id ? updatedLesson : lesson
        )
      );

      if (onAddLesson) {
        onAddLesson({
          classId: editingLesson.id,
          name: subjectName,
          dayOfWeek: getDayOfWeekNumber(selectedDay).toString(),
          startTime: startTime ? new Date(`1970-01-01T${startTime}:00`) : null,
          endTime: endTime ? new Date(`1970-01-01T${endTime}:00`) : null,
          status: editingLesson.status,
          teacherId: teacherId,
          studentId: studentId,
          subjectId: selectedSubject
        });
      }
    } else {
      const newLesson: ExtendedLesson = {
        id: `temp-${Date.now()}`,
        name: subjectName,
        subjectName: subjectName,
        subjectId: selectedSubject,
        teacherName: teacherName,
        studentName: studentName,
        teacherId: teacherId,
        studentId: studentId,
        dayOfWeek: getDayOfWeekNumber(selectedDay),
        startTime,
        endTime,
        status: "有効",
        room: selectedRoom || "未設定"
      };

      setLessons(prevLessons => [...prevLessons, newLesson]);

      if (onAddLesson) {
        onAddLesson({
          name: subjectName,
          dayOfWeek: getDayOfWeekNumber(selectedDay).toString(),
          startTime: startTime ? new Date(`1970-01-01T${startTime}:00`) : null,
          endTime: endTime ? new Date(`1970-01-01T${endTime}:00`) : null,
          status: "有効",
          teacherId: teacherId,
          studentId: studentId,
          subjectId: selectedSubject
        });
      }
    }

    resetForm();
  };

  const resetForm = () => {
    setSelectedSubject("");
    setSelectedDay("");
    setStartTime("");
    setEndTime("");
    setSelectedRoom("");
    setEditMode(false);
    setEditingLesson(null);
    setPreviousDay("");
  };

  const handleClose = () => {
    if (hasChanges) {
      setIsConfirmOpen(true);
    } else {
      onClose();
    }
  };

  const handleConfirmChanges = () => {
    onClose();
  };

  const hasNoMatchingOptions = !hasCommonSubjects || !hasCommonDays || !hasCommonTimeSlots;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
      {errorMessage && (
        <ErrorNotification
          message={errorMessage}
          onClose={() => setErrorMessage("")}
        />
      )}

      <div className="bg-white w-[85%] max-w-[1200px] max-h-[95vh] rounded-lg shadow-lg flex flex-col">
        <div className="px-6 py-3 border-b flex justify-between items-center">
          <div>
            <h2 className="flex items-center text-xl font-bold">
              <BookOpen className="mr-2 h-5 w-5" />
              {editMode ? '授業を編集' : '授業設定'}
            </h2>
            <div className="text-sm text-gray-500 flex items-center space-x-2">
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full bg-green-500 mr-1.5"></div>
                <span>{teacherName}</span>
              </div>
              <span>-</span>
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full bg-blue-500 mr-1.5"></div>
                <span>{studentName}</span>
              </div>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700 cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        <div className="px-6 overflow-y-auto flex-grow">
          {hasNoMatchingOptions && (
            <Alert variant="destructive" className="my-3">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>スケジュールの不一致</AlertTitle>
              <AlertDescription>
                {!hasCommonSubjects && "生徒と先生の科目が一致しません。"}
                {!hasCommonDays && "生徒と先生のスケジュールが重なりません。"}
                {hasCommonDays && !hasCommonTimeSlots && selectedDay && "選択した曜日に利用可能な時間帯がありません。"}
              </AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-3 gap-8 py-3">
            <div>
              <Label className="block text-sm font-medium mb-1">科目</Label>
              <Select
                value={selectedSubject}
                onValueChange={setSelectedSubject}
                disabled={!hasCommonSubjects}
              >
                <SelectTrigger className={`w-full cursor-pointer ${!hasCommonSubjects ? 'opacity-50' : ''}`}>
                  <SelectValue placeholder="科目を選択" />
                </SelectTrigger>
                <SelectContent className="cursor-pointer">
                  {availableSubjects.length > 0 ? (
                    availableSubjects.map(subject => (
                      <SelectItem
                        key={subject.subjectId}
                        value={subject.subjectId}
                        className="cursor-pointer"
                      >
                        {subject.name}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="none" disabled className="text-gray-400">
                      利用可能な科目がありません
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              {!hasCommonSubjects && (
                <p className="text-xs text-red-500 mt-1">共通の科目がありません</p>
              )}
            </div>

            <div>
              <Label className="block text-sm font-medium mb-1">曜日</Label>
              <Select
                value={selectedDay}
                onValueChange={(newDay) => {
                  setSelectedDay(newDay);

                  // When day changes, reset time to get the earliest available
                  if (newDay !== selectedDay) {
                    setStartTime("");
                    setEndTime("");
                  }
                }}
                disabled={!hasCommonDays}
              >
                <SelectTrigger className={`w-full cursor-pointer ${!hasCommonDays ? 'opacity-50' : ''}`}>
                  <SelectValue placeholder="曜日を選択" />
                </SelectTrigger>
                <SelectContent className="cursor-pointer">
                  {availableDays.length > 0 ? (
                    availableDays.map(day => (
                      <SelectItem
                        key={day.value}
                        value={day.value}
                        className="cursor-pointer"
                      >
                        {day.label}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="none" disabled className="text-gray-400">
                      利用可能な曜日がありません
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              {!hasCommonDays && (
                <p className="text-xs text-red-500 mt-1">共通の曜日がありません</p>
              )}
            </div>

            <div>
              <Label className="block text-sm font-medium mb-1">授業時間</Label>
              <div className="flex space-x-3">
                {durations.map(duration => (
                  <Button
                    key={duration.value}
                    variant={selectedDuration === duration.value ? "default" : "outline"}
                    className={`flex-1 cursor-pointer ${selectedDuration === duration.value ? "bg-black text-white" : ""} ${
                      (hasNoMatchingOptions || !availableDurations.find(d => d.value === duration.value)?.isAvailable)
                        ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                    onClick={() => {
                      const isAvailable = availableDurations.find(d => d.value === duration.value)?.isAvailable;
                      if (!hasNoMatchingOptions && isAvailable) {
                        setSelectedDuration(duration.value);
                      }
                    }}
                    disabled={hasNoMatchingOptions || !availableDurations.find(d => d.value === duration.value)?.isAvailable}
                  >
                    {duration.label}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <Label className="block text-sm font-medium mb-1">開始時刻</Label>
              <div className="relative">
                <div className="flex">
                  <Input
                    type="text"
                    placeholder="12:00"
                    value={startTime}
                    onChange={handleTimeChange}
                    className={`w-full cursor-text rounded-r-none ${timeError ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                    disabled={!hasCommonTimeSlots || !selectedDay}
                  />
                  <div className="flex flex-col border border-l-0 border-input rounded-r-md overflow-hidden">
                    <button
                      onClick={() => handleTimeStep(15)}
                      className={`flex-1 hover:bg-gray-100 px-2 cursor-pointer flex items-center justify-center ${!hasCommonTimeSlots || !selectedDay ? 'opacity-50 cursor-not-allowed' : ''}`}
                      disabled={!hasCommonTimeSlots || !selectedDay}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6"/></svg>
                    </button>
                    <div className="h-px bg-input w-full"></div>
                    <button
                      onClick={() => handleTimeStep(-15)}
                      className={`flex-1 hover:bg-gray-100 px-2 cursor-pointer flex items-center justify-center ${!hasCommonTimeSlots || !selectedDay ? 'opacity-50 cursor-not-allowed' : ''}`}
                      disabled={!hasCommonTimeSlots || !selectedDay}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                    </button>
                  </div>
                </div>
                {timeError && (
                  <div className="absolute top-full left-0 mt-1 px-2 py-1 text-xs bg-red-100 text-red-800 border border-red-300 rounded z-10">
                    {timeError}
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">15分単位で入力してください (例: 12:00, 12:15)</p>
            </div>

            <div>
              <Label className="block text-sm font-medium mb-1">終了時刻</Label>
              <Input
                type="text"
                placeholder="自動計算"
                value={endTime}
                readOnly
                className="w-full bg-gray-50 cursor-not-allowed"
              />
            </div>

            <div>
              <Label className="block text-sm font-medium mb-1">ブース</Label>
              <Select
                value={selectedRoom}
                onValueChange={setSelectedRoom}
              >
                <SelectTrigger className="w-full cursor-pointer">
                  <SelectValue placeholder="ブースを選択" />
                </SelectTrigger>
                <SelectContent className="cursor-pointer">
                  <SelectItem value="booth1" className="cursor-pointer">ブース1</SelectItem>
                  <SelectItem value="booth2" className="cursor-pointer">ブース2</SelectItem>
                  <SelectItem value="booth3" className="cursor-pointer">ブース3</SelectItem>
                  <SelectItem value="booth4" className="cursor-pointer">ブース4</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button
            className={`w-full py-6 cursor-pointer my-5 ${
              editMode
                ? 'bg-yellow-400 hover:bg-yellow-600 text-black'
                : 'bg-gray-400 hover:bg-gray-500 text-white'
            }`}
            onClick={handleSaveLesson}
            disabled={!selectedSubject || !selectedDay || !startTime || !!timeError || hasNoMatchingOptions}
          >
            {editMode ? '授業を更新' : '授業を追加'}
          </Button>

          <div className="mt-2 border-t pt-2">
            <WeeklySchedule
              lessons={lessons}
              onLessonClick={handleLessonClick}
              currentTeacherId={teacherId}
              currentStudentId={studentId}
              teacherName={teacherName}
              studentName={studentName}
            />
          </div>
        </div>

        <div className="px-6 py-3 border-t flex justify-between">
          <div className="flex-grow"></div>
          {editMode ? (
            <>
              <Button
                variant="destructive"
                onClick={resetForm}
                className="cursor-pointer mr-2"
              >
                編集をキャンセル
              </Button>
              <Button
                variant="default"
                disabled={!hasChanges || !selectedSubject || !selectedDay || !startTime || !!timeError}
                onClick={handleSaveLesson}
                className={`cursor-pointer ${!hasChanges ? 'opacity-50' : ''}`}
              >
                更新
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="destructive"
                onClick={handleClose}
                className="cursor-pointer mr-2"
              >
                キャンセル
              </Button>
              <Button
                variant="default"
                disabled={!hasChanges}
                onClick={() => setIsConfirmOpen(true)}
                className={`cursor-pointer bg-black text-white hover:bg-gray-800 ${!hasChanges ? 'opacity-50' : ''}`}
              >
                確認
              </Button>
            </>
          )}
        </div>

        <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>変更を保存しますか？</AlertDialogTitle>
              <AlertDialogDescription>
                スケジュールが変更されました。変更を保存しますか？
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>キャンセル</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmChanges}>保存</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
