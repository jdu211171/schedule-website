// src/types/class-session.ts

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
  
  export function formatDateToString(date: Date | string): string {
    if (date instanceof Date) {
      return date.toISOString().split('T')[0];
    } else if (typeof date === 'string') {
      if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return date;
      }
      try {
        return new Date(date).toISOString().split('T')[0];
      } catch (e) {
        console.error("Ошибка преобразования даты:", e);
        return '';
      }
    }
    return '';
  }