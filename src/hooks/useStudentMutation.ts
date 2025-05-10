import { fetcher } from "@/lib/fetcher";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Student } from "@prisma/client";
import { toast } from "sonner";

type CreateStudentInput = {
  username: string;
  password: string;
  name: string;
  kanaName?: string;
  gradeId?: string;
  schoolName?: string;
  schoolType?: "PUBLIC" | "PRIVATE";
  examSchoolType?: "PUBLIC" | "PRIVATE";
  examSchoolCategoryType?:
    | "ELEMENTARY"
    | "MIDDLE"
    | "HIGH"
    | "UNIVERSITY"
    | "OTHER";
  birthDate?: string;
  parentEmail?: string;
  preferences?: {
    subjects?: { subjectId: string; subjectTypeId: string }[];
    teachers?: string[];
    timeSlots?: {
      dayOfWeek: string;
      startTime: string;
      endTime: string;
    }[];
    notes?: string;
    classTypeId?: string;
  };
};

type UpdateStudentInput = {
  studentId: string;
  password?: string;
  name?: string;
  kanaName?: string;
  gradeId?: string;
  schoolName?: string;
  schoolType?: "PUBLIC" | "PRIVATE";
  examSchoolType?: "PUBLIC" | "PRIVATE";
  examSchoolCategoryType?:
    | "ELEMENTARY"
    | "MIDDLE"
    | "HIGH"
    | "UNIVERSITY"
    | "OTHER";
  birthDate?: string;
  parentEmail?: string;
  preferences?: {
    subjects?: { subjectId: string; subjectTypeId: string }[];
    teachers?: string[];
    timeSlots?: {
      dayOfWeek: string;
      startTime: string;
      endTime: string;
    }[];
    notes?: string;
    classTypeId?: string;
  };
};

type CreateStudentResponse = {
  message: string;
  data: Student;
};

type UpdateStudentResponse = {
  message: string;
  data: Student;
};

type DeleteStudentResponse = {
  message: string;
};

type StudentsQueryData = {
  data: Student[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
};

// Define context types for mutations
type StudentMutationContext = {
  previousStudents?: Record<string, StudentsQueryData>;
  previousStudent?: Student;
  deletedStudent?: Student;
  tempId?: string;
};

// Maintain a mapping between temporary IDs and server IDs
const tempToServerIdMap = new Map<string, string>();

export function getResolvedStudentId(id: string): string {
  return tempToServerIdMap.get(id) || id;
}

export function useStudentCreate() {
  const queryClient = useQueryClient();
  return useMutation<
    CreateStudentResponse,
    Error,
    CreateStudentInput,
    StudentMutationContext
  >({
    mutationFn: (data) =>
      fetcher("/api/student", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onMutate: async (newStudent) => {
      await queryClient.cancelQueries({ queryKey: ["students"] });
      const queries = queryClient.getQueriesData<StudentsQueryData>({
        queryKey: ["students"],
      });
      const previousStudents: Record<string, StudentsQueryData> = {};
      queries.forEach(([queryKey, data]) => {
        if (data) {
          previousStudents[JSON.stringify(queryKey)] = data;
        }
      });
      const tempId = `temp-${Date.now()}`;
      queries.forEach(([queryKey]) => {
        const currentData =
          queryClient.getQueryData<StudentsQueryData>(queryKey);
        if (currentData) {
          // For optimistic updates, create a temporary student
          const optimisticStudent = {
            studentId: tempId,
            name: newStudent.name,
            kanaName: newStudent.kanaName || null,
            gradeId: newStudent.gradeId || null,
            schoolName: newStudent.schoolName || null,
            schoolType: newStudent.schoolType || null,
            examSchoolType: newStudent.examSchoolType || null,
            examSchoolCategoryType: newStudent.examSchoolCategoryType || null,
            birthDate: newStudent.birthDate
              ? new Date(newStudent.birthDate)
              : new Date(),
            parentEmail: newStudent.parentEmail || null,
            userId: `temp-user-${Date.now()}`,
            createdAt: new Date(),
            updatedAt: new Date(),
            _optimistic: true,
          } as unknown as Student & { _optimistic?: boolean };

          queryClient.setQueryData<StudentsQueryData>(queryKey, {
            ...currentData,
            data: [optimisticStudent, ...currentData.data],
            pagination: {
              ...currentData.pagination,
              total: currentData.pagination.total + 1,
            },
          });
        }
      });
      return { previousStudents, tempId };
    },
    onError: (error, _, context) => {
      if (context?.previousStudents) {
        Object.entries(context.previousStudents).forEach(
          ([queryKeyStr, data]) => {
            const queryKey = JSON.parse(queryKeyStr);
            queryClient.setQueryData(queryKey, data);
          }
        );
      }

      // Clean up the ID mapping if we created one
      if (context?.tempId) {
        tempToServerIdMap.delete(context.tempId);
      }

      toast.error("生徒の追加に失敗しました", {
        description: error.message,
      });
    },
    onSuccess: (response, _, context) => {
      if (!context?.tempId) return;

      // Store the mapping between temporary ID and server ID
      tempToServerIdMap.set(context.tempId, response.data.studentId);

      // Update all student queries
      const queries = queryClient.getQueriesData<StudentsQueryData>({
        queryKey: ["students"],
      });
      queries.forEach(([queryKey]) => {
        const currentData =
          queryClient.getQueryData<StudentsQueryData>(queryKey);
        if (currentData) {
          queryClient.setQueryData<StudentsQueryData>(queryKey, {
            ...currentData,
            data: currentData.data.map((student) =>
              student.studentId === context.tempId ? response.data : student
            ),
          });
        }
      });

      toast.success("生徒を追加しました", {
        description: response.message,
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ["students"],
        refetchType: "none",
      });
    },
  });
}

export function useStudentUpdate() {
  const queryClient = useQueryClient();
  return useMutation<
    UpdateStudentResponse,
    Error,
    UpdateStudentInput,
    StudentMutationContext
  >({
    mutationFn: ({ studentId, ...data }) => {
      // Resolve the ID before sending to the server
      const resolvedId = getResolvedStudentId(studentId);

      return fetcher(`/api/student`, {
        method: "PUT",
        body: JSON.stringify({ studentId: resolvedId, ...data }),
      });
    },
    onMutate: async (updatedStudent) => {
      await queryClient.cancelQueries({ queryKey: ["students"] });

      // Resolve ID for any potential temporary ID
      const resolvedId = getResolvedStudentId(updatedStudent.studentId);

      await queryClient.cancelQueries({
        queryKey: ["student", resolvedId],
      });
      const queries = queryClient.getQueriesData<StudentsQueryData>({
        queryKey: ["students"],
      });
      const previousStudents: Record<string, StudentsQueryData> = {};
      queries.forEach(([queryKey, data]) => {
        if (data) {
          previousStudents[JSON.stringify(queryKey)] = data;
        }
      });
      const previousStudent = queryClient.getQueryData<Student>([
        "student",
        resolvedId,
      ]);
      queries.forEach(([queryKey]) => {
        const currentData =
          queryClient.getQueryData<StudentsQueryData>(queryKey);
        if (currentData) {
          queryClient.setQueryData<StudentsQueryData>(queryKey, {
            ...currentData,
            data: currentData.data.map((student) =>
              student.studentId === updatedStudent.studentId
                ? {
                    ...student,
                    ...updatedStudent,
                    birthDate:
                      updatedStudent.birthDate
                        ? new Date(updatedStudent.birthDate)
                        : student.birthDate,
                    updatedAt: new Date(),
                  }
                : student
            ),
          });
        }
      });
      if (previousStudent) {
        queryClient.setQueryData<Student>(["student", resolvedId], {
          ...previousStudent,
          ...updatedStudent,
          birthDate:
            updatedStudent.birthDate
              ? new Date(updatedStudent.birthDate)
              : previousStudent.birthDate,
          updatedAt: new Date(),
        });
      }
      return { previousStudents, previousStudent };
    },
    onError: (error, variables, context) => {
      if (context?.previousStudents) {
        Object.entries(context.previousStudents).forEach(
          ([queryKeyStr, data]) => {
            const queryKey = JSON.parse(queryKeyStr);
            queryClient.setQueryData(queryKey, data);
          }
        );
      }

      // Resolve the ID for restoring the single student query
      const resolvedId = getResolvedStudentId(variables.studentId);

      if (context?.previousStudent) {
        queryClient.setQueryData(
          ["student", resolvedId],
          context.previousStudent
        );
      }
      toast.error("生徒の更新に失敗しました", {
        description: error.message,
      });
    },
    onSuccess: (data) => {
      toast.success("生徒を更新しました", {
        description: data.message,
      });
    },
    onSettled: (_, __, variables) => {
      // Resolve ID for proper invalidation
      const resolvedId = getResolvedStudentId(variables.studentId);

      queryClient.invalidateQueries({
        queryKey: ["students"],
        refetchType: "none",
      });
      queryClient.invalidateQueries({
        queryKey: ["student", resolvedId],
        refetchType: "none",
      });
    },
  });
}

export function useStudentDelete() {
  const queryClient = useQueryClient();
  return useMutation<
    DeleteStudentResponse,
    Error,
    string,
    StudentMutationContext
  >({
    mutationFn: (studentId) => {
      // Resolve the ID before sending to the server
      const resolvedId = getResolvedStudentId(studentId);

      return fetcher(`/api/student?studentId=${resolvedId}`, {
        method: "DELETE",
      });
    },
    onMutate: async (studentId) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["students"] });

      // Resolve ID for any potential temporary ID
      const resolvedId = getResolvedStudentId(studentId);

      await queryClient.cancelQueries({ queryKey: ["student", resolvedId] });

      // Snapshot all student queries
      const queries = queryClient.getQueriesData<StudentsQueryData>({
        queryKey: ["students"],
      });
      const previousStudents: Record<string, StudentsQueryData> = {};

      // Save all student queries for potential rollback
      queries.forEach(([queryKey, data]) => {
        if (data) {
          previousStudents[JSON.stringify(queryKey)] = data;
        }
      });

      // Save the student being deleted
      let deletedStudent: Student | undefined;
      for (const [, data] of queries) {
        if (data) {
          const found = data.data.find(
            (student) => student.studentId === studentId
          );
          if (found) {
            deletedStudent = found;
            break;
          }
        }
      }

      // Optimistically update all student queries
      queries.forEach(([queryKey]) => {
        const currentData =
          queryClient.getQueryData<StudentsQueryData>(queryKey);

        if (currentData) {
          queryClient.setQueryData<StudentsQueryData>(queryKey, {
            ...currentData,
            data: currentData.data.filter(
              (student) => student.studentId !== studentId
            ),
            pagination: {
              ...currentData.pagination,
              total: Math.max(0, currentData.pagination.total - 1),
            },
          });
        }
      });

      // Remove the individual student query
      queryClient.removeQueries({ queryKey: ["student", resolvedId] });

      // If it was a temporary ID, clean up the mapping
      if (studentId.startsWith("temp-")) {
        tempToServerIdMap.delete(studentId);
      }

      // Return the snapshots for rollback
      return { previousStudents, deletedStudent };
    },
    onError: (error, studentId, context) => {
      // Rollback student list queries
      if (context?.previousStudents) {
        Object.entries(context.previousStudents).forEach(
          ([queryKeyStr, data]) => {
            const queryKey = JSON.parse(queryKeyStr);
            queryClient.setQueryData(queryKey, data);
          }
        );
      }

      // Restore mapping if it was removed
      if (studentId.startsWith("temp-") && context?.deletedStudent) {
        tempToServerIdMap.set(studentId, context.deletedStudent.studentId);
      }

      // Resolve ID for restoring the single student query
      const resolvedId = getResolvedStudentId(studentId);

      // Restore individual student query if it existed
      if (context?.deletedStudent) {
        queryClient.setQueryData(
          ["student", resolvedId],
          context.deletedStudent
        );
      }

      toast.error("生徒の削除に失敗しました", {
        description: error.message,
      });
    },
    onSuccess: (data, studentId) => {
      // If it was a temporary ID, clean up the mapping on success
      if (studentId.startsWith("temp-")) {
        tempToServerIdMap.delete(studentId);
      }

      toast.success("生徒を削除しました", {
        description: data.message,
      });
    },
    onSettled: (_, __, studentId) => {
      // Resolve ID for proper invalidation
      const resolvedId = getResolvedStudentId(studentId);

      // Invalidate queries in the background to ensure eventual consistency
      queryClient.invalidateQueries({
        queryKey: ["students"],
        refetchType: "none",
      });
      queryClient.invalidateQueries({
        queryKey: ["student", resolvedId],
        refetchType: "none",
      });
    },
  });
}
