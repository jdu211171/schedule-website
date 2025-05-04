// components/match/hooks/useMatchStudents.ts
import { useQuery } from '@tanstack/react-query';
import { fetchStudents } from '../api-client';
import { StudentParams } from '../types';

/**
 * Хук для получения списка студентов с возможностью фильтрации
 */
export function useMatchStudents(params: StudentParams = {}) {
  return useQuery({
    queryKey: ['matchStudents', params],
    queryFn: () => fetchStudents(params)
  });
}