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
  CompatibleStudentsResponse
} from './types';



const API_URL = 'http://localhost:3000/api';

// API функции для учителей
export const fetchTeachers = async (params: TeacherParams = {}): Promise<TeacherResponse> => {
  const { data } = await axios.get(`${API_URL}/teacher`, { params });
  return data;
};

export const fetchTeacherById = async (teacherId: string) => {
  const { data } = await axios.get(`${API_URL}/teacher/${teacherId}`);
  return data;
};

// API функции для учеников
export const fetchStudents = async (params: StudentParams = {}): Promise<StudentResponse> => {
  const { data } = await axios.get(`${API_URL}/student`, { params });
  return data;
};

export const fetchStudentById = async (studentId: string) => {
  const { data } = await axios.get(`${API_URL}/student/${studentId}`);
  return data;
};

// API функции для предметов
export const fetchSubjects = async (params: PaginationParams = {}): Promise<SubjectResponse> => {
  const { data } = await axios.get(`${API_URL}/subjects`, { params });
  return data;
};

// API функции для оценок
export const fetchEvaluations = async (params: PaginationParams = {}) => {
  const { data } = await axios.get(`${API_URL}/evaluation`, { params });
  return data;
};

// API функции для классов/уровней
export const fetchGrades = async (params: PaginationParams = {}) => {
  const { data } = await axios.get(`${API_URL}/grades`, { params });
  return data;
};

// API функции для типов учеников
export const fetchStudentTypes = async (params: PaginationParams = {}): Promise<StudentTypeResponse> => {
  const { data } = await axios.get(`${API_URL}/student-type`, { params });
  return data;
};

// API функции для связей между учителями и предметами
export const fetchTeacherSubjects = async (params: PaginationParams & { teacherId?: string, subjectId?: string } = {}) => {
  const { data } = await axios.get(`${API_URL}/teacher-subjects`, { params });
  return data;
};

// API функции для совместимости
export const fetchCompatibleTeachers = async (studentId: string): Promise<CompatibleTeachersResponse> => {
  try {
    const { data } = await axios.get(`${API_URL}/regular-class-templates`, {
      params: {
        action: 'compatible-teachers',
        studentId
      }
    });
    
    // Логирование для отладки
    console.log("API response for compatible teachers:", data);
    
    return data;
  } catch (err) {
    console.error("Error fetching compatible teachers:", err);
    // Возвращаем пустую структуру в соответствии с интерфейсом
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
    
    // Логирование для отладки
    console.log("API response for compatible students:", data);
    
    return data;
  } catch (err) {
    console.error("Error fetching compatible students:", err);
    // Возвращаем пустую структуру в соответствии с интерфейсом
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

// API функции для классов
export const fetchClassSessions = async (params: PaginationParams & { 
  teacherId?: string, 
  studentId?: string,
  subjectId?: string
} = {}): Promise<ClassSessionResponse> => {
  const { data } = await axios.get(`${API_URL}/regular-class-templates`, { params });
  return data;
};