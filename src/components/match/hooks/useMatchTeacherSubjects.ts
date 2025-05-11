// components/match/hooks/useMatchTeacherSubjects.ts
import { useQuery } from '@tanstack/react-query';
import { fetchTeacherSubjects } from '../api-client';
import { PaginationParams } from '../types';

export function useMatchTeacherSubjects(params: PaginationParams & { teacherId?: string, subjectId?: string } = {}) {
  return useQuery({
    queryKey: ['matchTeacherSubjects', params],
    queryFn: () => fetchTeacherSubjects(params),
    staleTime: 10 * 60 * 1000, // Кеширование на 10 минут (меняющиеся данные, но не очень часто)
  });
}