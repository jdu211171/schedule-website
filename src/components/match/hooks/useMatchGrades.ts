// components/match/hooks/useMatchGrades.ts
import { useQuery } from '@tanstack/react-query';
import { fetchGrades } from '../api-client';
import { PaginationParams } from '../types';

export function useMatchGrades(params: PaginationParams = {}) {
  const { page = 1, limit = 10 } = params;
  
  return useQuery({
    queryKey: ['matchGrades', params],
    queryFn: () => fetchGrades({ ...params, page, limit }),
  });
}