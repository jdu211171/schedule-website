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
      
      // Получаем данные из response.data
      const data = response.data;
      
      // Собираем учителей из всех категорий
      const teachers = [
        ...(data.preferredTeachers || []),
        ...(data.subjectTeachers || []),
        ...(data.otherTeachers || [])
      ];
      
      // Если категории пусты, используем общий список
      const finalTeachers = teachers.length > 0 ? teachers : (data.allTeachers || []);
      
      // Используем filteredTeachers, если они есть, иначе используем собранный список
      const filteredTeachers = data.filteredTeachers && data.filteredTeachers.length > 0
        ? data.filteredTeachers 
        : finalTeachers;
      
      // Используем kibouSubjects, если они есть
      const kibouSubjects = data.kibouSubjects || [];
      
      return {
        filteredTeachers,
        kibouSubjects
      };
    },
    enabled: !!studentId,
  });
}