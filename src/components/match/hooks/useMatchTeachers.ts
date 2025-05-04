// components/match/hooks/useMatchTeachers.ts
import { useQuery } from '@tanstack/react-query';
import { fetchTeachers } from '../api-client';
import { TeacherParams } from '../types';

export function useMatchTeachers(params: TeacherParams = {}) {
  const { page = 1, limit = 10, subjectId, evaluationId } = params;
  
  return useQuery({
    queryKey: ['matchTeachers', { ...params, subjectId, evaluationId }],
    queryFn: () => fetchTeachers({ 
      ...params, 
      page, 
      limit,
      // Передаем параметры фильтрации в API-запрос
      ...(subjectId ? { subjectId } : {}),
      ...(evaluationId ? { evaluationId } : {})
    }),
  });
}