import { useQuery } from '@tanstack/react-query';
import { getTeachers } from '@/actions/teacher';
import { getTeacher } from '@/actions/teacher/read';

export function useTeachers() {
    return useQuery({
        queryKey: ["teachers"],
        queryFn: getTeachers,
    });
}

export function useTeacher(teacherId: string) {
    return useQuery({
        queryKey: ["teachers", teacherId],
        queryFn: () => getTeacher(teacherId),
    });
}