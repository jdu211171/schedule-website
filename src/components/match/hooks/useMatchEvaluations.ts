// components/match/hooks/useMatchEvaluations.ts
import { useQuery } from '@tanstack/react-query';
import { fetchEvaluations } from '../api-client';
import { PaginationParams } from '../types';

export function useMatchEvaluations(params: PaginationParams = {}) {
  const { page = 1, limit = 10 } = params;
  
  return useQuery({
    queryKey: ['matchEvaluations', params],
    queryFn: () => fetchEvaluations({ ...params, page, limit }),
  });
}