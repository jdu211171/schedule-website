// components/match/hooks/useMatchClassSessions.ts
import { useQuery } from '@tanstack/react-query';
import { fetchClassSessions } from '../api-client';
import { PaginationParams } from '../types';

export function useMatchClassSessions(params: PaginationParams & { 
  teacherId?: string, 
  studentId?: string,
  subjectId?: string
} = {}) {
  
  return useQuery({
    queryKey: ['matchClassSessions', params],
    queryFn: () => fetchClassSessions(params),
  });
}