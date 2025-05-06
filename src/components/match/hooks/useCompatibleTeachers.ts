// components/match/hooks/useCompatibleTeachers.ts
import { useQuery } from '@tanstack/react-query';
import { fetchCompatibleTeachers } from '../api-client';
import { Teacher, Subject } from '../types';

export function useCompatibleTeachers(studentId: string | null) {
  return useQuery({
    queryKey: ['compatibleTeachers', studentId],
    queryFn: async () => {
      if (!studentId) {
        return { filteredTeachers: [] as Teacher[], kibouSubjects: [] as Subject[] };
      }
      
      const response = await fetchCompatibleTeachers(studentId);
      
      const data = response.data;
      
      const teachers = [
        ...(data.preferredTeachers || []),
        ...(data.subjectTeachers || []),
        ...(data.otherTeachers || [])
      ];
      
      const finalTeachers = teachers.length > 0 ? teachers : (data.allTeachers || []);
      
      const filteredTeachers = data.filteredTeachers && data.filteredTeachers.length > 0
        ? data.filteredTeachers 
        : finalTeachers;
      
      const kibouSubjects = data.kibouSubjects || [];
      
      return {
        filteredTeachers,
        kibouSubjects
      };
    },
    enabled: !!studentId, // Запрос будет выполнен только если studentId не null и не пустой
    staleTime: 3 * 60 * 1000, // Кеширование на 3 минуты
  });
}