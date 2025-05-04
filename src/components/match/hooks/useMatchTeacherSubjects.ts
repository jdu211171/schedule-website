// components/match/hooks/useMatchTeacherSubjects.ts
import { useQuery } from '@tanstack/react-query';
import { fetchTeacherSubjects } from '../api-client';
import { PaginationParams } from '../types';

export function useMatchTeacherSubjects(params: PaginationParams & { teacherId?: string, subjectId?: string } = {}) {
  const { page = 1, limit = 10 } = params;
  
  return useQuery({
    queryKey: ['matchTeacherSubjects', params],
    queryFn: () => fetchTeacherSubjects({ ...params, page, limit }),
  });
}