// components/match/hooks/useRegularLessons.ts
import { useQuery } from '@tanstack/react-query';
import { fetchClassSessions } from '../api-client';
import { DisplayLesson, TemplateDataFromAPI } from '../types';
import { transformTemplateToDisplayLesson } from '../transformUtils';

interface UseRegularLessonsProps {
  teacherId: string;
  studentId: string;
  teacherName: string;
  studentName: string;
}

export function useRegularLessons({
  teacherId,
  studentId,
  teacherName,
  studentName
}: UseRegularLessonsProps) {
  // Getting all teacher's lessons
  const teacherLessonsQuery = useQuery<DisplayLesson[]>({
    queryKey: ['teacherLessons', teacherId],
    queryFn: async () => {
      const response = await fetchClassSessions({ teacherId });
      // console.log('Teacher lessons response:', response);
      
      if (!response || !response.data || !Array.isArray(response.data)) {
        console.error('Unexpected response format for teacher lessons:', response);
        return [];
      }
      
      const lessons: DisplayLesson[] = response.data.map((template: TemplateDataFromAPI) => 
        transformTemplateToDisplayLesson(
          template, 
          teacherName, 
          template.studentName || '未知の生徒',
          'teacher' // Specifying type explicitly
        )
      );
      
      // console.log('Transformed teacher lessons:', lessons);
      return lessons;
    },
    enabled: !!teacherId
  });

  // Getting all student's lessons
  const studentLessonsQuery = useQuery<DisplayLesson[]>({
    queryKey: ['studentLessons', studentId],
    queryFn: async () => {
      const response = await fetchClassSessions({ studentId });
      // console.log('Student lessons response:', response);
      
      if (!response || !response.data || !Array.isArray(response.data)) {
        console.error('Unexpected response format for student lessons:', response);
        return [];
      }
      
      // Теперь используем правильный тип вместо any
      const lessons: DisplayLesson[] = response.data.map((template: TemplateDataFromAPI) => 
        transformTemplateToDisplayLesson(
          template, 
          template.teacherName || '未知の教師', 
          studentName,
          'student' // Specifying type explicitly
        )
      );
      
      // console.log('Transformed student lessons:', lessons);
      return lessons;
    },
    enabled: !!studentId
  });

  // Getting shared lessons between teacher and student
  const sharedLessonsQuery = useQuery<DisplayLesson[]>({
    queryKey: ['sharedLessons', teacherId, studentId],
    queryFn: async () => {
      const response = await fetchClassSessions({ teacherId, studentId });
      // console.log('Shared lessons response:', response);
      
      if (!response || !response.data || !Array.isArray(response.data)) {
        console.error('Unexpected response format for shared lessons:', response);
        return [];
      }
      
      const lessons: DisplayLesson[] = response.data.map((template: TemplateDataFromAPI) => 
        transformTemplateToDisplayLesson(
          template, 
          teacherName, 
          studentName,
          'current' // Specifying type explicitly
        )
      );
      
      // console.log('Transformed shared lessons:', lessons);
      return lessons;
    },
    enabled: !!teacherId && !!studentId
  });

  // Combining results without additional checks and filtering
  const combinedLessons = () => {
    const teacherLessons = teacherLessonsQuery.data || [];
    const studentLessons = studentLessonsQuery.data || [];
    const sharedLessons = sharedLessonsQuery.data || [];
    
    // Creating a set of shared lesson IDs for filtering
    const sharedLessonIds = new Set(sharedLessons.map(lesson => lesson.id));
    
    // Filtering teacher lessons to exclude shared ones
    const filteredTeacherLessons = teacherLessons.filter(lesson => 
      !sharedLessonIds.has(lesson.id) && lesson.studentId !== studentId
    );
    
    // Filtering student lessons to exclude shared ones
    const filteredStudentLessons = studentLessons.filter(lesson => 
      !sharedLessonIds.has(lesson.id) && lesson.teacherId !== teacherId
    );
    
    // Combining all lessons
    return [...filteredTeacherLessons, ...filteredStudentLessons, ...sharedLessons];
  };

  // Loading status and errors
  const isLoading = 
    teacherLessonsQuery.isLoading || 
    studentLessonsQuery.isLoading || 
    sharedLessonsQuery.isLoading;
  
  const error = 
    teacherLessonsQuery.error || 
    studentLessonsQuery.error || 
    sharedLessonsQuery.error;

  // Function to refresh all queries
  const refetchAll = async () => {
    await Promise.all([
      teacherLessonsQuery.refetch(),
      studentLessonsQuery.refetch(),
      sharedLessonsQuery.refetch()
    ]);
  };

  return {
    data: combinedLessons(),
    isLoading,
    error,
    refetch: refetchAll
  };
}