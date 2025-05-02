// components/match/hooks/useMatchStudentTypes.ts
import { useQuery } from '@tanstack/react-query';
import { fetchStudentTypes } from '../api-client';
import { PaginationParams } from '../types';

export function useMatchStudentTypes(params: PaginationParams = {}) {
  const { page = 1, limit = 10 } = params;
  
  return useQuery({
    queryKey: ['matchStudentTypes', params],
    queryFn: () => fetchStudentTypes({ ...params, page, limit }),
  });
}