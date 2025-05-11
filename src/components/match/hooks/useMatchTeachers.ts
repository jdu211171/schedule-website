// components/match/hooks/useMatchTeachers.ts
import { useQuery } from '@tanstack/react-query';
import { fetchTeachers } from '../api-client';
import { TeacherParams } from '../types';

export function useMatchTeachers(params: TeacherParams = {}) {
  return useQuery({
    queryKey: ['matchTeachers', params],
    queryFn: () => fetchTeachers(params),
    staleTime: 2 * 60 * 1000, // Кеширование на 2 минуты
  });
}