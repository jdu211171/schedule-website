// components/match/hooks/useMatchStudentTypes.ts
import { useQuery } from '@tanstack/react-query';
import { fetchStudentTypes } from '../api-client';
import { PaginationParams } from '../types';

export function useMatchStudentTypes(params: PaginationParams = {}) {
  return useQuery({
    queryKey: ['matchStudentTypes', params],
    queryFn: () => fetchStudentTypes(params),
    staleTime: 60 * 60 * 1000, // Кеширование на 1 час (редко меняющиеся данные)
  });
}