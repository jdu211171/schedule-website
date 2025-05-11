// components/match/hooks/useCompatibleStudents.ts
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
      
      const data = response.data;
      
      const students = [
        ...(data.preferredStudents || []),
        ...(data.subjectStudents || []),
        ...(data.otherStudents || [])
      ];
      
      const finalStudents = students.length > 0 ? students : (data.allStudents || []);
      
      const filteredStudents = data.filteredStudents && data.filteredStudents.length > 0  
        ? data.filteredStudents 
        : finalStudents;
      
      const kibouSubjects = data.kibouSubjects || [];
      
      return {
        filteredStudents,
        kibouSubjects
      };
    },
    enabled: !!teacherId, // Запрос будет выполнен только если teacherId не null и не пустой
    staleTime: 3 * 60 * 1000, // Кеширование на 3 минуты
  });
}