// components/match/hooks/useMatchGrades.ts
import { useQuery } from '@tanstack/react-query';
import { fetchGrades } from '../api-client';
import { PaginationParams } from '../types';

export function useMatchGrades(params: PaginationParams = {}) {
  return useQuery({
    queryKey: ['matchGrades', params],
    queryFn: () => fetchGrades(params),
    staleTime: 60 * 60 * 1000, // Кеширование на 1 час (редко меняющиеся данные)
  });
}