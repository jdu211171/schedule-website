// src/types/class-session-conflicts.ts
/**
 * Types for handling class session scheduling conflicts
 */

export type ConflictType =
  | "VACATION" // Date is during a vacation period
  | "TEACHER_UNAVAILABLE" // Teacher has no availability set for this day
  | "STUDENT_UNAVAILABLE" // Student has no availability set for this day
  | "TEACHER_WRONG_TIME" // Teacher is available but not at this time
  | "STUDENT_WRONG_TIME"; // Student is available but not at this time

export interface TimeSlot {
  startTime: string; // HH:MM format
  endTime: string; // HH:MM format
}

export interface ConflictParticipant {
  id: string;
  name: string;
  role: "teacher" | "student";
}

export interface ConflictInfo {
  date: string; // YYYY-MM-DD format
  dayOfWeek: string; // e.g., "MONDAY", "TUESDAY", etc.
  type: ConflictType;
  details: string; // Japanese description of the conflict
  participant?: ConflictParticipant;
  availableSlots?: TimeSlot[]; // Available time slots for WRONG_TIME conflicts
}

export interface ConflictModalOptions {
  onCancel: () => void;
  onSkipConflicts: () => void;
  onForceCreate: () => void;
}

// API request options for class session creation
export interface ClassSessionCreateOptions {
  checkAvailability?: boolean; // Default: true
  skipConflicts?: boolean; // Default: false
  forceCreate?: boolean; // Default: false
}

// API response for class session creation with conflicts
export interface ClassSessionCreateResponse {
  data?: FormattedClassSession[];
  message: string;
  conflicts?: ConflictInfo[];
  conflictsByDate?: Record<string, ConflictInfo[]>;
  requiresConfirmation?: boolean;
  sessionsWithConflicts?: FormattedClassSession[];
  seriesId?: string;
  skipped?: {
    count: number;
    dates: string[];
  };
  summary?: {
    totalSessions: number;
    sessionsWithConflicts: number;
    validSessions: number;
  };
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

// Formatted class session returned from API
export interface FormattedClassSession {
  classId: string;
  seriesId: string | null;
  teacherId: string | null;
  teacherName: string | null;
  studentId: string | null;
  studentName: string | null;
  subjectId: string | null;
  subjectName: string | null;
  classTypeId: string | null;
  classTypeName: string | null;
  boothId: string | null;
  boothName: string | null;
  branchId: string | null;
  branchName: string | null;
  date: string;
  startTime: string;
  endTime: string;
  duration: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

// Helper function to group conflicts by type
export function groupConflictsByType(
  conflicts: ConflictInfo[]
): Record<ConflictType, ConflictInfo[]> {
  return conflicts.reduce(
    (acc, conflict) => {
      if (!acc[conflict.type]) {
        acc[conflict.type] = [];
      }
      acc[conflict.type].push(conflict);
      return acc;
    },
    {} as Record<ConflictType, ConflictInfo[]>
  );
}

// Helper function to get Japanese labels for conflict types
export function getConflictTypeLabel(type: ConflictType): string {
  const labels: Record<ConflictType, string> = {
    VACATION: "休日期間",
    TEACHER_UNAVAILABLE: "講師利用不可",
    STUDENT_UNAVAILABLE: "生徒利用不可",
    TEACHER_WRONG_TIME: "講師時間外",
    STUDENT_WRONG_TIME: "生徒時間外",
  };
  return labels[type] || type;
}

// Example usage in a React component:
/*
const handleClassSessionCreate = async (formData: ClassSessionFormData) => {
  try {
    // First attempt without forcing
    const response = await createClassSession({
      ...formData,
      checkAvailability: true,
      skipConflicts: false,
      forceCreate: false,
    });

    if (response.requiresConfirmation && response.conflicts) {
      // Show modal with conflicts
      showConflictModal({
        conflicts: response.conflicts,
        onCancel: () => {
          // User cancelled, do nothing
        },
        onSkipConflicts: async () => {
          // Retry with skipConflicts flag
          const skipResponse = await createClassSession({
            ...formData,
            checkAvailability: true,
            skipConflicts: true,
            forceCreate: false,
          });
          handleSuccess(skipResponse);
        },
        onForceCreate: async () => {
          // Retry with forceCreate flag
          const forceResponse = await createClassSession({
            ...formData,
            checkAvailability: true,
            skipConflicts: false,
            forceCreate: true,
          });
          handleSuccess(forceResponse);

          // Handle sessions with conflicts
          if (forceResponse.sessionsWithConflicts) {
            // Navigate to edit page or show adjustment UI
            showAdjustmentUI(forceResponse.sessionsWithConflicts);
          }
        },
      });
    } else {
      // No conflicts, handle success
      handleSuccess(response);
    }
  } catch (error) {
    handleError(error);
  }
};
*/
