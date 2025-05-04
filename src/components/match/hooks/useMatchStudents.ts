// components/match/hooks/useMatchStudents.ts
import { useQuery } from '@tanstack/react-query';
import { fetchStudents } from '../api-client';
import { StudentParams } from '../types';

/**
 * Хук для получения списка студентов с возможностью фильтрации
 */
export function useMatchStudents(params: StudentParams = {}) {
  const { 
    page = 1, 
    limit = 10, 
    gradeId, 
    studentTypeId,
    preferredSubjectId,
    examSchoolType
  } = params;
  
  return useQuery({
    queryKey: ['matchStudents', { 
      ...params, 
      gradeId, 
      studentTypeId, 
      preferredSubjectId,
      examSchoolType
    }],
    queryFn: () => fetchStudents(params)
  });
}