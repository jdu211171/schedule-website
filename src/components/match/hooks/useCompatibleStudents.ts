import { useQuery } from '@tanstack/react-query';
import { fetchCompatibleStudents } from '../api-client';
import { StudentWithPreference, Subject } from '../types';

export function useCompatibleStudents(teacherId: string | null) {
  return useQuery({
    queryKey: ['compatibleStudents', teacherId],
    queryFn: async () => {
      if (!teacherId) {
        return { filteredStudents: [] as StudentWithPreference[], kibouSubjects: [] as Subject[] };
      }
      
      const response = await fetchCompatibleStudents(teacherId);
      
      // Получаем данные из response.data
      const data = response.data;
      
      // Собираем студентов из всех категорий
      const students = [
        ...(data.preferredStudents || []),
        ...(data.subjectStudents || []),
        ...(data.otherStudents || [])
      ];
      
      // Если категории пусты, используем общий список
      const finalStudents = students.length > 0 ? students : (data.allStudents || []);
      
      // Используем filteredStudents, если они есть, иначе используем собранный список
      const filteredStudents = data.filteredStudents && data.filteredStudents.length > 0  
        ? data.filteredStudents 
        : finalStudents;
      
      // Используем kibouSubjects, если они есть
      const kibouSubjects = data.kibouSubjects || [];
      
      return {
        filteredStudents,
        kibouSubjects
      };
    },
    enabled: !!teacherId,
  });
}