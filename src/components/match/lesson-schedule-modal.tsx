"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { BookOpen, X, AlertTriangle } from "lucide-react";
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
import WeeklySchedule from "./weekly-schedule";
import LessonModalSelects from "./lesson-modal-selects";
import { useModalSelects } from "./hooks/useModalSelects";
import { ClassSession, DisplayLesson } from "./types";
import { useRegularLessons } from "./hooks/useRegularLessons";
import { deleteRegularClassTemplate, updateRegularClassTemplate } from "./api-client";
import { AxiosError } from 'axios';

// API error data type
interface ApiErrorData {
  message?: string;
  [key: string]: unknown;
}

// Utility function to check if error is an Axios error
function isAxiosError<T = unknown>(error: unknown): error is AxiosError<T> {
  return (
    typeof error === 'object' &&
    error !== null &&
    'isAxiosError' in error &&
    (error as {isAxiosError?: boolean}).isAxiosError === true
  );
}

// Component for displaying error notification
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

// Component for displaying success notification
function SuccessNotification({ message, onClose }: { message: string; onClose: () => void }) {
  if (!message) return null;

  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-white border border-green-300 rounded-md shadow-md flex items-center py-2 px-4 max-w-md animate-in fade-in slide-in-from-top-5">
      <span className="text-green-600 mr-2 flex-shrink-0">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
          <polyline points="22 4 12 14.01 9 11.01"></polyline>
        </svg>
      </span>
      <span className="text-sm">{message}</span>
      <button onClick={onClose} className="ml-3 text-gray-400 hover:text-gray-600 flex-shrink-0">
        <X className="h-5 w-5" />
      </button>
    </div>
  );
}

interface LessonScheduleModalProps {
  onClose: () => void;
  teacherName: string;
  studentName: string;
  teacherId: string;
  studentId: string;
  open: boolean;
  onAddLesson?: (lesson: Partial<ClassSession>) => void;
}

export default function LessonScheduleModal({
  onClose,
  teacherName,
  studentName,
  teacherId,
  studentId,
  open,
  onAddLesson, // eslint-disable-line @typescript-eslint/no-unused-vars
}: LessonScheduleModalProps) {
  // State for error display
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [successMessage, setSuccessMessage] = useState<string>("");
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  
  // State for edit mode
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingLesson, setEditingLesson] = useState<DisplayLesson | null>(null);
  
  // Loading existing lessons using hook for all 3 types (teacher, student and shared)
  const { 
    data: lessons = [], 
    isLoading: lessonsLoading,
    refetch: refetchLessons 
  } = useRegularLessons({
    teacherId,
    studentId,
    teacherName,
    studentName
  });
  
  // Using our hook for API operations
  const {
    // Data for selects
    subjects,
    availableDays,
    availableStartTimes,
    availableBooths,
    
    // Selected values
    selectedSubject,
    selectedDay,
    selectedStartTime,
    selectedEndTime,
    selectedDuration,
    selectedBooth,
    
    // Setters for selected values
    setSelectedSubject,
    setSelectedDay,
    setSelectedStartTime,
    setSelectedDuration,
    setSelectedBooth,
    
    // Loading states
    loading,
    error,
    hasCommonSubjects,
    hasCommonDays,
    hasCommonTimeSlots,
    
    // Utility methods
    getDurationOptions,
    resetForm,
    handleTimeStep,
    createClassSession
  } = useModalSelects({
    teacherId,
    studentId
  });
  
  const durationOptions = getDurationOptions();
  
  // Display API error
  useEffect(() => {
    if (error) {
      setErrorMessage(error);
    }
  }, [error]);
  
  // Track changes for close warning
  useEffect(() => {
    if (selectedSubject || selectedBooth) {
      setHasChanges(true);
    }
  }, [selectedSubject, selectedBooth]);
  
  // Cancel edit mode
  const cancelEdit = () => {
    setIsEditMode(false);
    setEditingLesson(null);
    resetForm();
  };
  
  // Handle lesson click to enter edit mode
  const handleLessonClick = (lesson: DisplayLesson) => {
    if (!lesson.templateId) {
      setErrorMessage("このレッスンには編集可能なIDがありません");
      return;
    }
    
    setIsEditMode(true);
    setEditingLesson(lesson);
    
    setSelectedSubject(lesson.subjectId || "");
    setSelectedDay(lesson.dayOfWeek);
    
    // Calculate duration from start and end time
    const startMinutes = timeToMinutes(lesson.startTime);
    const endMinutes = timeToMinutes(lesson.endTime);
    const durationMinutes = endMinutes - startMinutes;
    
    if (durationMinutes === 60) {
      setSelectedDuration("60分");
    } else if (durationMinutes === 90) {
      setSelectedDuration("90分");
    } else if (durationMinutes === 120) {
      setSelectedDuration("120分");
    } else {
      setSelectedDuration("90分");
    }
    
    setSelectedStartTime(lesson.startTime);
    setSelectedBooth(lesson.boothId || "");
    
    setHasChanges(false);
  };
  
  // Utility to convert time to minutes
  const timeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };
  
  // Delete lesson handler
  const handleLessonDelete = async (lesson: DisplayLesson) => {
    if (!lesson.templateId) {
      setErrorMessage("このレッスンには削除可能なIDがありません");
      return;
    }
    
    try {
      await deleteRegularClassTemplate(lesson.templateId);
      setSuccessMessage("授業が削除されました");
      
      await refetchLessons();
    } catch (error: unknown) {
      console.error("Error deleting lesson:", error);
      
      if (isAxiosError<ApiErrorData>(error) && error.response?.data?.message) {
        setErrorMessage(`授業の削除に失敗しました: ${error.response.data.message}`);
      } else {
        setErrorMessage("授業の削除に失敗しました。後でもう一度お試しください。");
      }
    }
  };
  
  // Save/update lesson handler
  const handleSaveLesson = async () => {
    if (!selectedSubject || !selectedDay || !selectedStartTime || !selectedEndTime || !selectedBooth) {
      setErrorMessage("すべての必須フィールドを入力してください");
      return;
    }
    
    try {
      if (isEditMode && editingLesson?.templateId) {
        await updateRegularClassTemplate({
          templateId: editingLesson.templateId,
          dayOfWeek: selectedDay,
          startTime: selectedStartTime,
          endTime: selectedEndTime,
          subjectId: selectedSubject,
          boothId: selectedBooth,
          studentIds: [studentId],
          notes: `編集: ${selectedDay} ${selectedStartTime}-${selectedEndTime}`
        });
        
        setSuccessMessage("授業が更新されました");
        setIsEditMode(false);
        setEditingLesson(null);
      } else {
        await createClassSession();
        setSuccessMessage("授業が追加されました");
      }
      
      await refetchLessons();
      setHasChanges(true);
      resetForm();
    } catch (error: unknown) {
      console.error("Error saving lesson:", error);
      
      if (isAxiosError<ApiErrorData>(error) && error.response?.data?.message) {
        setErrorMessage(`授業の保存に失敗しました: ${error.response.data.message}`);
      } else {
        setErrorMessage("授業の保存に失敗しました。後でもう一度お試しください。");
      }
    }
  };
  
  // Modal close handler
  const handleClose = () => {
    if (hasChanges) {
      setIsConfirmOpen(true);
    } else {
      onClose();
    }
  };
  
  // Confirm changes and close
  const handleConfirmChanges = () => {
    onClose();
  };
  
  const hasNoMatchingOptions = !hasCommonSubjects || !hasCommonDays || !hasCommonTimeSlots;
  
  // Success message auto-close
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage("");
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [successMessage]);
  
  if (!open) return null;
  
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
      {errorMessage && (
        <ErrorNotification
          message={errorMessage}
          onClose={() => setErrorMessage("")}
        />
      )}
      
      {successMessage && (
        <SuccessNotification
          message={successMessage}
          onClose={() => setSuccessMessage("")}
        />
      )}

      <div className="bg-white w-[85%] max-w-[1200px] max-h-[95vh] rounded-lg shadow-lg flex flex-col">
        {/* Header */}
        <div className="px-6 py-3 border-b flex justify-between items-center">
          <div>
            <h2 className="flex items-center text-xl font-bold">
              <BookOpen className="mr-2 h-5 w-5" />
              {isEditMode ? "授業を編集" : "授業設定"}
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

        {/* Content */}
        <div className="px-6 overflow-y-auto flex-grow">
          {/* Loading indicator */}
          {(loading || lessonsLoading) && (
            <div className="p-4 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
              <p className="mt-2 text-gray-600">データを読み込み中...</p>
            </div> )
          }

          {/* Selects component */}
          <LessonModalSelects
            // Select data
            subjects={subjects}
            availableDays={availableDays}
            availableStartTimes={availableStartTimes}
            availableBooths={availableBooths}
            
            // Selected values
            selectedSubject={selectedSubject}
            selectedDay={selectedDay}
            selectedStartTime={selectedStartTime}
            selectedEndTime={selectedEndTime}
            selectedDuration={selectedDuration}
            selectedBooth={selectedBooth}
            
            // Setters for selected values
            setSelectedSubject={setSelectedSubject}
            setSelectedDay={setSelectedDay}
            setSelectedStartTime={setSelectedStartTime}
            setSelectedDuration={setSelectedDuration}
            setSelectedBooth={setSelectedBooth}
            
            // Errors and statuses
            timeError={null}
            hasCommonSubjects={hasCommonSubjects}
            hasCommonDays={hasCommonDays}
            hasCommonTimeSlots={hasCommonTimeSlots}
            loading={loading}
            
            // Additional
            durationOptions={durationOptions}
            handleTimeStep={handleTimeStep}
          />

          {/* Add/Edit lesson button */}
          <div className="flex space-x-2 w-full my-5">
            {isEditMode && (
              <Button
                variant="outline"
                className="py-6 cursor-pointer flex-1"
                onClick={cancelEdit}
              >
                キャンセル
              </Button>
            )}
            
            <Button
              className={`py-6 cursor-pointer flex-1 ${
                hasNoMatchingOptions || !selectedSubject || !selectedDay || !selectedStartTime || !selectedBooth
                  ? 'bg-gray-300 hover:bg-gray-400 text-gray-600 cursor-not-allowed'
                  : isEditMode 
                    ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                    : 'bg-black hover:bg-gray-800 text-white'
              }`}
              onClick={handleSaveLesson}
              disabled={hasNoMatchingOptions || !selectedSubject || !selectedDay || !selectedStartTime || !selectedBooth || loading}
            >
              {isEditMode ? "授業を更新" : "授業を追加"}
            </Button>
          </div>

          {/* Weekly schedule with updated logic for different lesson types */}
          <div className="mt-2 border-t pt-2">
            <WeeklySchedule
              lessons={lessons}
              onLessonClick={handleLessonClick}
              onLessonDelete={handleLessonDelete}
              currentTeacherId={teacherId}
              currentStudentId={studentId}
              teacherName={teacherName}
              studentName={studentName}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t flex justify-between">
          <div className="flex-grow"></div>
          <Button
            variant="destructive"
            onClick={handleClose}
            className="cursor-pointer mr-2"
            disabled={loading}
          >
            キャンセル
          </Button>
          <Button
            variant="default"
            disabled={!hasChanges || loading}
            onClick={() => setIsConfirmOpen(true)}
            className={`cursor-pointer bg-black text-white hover:bg-gray-800 ${!hasChanges || loading ? 'opacity-50' : ''}`}
          >
            保存
          </Button>
        </div>

        {/* Confirmation dialog */}
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