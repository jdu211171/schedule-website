import { useState, useEffect, useRef } from 'react';

export type DayOfWeek = 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';

export const dateToDayOfWeek = (date: Date): DayOfWeek => {
  const days: DayOfWeek[] = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
  return days[date.getDay()];
};

export interface ClassSession {
  classId: string;
  date: string;
  startTime: string;
  endTime: string;
  duration: string;
  teacherId: string;
  studentId: string;
  subjectId: string;
  boothId: string;
  classTypeId: string;
  templateId: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  booth: {
    boothId: string;
    name: string;
    status: boolean;
    notes: string | null;
    createdAt: string;
    updatedAt: string;
  };
  classType: {
    classTypeId: string;
    name: string;
    notes: string;
    createdAt: string;
    updatedAt: string;
  };
  subject: {
    subjectId: string;
    name: string;
    subjectTypeId: string;
    notes: string | null;
    createdAt: string;
    updatedAt: string;
  };
  teacher: {
    teacherId: string;
    name: string;
    evaluationId: string;
    birthDate: string;
    mobileNumber: string;
    email: string;
    highSchool: string;
    university: string;
    faculty: string;
    department: string;
    enrollmentStatus: string;
    otherUniversities: string | null;
    englishProficiency: string | null;
    toeic: string | null;
    toefl: string | null;
    mathCertification: string | null;
    kanjiCertification: string | null;
    otherCertifications: string | null;
    notes: string | null;
    userId: string;
    createdAt: string;
    updatedAt: string;
  };
  student: {
    studentId: string;
    name: string;
    kanaName: string;
    gradeId: string;
    schoolName: string;
    schoolType: string | null;
    examSchoolType: string | null;
    examSchoolCategoryType: string | null;
    firstChoiceSchool: string | null;
    secondChoiceSchool: string | null;
    enrollmentDate: string;
    birthDate: string;
    homePhone: string | null;
    parentMobile: string;
    studentMobile: string;
    parentEmail: string;
    notes: string | null;
    userId: string;
    createdAt: string;
    updatedAt: string;
  };
  regularClassTemplate: null | string;
  studentClassEnrollments: Array<{
    enrollmentId: string;
    classId: string;
    studentId: string;
    status: string;
    notes: string | null;
    createdAt: string;
    updatedAt: string;
    student: {
      studentId: string;
      name: string;
      kanaName: string;
      gradeId: string;
      schoolName: string;
      schoolType: string | null;
      examSchoolType: string | null;
      examSchoolCategoryType: string | null;
      firstChoiceSchool: string | null;
      secondChoiceSchool: string | null;
      enrollmentDate: string;
      birthDate: string;
      homePhone: string | null;
      parentMobile: string;
      studentMobile: string;
      parentEmail: string;
      notes: string | null;
      userId: string;
      createdAt: string;
      updatedAt: string;
    };
  }>;
}

export interface ApiResponse {
  data: ClassSession[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

interface FetchParams {
  dayOfWeek?: DayOfWeek | DayOfWeek[]; 
  date?: string; 
  page?: number;
  limit?: number;
  teacherId?: string | string[];
  studentId?: string | string[];
  subjectId?: string | string[];
  boothId?: string | string[];
  classTypeId?: string | string[];
  sort?: string;
  order?: 'asc' | 'desc';
}

export const useScheduleClassSessions = (params?: FetchParams) => {
  const [data, setData] = useState<ClassSession[]>([]);
  const [pagination, setPagination] = useState<ApiResponse['pagination'] | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const paramsRef = useRef<FetchParams | undefined>(undefined);

  useEffect(() => {
    const isDifferent = JSON.stringify(params) !== JSON.stringify(paramsRef.current);
    if (!isDifferent) {
      return; 
    }
    paramsRef.current = JSON.parse(JSON.stringify(params));
    const fetchClassSessions = async () => {
      try {
        setIsLoading(true);
        let url = '/api/class-session';
        const queryParams: string[] = [];
        const addArrayParam = (name: string, value: string | string[] | undefined) => {
          if (!value) return;
          if (Array.isArray(value)) {
            value.forEach(v => queryParams.push(`${name}=${v}`));
          } else {
            queryParams.push(`${name}=${value}`);
          }
        };
        addArrayParam('dayOfWeek', params?.dayOfWeek);
        if (!params?.dayOfWeek && params?.date) {
          queryParams.push(`date=${params.date}`);
        }
        if (params?.page) {
          queryParams.push(`page=${params.page}`);
        }
        if (params?.limit) {
          queryParams.push(`limit=${params.limit}`);
        }
        
        addArrayParam('teacherId', params?.teacherId);
        addArrayParam('studentId', params?.studentId);
        addArrayParam('subjectId', params?.subjectId);
        addArrayParam('boothId', params?.boothId);
        addArrayParam('classTypeId', params?.classTypeId);
        
        if (params?.sort) {
          queryParams.push(`sort=${params.sort}`);
          if (params?.order) {
            queryParams.push(`order=${params.order}`);
          }
        }
        if (queryParams.length > 0) {
          url += `?${queryParams.join('&')}`;
        }
        console.log('Fetching class sessions from:', url);
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`API Error: ${response.status}`);
        }
        const jsonData: ApiResponse = await response.json();
        if (jsonData && jsonData.data && Array.isArray(jsonData.data)) {
          setData(jsonData.data);
          setPagination(jsonData.pagination);
        } else {
          setData([]);
          setPagination(null);
        }
      } catch (err) {
        console.error('Error fetching class sessions:', err);
        setError(err instanceof Error ? err : new Error(String(err)));
        setData([]);
        setPagination(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchClassSessions();
  }, [params]); 

  return { data, pagination, isLoading, error };
};