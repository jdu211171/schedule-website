// components/match/hooks/useMatchStudents.ts
import { useQuery } from '@tanstack/react-query';
import { fetchStudents } from '../api-client';
import { StudentParams } from '../types';

export function useMatchStudents(params: StudentParams = {}) {
  return useQuery({
    queryKey: ['matchStudents', params],
    queryFn: () => fetchStudents(params),
    staleTime: 2 * 60 * 1000, // Кеширование на 2 минуты
  });
}