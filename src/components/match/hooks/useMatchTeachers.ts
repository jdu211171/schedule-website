// components/match/hooks/useMatchTeachers.ts
import { useQuery } from '@tanstack/react-query';
import { fetchTeachers } from '../api-client';
import { TeacherParams } from '../types';

export function useMatchTeachers(params: TeacherParams = {}) {
  const { page = 1, limit = 10 } = params;
  
  return useQuery({
    queryKey: ['matchTeachers', params],
    queryFn: () => fetchTeachers({ ...params, page, limit }),
  });
}