// components/match/hooks/useMatchEvaluations.ts
import { useQuery } from '@tanstack/react-query';
import { fetchEvaluations } from '../api-client';
import { PaginationParams } from '../types';

export function useMatchEvaluations(params: PaginationParams = {}) {
  return useQuery({
    queryKey: ['matchEvaluations', params],
    queryFn: () => fetchEvaluations(params),
    staleTime: 30 * 60 * 1000, // Кеширование на 30 минут (редко меняющиеся данные)
  });
}