// components/match/hooks/useMatchSubjects.ts
import { useQuery } from '@tanstack/react-query';
import { fetchSubjects } from '../api-client';
import { PaginationParams } from '../types';

export function useMatchSubjects(params: PaginationParams = {}) {
  const { page = 1, limit = 10 } = params;
  
  return useQuery({
    queryKey: ['matchSubjects', params],
    queryFn: () => fetchSubjects({ ...params, page, limit }),
  });
}