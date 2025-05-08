// Улучшенные API-функции с использованием новых эндпоинтов
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
  TemplateDataFromAPI,
  CompatibleSubjectsResponse, 
  AvailableTimeSlotsResponse, 
  AvailableBoothsResponse
} from './types';

const API_URL = '/api';

// API functions for teachers
export const fetchTeachers = async (params: TeacherParams = {}): Promise<TeacherResponse> => {
  const urlParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined) return;
    
    if (Array.isArray(value)) {
      value.forEach(item => {
        urlParams.append(key, String(item));
      });
    } else {
      urlParams.append(key, String(value));
    }
  });
  
  const { data } = await axios.get(`${API_URL}/teacher?${urlParams.toString()}`);
  return data;
};

export const fetchTeacherById = async (teacherId: string) => {
  const { data } = await axios.get(`${API_URL}/teacher/${teacherId}`);
  return data;
};

// API functions for students
export const fetchStudents = async (params: StudentParams = {}): Promise<StudentResponse> => {
  const urlParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined) return;
    
    if (Array.isArray(value)) {
      value.forEach(item => {
        urlParams.append(key, String(item));
      });
    } else {
      urlParams.append(key, String(value));
    }
  });
  
  const { data } = await axios.get(`${API_URL}/student?${urlParams.toString()}`);
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

/**
 * Получение типов классов
 */
export const fetchClassTypes = async (params: PaginationParams = {}) => {
  try {
    const { data } = await axios.get(`${API_URL}/class-type`, { params });
    return data;
  } catch (err) {
    console.error('Error fetching class types:', err);
    return { data: [] };
  }
};

// API functions for teacher-subject relationships
export const fetchTeacherSubjects = async (params: PaginationParams & { teacherId?: string, subjectId?: string } = {}) => {
  const { data } = await axios.get(`${API_URL}/teacher-subjects`, { params });
  return data;
};

/**
 * Получение совместимых учителей для студента (с приоритетом)
 * Использует новый эндпоинт action=compatible-teachers
 */
export const fetchCompatibleTeachers = async (studentId: string): Promise<CompatibleTeachersResponse> => {
  try {
    const { data } = await axios.get(`${API_URL}/regular-class-templates`, {
      params: {
        action: 'compatible-teachers',
        studentId
      }
    });
    
    // Упрощаем проверку результата
    if (!data || !data.data) {
      throw new Error('Invalid response data');
    }
    
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

/**
 * Получение совместимых студентов для учителя (с приоритетом)
 * Использует новый эндпоинт action=compatible-students
 */
export const fetchCompatibleStudents = async (teacherId: string): Promise<CompatibleStudentsResponse> => {
  try {
    const { data } = await axios.get(`${API_URL}/regular-class-templates`, {
      params: {
        action: 'compatible-students',
        teacherId
      }
    });
    
    // Упрощаем проверку результата
    if (!data || !data.data) {
      throw new Error('Invalid response data');
    }
    
    return data;
  } catch (err) {
    console.error("Error fetching compatible students:", err);
    
    // Возвращаем структуру по умолчанию в случае ошибки
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

/**
 * Получение регулярных шаблонов уроков (сессий) с фильтрацией
 * @param params Параметры фильтрации
 * @returns Список шаблонов (сессий)
 */
export const fetchClassSessions = async (params: PaginationParams & { 
  teacherId?: string, 
  studentId?: string,
  subjectId?: string,
  dayOfWeek?: string | number
} = {}): Promise<ClassSessionResponse> => {
  try {
    const { data } = await axios.get(`${API_URL}/regular-class-templates`, { params });
    return data;
  } catch (err) {
    console.error('Error fetching class sessions:', err);
    return { data: [] };
  }
};

/**
 * Получение совместимых предметов для учителя и студента
 * Использует новый эндпоинт action=compatible-subjects
 */
export const fetchCompatibleSubjects = async (teacherId: string, studentId: string): Promise<CompatibleSubjectsResponse> => {
  try {
    const { data } = await axios.get(`${API_URL}/regular-class-templates`, {
      params: {
        action: 'compatible-subjects',
        teacherId,
        studentId
      }
    });
    
    if (!data || !data.data) {
      throw new Error('Invalid response data');
    }
    
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

/**
 * Получение доступных временных слотов для учителя и студента
 * Использует новый эндпоинт action=available-time-slots
 */
export const fetchAvailableTimeSlots = async (teacherId: string, studentId: string): Promise<AvailableTimeSlotsResponse> => {
  try {
    const { data } = await axios.get(`${API_URL}/regular-class-templates`, {
      params: {
        action: 'available-time-slots',
        teacherId,
        studentId
      }
    });
    
    if (!data || !data.data) {
      throw new Error('Invalid response data');
    }
    
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

/**
 * Получение доступных кабинетов для конкретного дня и времени
 * Использует новый эндпоинт action=available-booths
 */
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
    
    if (!data) {
      throw new Error('Invalid response data');
    }
    
    return data;
  } catch (err) {
    console.error("Error fetching available booths:", err);
    
    return { data: [] };
  }
};

/**
 * Создание регулярного шаблона урока
 * @param templateData Данные для создания шаблона
 */
export const createRegularClassTemplate = async (templateData: RegularClassTemplate) => {
  try {
    const { data } = await axios.post(`${API_URL}/regular-class-templates`, templateData);
    console.log("Created template:", data);
    return data;
  } catch (err) {
    console.error("Error creating regular class template:", err);
    throw err;
  }
};

/**
 * Обновление существующего шаблона урока
 * @param templateData Данные для обновления шаблона
 */
export const updateRegularClassTemplate = async (templateData: {
  templateId: string;  
  dayOfWeek?: string;  
  startTime?: string;
  endTime?: string;
  teacherId?: string;
  subjectId?: string;
  boothId?: string;
  classTypeId?: string; 
  studentIds?: string[];
  notes?: string;
  startDate?: string;
  endDate?: string;
}) => {
  try {
    const { data } = await axios.put(`${API_URL}/regular-class-templates`, templateData);
    console.log("Updated template:", data);
    return data;
  } catch (err) {
    console.error("Error updating regular class template:", err);
    throw err;
  }
};

/**
 * Удаление шаблона урока
 * @param templateId ID шаблона для удаления
 */
export const deleteRegularClassTemplate = async (templateId: string) => {
  try {
    const { data } = await axios.delete(`${API_URL}/regular-class-templates?templateId=${templateId}`);
    console.log("Deleted template:", data);
    return data;
  } catch (err) {
    console.error("Error deleting regular class template:", err);
    throw err;
  }
};

/**
 * Создание нескольких шаблонов уроков (пакетное создание)
 * @param templates Массив шаблонов для создания
 */
export const createBatchRegularClassTemplates = async (templates: RegularClassTemplate[]) => {
  try {
    const { data } = await axios.post(`${API_URL}/regular-class-templates`, templates);
    console.log("Created batch templates:", data);
    return data;
  } catch (err) {
    console.error("Error creating batch templates:", err);
    throw err;
  }
};

/**
 * Преобразование данных шаблона из API в формат DisplayLesson
 */
export const transformTemplateToDisplayLesson = (
  template: TemplateDataFromAPI, 
  teacherName: string, 
  studentName: string,
  lessonType?: 'teacher' | 'student' | 'current'
): DisplayLesson => {
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
    templateId: template.templateId,
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
    boothId: template.boothId,
    lessonType: lessonType 
  };
};