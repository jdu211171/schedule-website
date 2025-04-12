import { getStudents } from "@/actions/student";
import { getStudent } from "@/actions/student/read";
import { StudentWithGrade } from "@/schemas/student.schema";
import { useQuery } from "@tanstack/react-query";

export function useStudents(page: number = 1, pageSize: number = 15) {
    return useQuery({
        queryKey: ["students", page, pageSize],
        queryFn: () => getStudents({ page, pageSize }) as Promise<StudentWithGrade[]>,
    });
}

export function useStudent(studentId: string) {
    return useQuery({
        queryKey: ["students", studentId],
        queryFn: () => getStudent(studentId),
    });
}
