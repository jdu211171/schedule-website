// components/match/hooks/useMatchSubjects.ts
import { useQuery } from '@tanstack/react-query';
import { fetchSubjects } from '../api-client';
import { PaginationParams } from '../types';

export function useMatchSubjects(params: PaginationParams = {}) {
  return useQuery({
    queryKey: ['matchSubjects', params],
    queryFn: () => fetchSubjects(params),
    staleTime: 30 * 60 * 1000, // Кеширование на 30 минут (редко меняющиеся данные)
  });
}