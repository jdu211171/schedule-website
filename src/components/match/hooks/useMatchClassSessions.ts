// components/match/hooks/useMatchClassSessions.ts
import { useQuery } from '@tanstack/react-query';
import { fetchClassSessions } from '../api-client';
import { PaginationParams } from '../types';

export function useMatchClassSessions(params: PaginationParams & { 
  teacherId?: string, 
  studentId?: string,
  subjectId?: string,
  dayOfWeek?: string | number
} = {}) {
  return useQuery({
    queryKey: ['matchClassSessions', params],
    queryFn: () => fetchClassSessions(params),
    staleTime: 5 * 60 * 1000, // Кеширование на 5 минут (данные, которые могут меняться)
  });
}