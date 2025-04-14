import { useQuery } from '@tanstack/react-query';
import { getTeachers } from '@/actions/teacher';
import { getTeacher } from '@/actions/teacher/read';
import { getTeachersCount } from '@/actions/count';

export function useTeachersCount() {
    return useQuery({
        queryKey: ["teachers", "count"],
        queryFn: () => getTeachersCount(),
    });
}

export function useTeachers(page: number = 1, pageSize: number = 15) {
    return useQuery({
        queryKey: ["teachers", page, pageSize],
        queryFn: () => getTeachers({ page, pageSize }),
    });
}

export function useTeacher(teacherId: string) {
    return useQuery({
        queryKey: ["teachers", teacherId],
        queryFn: () => getTeacher(teacherId),
    });
}