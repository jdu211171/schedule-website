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
import { ClassSession } from "./types";
import { useRegularLessons } from "./hooks/useRegularLessons";

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
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  
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
  
  // console.log("All lessons in modal:", lessons);
  
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
    // resetForm,
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
  
  // Lesson add handler
  const handleSaveLesson = async () => {
    if (!selectedSubject || !selectedDay || !selectedStartTime || !selectedEndTime || !selectedBooth) {
      setErrorMessage("Пожалуйста, заполните все поля");
      return;
    }
    
    try {
      // console.log("Creating class session with selected values:", {
      //   selectedSubject,
      //   selectedDay,
      //   selectedStartTime,
      //   selectedEndTime,
      //   selectedBooth
      // });
      
      const success = await createClassSession();
      
      if (success) {
        // console.log("Class session created successfully");
        await refetchLessons();
        setHasChanges(true);
      } else {
        console.error("Failed to create class session");
        setErrorMessage("Не удалось добавить урок. Попробуйте еще раз.");
      }
    } catch (error) {
      console.error("Error saving lesson:", error);
      setErrorMessage("Не удалось добавить урок. Попробуйте еще раз.");
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
  
  // Check for compatible options
  const hasNoMatchingOptions = !hasCommonSubjects || !hasCommonDays || !hasCommonTimeSlots;
  
  if (!open) return null;
  
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
      {errorMessage && (
        <ErrorNotification
          message={errorMessage}
          onClose={() => setErrorMessage("")}
        />
      )}

      <div className="bg-white w-[85%] max-w-[1200px] max-h-[95vh] rounded-lg shadow-lg flex flex-col">
        {/* Header */}
        <div className="px-6 py-3 border-b flex justify-between items-center">
          <div>
            <h2 className="flex items-center text-xl font-bold">
              <BookOpen className="mr-2 h-5 w-5" />
              授業設定
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

          {/* Add lesson button */}
          <Button
            className={`w-full py-6 cursor-pointer my-5 ${
              hasNoMatchingOptions || !selectedSubject || !selectedDay || !selectedStartTime || !selectedBooth
                ? 'bg-gray-300 hover:bg-gray-400 text-gray-600 cursor-not-allowed'
                : 'bg-black hover:bg-gray-800 text-white'
            }`}
            onClick={handleSaveLesson}
            disabled={hasNoMatchingOptions || !selectedSubject || !selectedDay || !selectedStartTime || !selectedBooth || loading}
          >
            授業を追加
          </Button>

          {/* Weekly schedule with updated logic for different lesson types */}
          <div className="mt-2 border-t pt-2">
            <WeeklySchedule
              lessons={lessons}
              onLessonClick={() => {}}
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