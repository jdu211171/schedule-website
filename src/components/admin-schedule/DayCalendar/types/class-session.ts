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