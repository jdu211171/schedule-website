// src/components/admin-schedule/DayCalendar/types/class-session.ts

export interface ClassSessionBase {
  teacherId: string;
  studentId: string;
  subjectId: string;
  boothId: string;
  classTypeId: string;
  
  date: string | Date;
  startTime: string;
  endTime: string;
  
  notes?: string | null;
}

export interface CreateClassSessionPayload extends ClassSessionBase {
  isRecurring?: boolean;
  startDate?: string;
  endDate?: string;
  daysOfWeek?: number[];
}

// Расширенный тип с поддержкой флагов конфликтов
export interface CreateClassSessionWithConflictsPayload extends CreateClassSessionPayload {
  skipConflicts?: boolean;
  forceCreate?: boolean;
  sessionActions?: SessionAction[];
  // Whether to run availability checks that produce soft errors
  // (e.g. 講師不在 / 生徒不在). When false, server should only consider
  // hard overlaps like TEACHER_CONFLICT / STUDENT_CONFLICT / BOOTH_CONFLICT.
  checkAvailability?: boolean;
}

export interface UpdateClassSessionPayload {
  classId: string;
  teacherId?: string;
  studentId?: string;
  subjectId?: string;
  boothId?: string;
  classTypeId?: string;
  date?: string | Date;
  startTime?: string;
  endTime?: string;
  notes?: string | null;
  
  isRecurring?: boolean;
  startDate?: string;
  endDate?: string;
  daysOfWeek?: number[];
}

export interface NewClassSessionData {
  date: Date;
  startTime: string;
  endTime: string;
  boothId: string;
}

export interface SessionAction {
  date: string;
  action: 'SKIP' | 'FORCE_CREATE' | 'USE_ALTERNATIVE' | 'RESET';
  alternativeStartTime?: string;
  alternativeEndTime?: string;
}

// Типы для обработки конфликтов
export type ConflictType = 
  | 'STUDENT_UNAVAILABLE' 
  | 'TEACHER_UNAVAILABLE' 
  | 'TEACHER_WRONG_TIME' 
  | 'STUDENT_WRONG_TIME' 
  | 'VACATION' 
  | 'BOOTH_CONFLICT'
  | 'NO_SHARED_AVAILABILITY';

export interface ConflictParticipant {
  id: string;
  name: string;
  role: 'student' | 'teacher';
}

export interface ConflictAvailableSlot {
  startTime: string; // "HH:MM" format
  endTime: string;   // "HH:MM" format
}

export interface ConflictData {
  date: string; // "YYYY-MM-DD" format
  dayOfWeek: string; // "FRIDAY", "MONDAY", etc.
  type: ConflictType;
  details: string; // Japanese message like "佐藤 花子さんはこの日に利用可能時間が設定されていません"
  participant: ConflictParticipant;
  sharedAvailableSlots: ConflictAvailableSlot[]; // Добавляем поле из примера JSON
  teacherSlots: ConflictAvailableSlot[]; // Добавляем поле из примера JSON
  studentSlots: ConflictAvailableSlot[]; // Добавляем поле из примера JSON
  availabilityStrategy: string; // Добавляем поле из примера JSON
  availableSlots: ConflictAvailableSlot[];
}

export interface ConflictSummary {
  totalSessions: number;
  sessionsWithConflicts: number;
  validSessions: number;
}

export interface ConflictResponse {
  conflicts: ConflictData[];
  conflictsByDate: Record<string, ConflictData[]>; // Grouped by date for easier processing
  message: string; // Main conflict message in Japanese
  requiresConfirmation: boolean;
  summary: ConflictSummary;
}

export type ConflictResolutionAction = 'CANCEL' | 'SKIP' | 'FORCE';

export interface ConflictResolutionState {
  conflicts: ConflictData[];
  isVisible: boolean;
  selectedAction: ConflictResolutionAction | null;
}

export function formatDateToString(date: Date | string): string {
  if (date instanceof Date) {
    // Format the date using local time to avoid timezone conversion issues
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } else if (typeof date === 'string') {
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return date;
    }
    try {
      const parsedDate = new Date(date);
      const year = parsedDate.getFullYear();
      const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
      const day = String(parsedDate.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } catch (e) {
      console.error("Ошибка преобразования даты:", e);
      return '';
    }
  }
  return '';
}
