import axios from 'axios';
import {
  TeacherParams,
  TeacherResponse,
  StudentParams,
  StudentResponse,
  PaginationParams,
  SubjectResponse,
  StudentTypeResponse,
  ClassSessionResponse,
  CompatibleTeachersResponse,
  CompatibleStudentsResponse,
  DisplayLesson,
  RegularClassTemplate,
  TemplateDataFromAPI
} from './types';

const API_URL = 'http://localhost:3000/api';

// API functions for teachers
export const fetchTeachers = async (params: TeacherParams = {}): Promise<TeacherResponse> => {
  const { data } = await axios.get(`${API_URL}/teacher`, { params });
  return data;
};

export const fetchTeacherById = async (teacherId: string) => {
  const { data } = await axios.get(`${API_URL}/teacher/${teacherId}`);
  return data;
};

// API functions for students
export const fetchStudents = async (params: StudentParams = {}): Promise<StudentResponse> => {
  const { data } = await axios.get(`${API_URL}/student`, { params });
  return data;
};

export const fetchStudentById = async (studentId: string) => {
  const { data } = await axios.get(`${API_URL}/student/${studentId}`);
  return data;
};

// API functions for subjects
export const fetchSubjects = async (params: PaginationParams = {}): Promise<SubjectResponse> => {
  const { data } = await axios.get(`${API_URL}/subjects`, { params });
  return data;
};

// API functions for evaluations
export const fetchEvaluations = async (params: PaginationParams = {}) => {
  const { data } = await axios.get(`${API_URL}/evaluation`, { params });
  return data;
};

// API functions for grades/levels
export const fetchGrades = async (params: PaginationParams = {}) => {
  const { data } = await axios.get(`${API_URL}/grades`, { params });
  return data;
};

// API functions for student types
export const fetchStudentTypes = async (params: PaginationParams = {}): Promise<StudentTypeResponse> => {
  const { data } = await axios.get(`${API_URL}/student-type`, { params });
  return data;
};

// API functions for teacher-subject relationships
export const fetchTeacherSubjects = async (params: PaginationParams & { teacherId?: string, subjectId?: string } = {}) => {
  const { data } = await axios.get(`${API_URL}/teacher-subjects`, { params });
  return data;
};

// API functions for compatibility
export const fetchCompatibleTeachers = async (studentId: string): Promise<CompatibleTeachersResponse> => {
  try {
    const { data } = await axios.get(`${API_URL}/regular-class-templates`, {
      params: {
        action: 'compatible-teachers',
        studentId
      }
    });
    
    // console.log("API response for compatible teachers:", data);
    
    return data;
  } catch (err) {
    console.error("Error fetching compatible teachers:", err);
    return { 
      data: {
        preferredTeachers: [],
        subjectTeachers: [],
        otherTeachers: [],
        allTeachers: [],
        filteredTeachers: [],
        kibouSubjects: []
      }
    };
  }
};

export const fetchCompatibleStudents = async (teacherId: string): Promise<CompatibleStudentsResponse> => {
  try {
    const { data } = await axios.get(`${API_URL}/regular-class-templates`, {
      params: {
        action: 'compatible-students',
        teacherId
      }
    });
    
    // console.log("API response for compatible students:", data);
    
    return data;
  } catch (err) {
    console.error("Error fetching compatible students:", err);
    return { 
      data: {
        preferredStudents: [],
        subjectStudents: [],
        otherStudents: [],
        allStudents: [],
        filteredStudents: [],
        kibouSubjects: []
      }
    };
  }
};

// Interface for compatible subjects response
import { CompatibleSubjectsResponse, AvailableTimeSlotsResponse, AvailableBoothsResponse } from './types';

// API functions for class sessions
export const fetchClassSessions = async (params: PaginationParams & { 
  teacherId?: string, 
  studentId?: string,
  subjectId?: string,
  dayOfWeek?: string | number
} = {}): Promise<ClassSessionResponse> => {
  try {
    const { data } = await axios.get(`${API_URL}/regular-class-templates`, { params });
    // console.log('Fetched class sessions:', data);
    return data;
  } catch (err) {
    console.error('Error fetching class sessions:', err);
    return { data: [] };
  }
};

// Function for fetching compatible subjects
export const fetchCompatibleSubjects = async (teacherId: string, studentId: string): Promise<CompatibleSubjectsResponse> => {
  try {
    const { data } = await axios.get(`${API_URL}/regular-class-templates`, {
      params: {
        action: 'compatible-subjects',
        teacherId,
        studentId
      }
    });
    
    // console.log("API response for compatible subjects:", data);
    
    return data;
  } catch (err) {
    console.error("Error fetching compatible subjects:", err);
    return {
      data: {
        commonSubjects: [],
        otherSubjects: [],
        allSubjects: []
      }
    };
  }
};

// Function for fetching available time slots
export const fetchAvailableTimeSlots = async (teacherId: string, studentId: string): Promise<AvailableTimeSlotsResponse> => {
  try {
    const { data } = await axios.get(`${API_URL}/regular-class-templates`, {
      params: {
        action: 'available-time-slots',
        teacherId,
        studentId
      }
    });
    
    // console.log("API response for available time slots:", data);
    
    return data;
  } catch (err) {
    console.error("Error fetching available time slots:", err);
    return {
      data: {
        availableSlots: [],
        teacherShifts: [],
        studentPreferences: []
      }
    };
  }
};

// Function for fetching available booths
export const fetchAvailableBooths = async (dayOfWeek: string, startTime: string, endTime: string): Promise<AvailableBoothsResponse> => {
  try {
    const { data } = await axios.get(`${API_URL}/regular-class-templates`, {
      params: {
        action: 'available-booths',
        dayOfWeek,
        startTime,
        endTime
      }
    });
    
    // console.log("API response for available booths:", data);
    
    return data;
  } catch (err) {
    console.error("Error fetching available booths:", err);
    return { data: [] };
  }
};

// Function for creating regular class template
export const createRegularClassTemplate = async (templateData: RegularClassTemplate) => {
  try {
    const { data } = await axios.post(`${API_URL}/regular-class-templates`, templateData);
    // console.log("Created template:", data);
    return data;
  } catch (err) {
    console.error("Error creating regular class template:", err);
    throw err;
  }
};

// Function for transforming regular template data to DisplayLesson format
export const transformTemplateToDisplayLesson = (
  template: TemplateDataFromAPI, 
  teacherName: string, 
  studentName: string,
  lessonType?: 'teacher' | 'student' | 'current'
): DisplayLesson => {
  // console.log("Transforming template:", template);
  
  const id = template.templateId || template.id || `temp-${Date.now()}`;
  
  let subjectName = "Unknown Subject";
  if (template.subject && 'name' in template.subject && template.subject.name) {
    subjectName = template.subject.name;
  } else if (template.subjectName) {
    subjectName = template.subjectName;
  }
  
  const formatTime = (timeStr?: string): string => {
    if (!timeStr) return "00:00";
    if (timeStr.includes("T")) {
      try {
        const date = new Date(timeStr);
        return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
      } catch (e) {
        console.error("Error formatting time:", e);
        return timeStr;
      }
    }
    return timeStr;
  };
  
  const studentId = template.studentIds?.[0] || template.studentId || "";
  
  let dayOfWeekStr = "MONDAY"; 
  if (template.dayOfWeek !== undefined) {
    const dayOfWeekMap: Record<string, string> = {
      "0": "SUNDAY",
      "1": "MONDAY",
      "2": "TUESDAY",
      "3": "WEDNESDAY",
      "4": "THURSDAY",
      "5": "FRIDAY",
      "6": "SATURDAY"
    };
    
    const dayVal = String(template.dayOfWeek);
    if (dayOfWeekMap[dayVal]) {
      dayOfWeekStr = dayOfWeekMap[dayVal];
    } else {
      dayOfWeekStr = dayVal;
    }
  }
  
  return {
    id,
    name: subjectName,
    dayOfWeek: dayOfWeekStr,
    startTime: formatTime(template.startTime),
    endTime: formatTime(template.endTime),
    status: template.status || 'active',
    teacherId: template.teacherId || "",
    studentId,
    subjectId: template.subjectId,
    subjectName,
    teacherName: teacherName,
    studentName: studentName,
    room: template.booth?.name || "",
    lessonType: lessonType 
  };
};