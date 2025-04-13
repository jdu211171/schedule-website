export interface Teacher {
    id: string;
    name: string;
    subject: string[];
  }
  
  export interface Student {
    id: string;
    name: string;
    subject: string[];
  }
  
  export interface Lesson {
    id: string;
    name: string;
    dayOfWeek: string;
    startTime: string;
    endTime: string;
    status: string;
    teacherId: string;
    studentId: string;
  }