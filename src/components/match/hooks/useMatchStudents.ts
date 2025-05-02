// components/match/hooks/useMatchStudents.ts
import { useQuery } from '@tanstack/react-query';
import { fetchStudents } from '../api-client';
import { StudentParams } from '../types';

export function useMatchStudents(params: StudentParams = {}) {
  const { page = 1, limit = 10 } = params;
  
  return useQuery({
    queryKey: ['matchStudents', params],
    queryFn: () => fetchStudents({ ...params, page, limit }),
  });
}