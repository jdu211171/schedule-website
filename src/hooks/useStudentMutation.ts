import { fetcher } from "@/lib/fetcher";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Student, SchoolType, examSchoolType } from "@prisma/client";
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
  birthDate?: string; // Sent as string from form
  parentEmail?: string;
  parentMobile?: string;
  studentMobile?: string;
  homePhone?: string;
  enrollmentDate?: string; // Sent as string from form
  firstChoiceSchool?: string;
  secondChoiceSchool?: string;
  notes?: string; // General notes for the student
  preferences?: {
    subjects?: { subjectId: string; subjectTypeId: string }[];
    teachers?: string[];
    timeSlots?: {
      dayOfWeek: string;
      startTime: string;
      endTime: string;
    }[];
    notes?: string; // Preference-specific notes
    classTypeId?: string;
  };
};

type UpdateStudentInput = {
  studentId: string;
  password?: string; // For updating associated User
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
  birthDate?: string; // Sent as string from form
  parentEmail?: string; // For updating associated User
  parentMobile?: string; // For updating associated User
  studentMobile?: string; // For updating associated User
  homePhone?: string;
  enrollmentDate?: string; // Sent as string from form
  firstChoiceSchool?: string;
  secondChoiceSchool?: string;
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
  notes?: string; // General notes for the student
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
    onMutate: async (newStudentData) => {
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

      queries.forEach(([queryKey, currentData]) => {
        if (currentData) {
          // Prepare the student object for optimistic update, matching Student model
          const studentModelData = {
            name: newStudentData.name,
            kanaName: newStudentData.kanaName || null,
            gradeId: newStudentData.gradeId || null,
            schoolName: newStudentData.schoolName || null,
            schoolType: newStudentData.schoolType as SchoolType | null || null,
            examSchoolType: newStudentData.examSchoolType as SchoolType | null || null,
            examSchoolCategoryType: newStudentData.examSchoolCategoryType as examSchoolType | null || null,
            firstChoiceSchool: newStudentData.firstChoiceSchool || null,
            secondChoiceSchool: newStudentData.secondChoiceSchool || null,
            homePhone: newStudentData.homePhone || null,
            notes: newStudentData.notes || null, // Assuming Student model has 'notes'
            // Convert date strings to Date objects or null
            birthDate: newStudentData.birthDate ? new Date(newStudentData.birthDate) : null,
            enrollmentDate: newStudentData.enrollmentDate ? new Date(newStudentData.enrollmentDate) : null,
          };

          const tempStudentForCache: Student = {
            ...studentModelData,
            studentId: tempId,
            // Mock server-generated fields and other non-optional Student fields
            createdAt: new Date(),
            updatedAt: new Date(),
            // Add other non-optional fields from Prisma Student type with default/mock values if necessary
            // For example, if Student has a non-optional `userId: String`
            // userId: "temp-user-id",
            // Ensure all fields required by the Prisma Student type are present
          } as Student; // Cast to Prisma Student type

          queryClient.setQueryData<StudentsQueryData>(queryKey, {
            ...currentData,
            data: [...currentData.data, tempStudentForCache],
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
      const resolvedId = getResolvedStudentId(studentId);
      return fetcher(`/api/student`, {
        method: "PUT",
        body: JSON.stringify({ studentId: resolvedId, ...data }),
      });
    },
    onMutate: async (updatedStudentData) => {
      await queryClient.cancelQueries({ queryKey: ["students"] });
      const resolvedId = getResolvedStudentId(updatedStudentData.studentId);
      await queryClient.cancelQueries({ queryKey: ["student", resolvedId] });

      const queries = queryClient.getQueriesData<StudentsQueryData>({
        queryKey: ["students"],
      });
      const previousStudents: Record<string, StudentsQueryData> = {};
      queries.forEach(([queryKey, data]) => {
        if (data) previousStudents[JSON.stringify(queryKey)] = data;
      });

      const previousStudent = queryClient.getQueryData<Student>(["student", resolvedId]);

      // Prepare the update patch with correct types for Student model fields
      const studentUpdatePatch: Partial<Student> & { updatedAt: Date } = {
        ...(updatedStudentData.name && { name: updatedStudentData.name }),
        ...(updatedStudentData.kanaName && { kanaName: updatedStudentData.kanaName }),
        ...(updatedStudentData.gradeId && { gradeId: updatedStudentData.gradeId }),
        ...(updatedStudentData.schoolName && { schoolName: updatedStudentData.schoolName }),
        ...(updatedStudentData.schoolType && { schoolType: updatedStudentData.schoolType as SchoolType }),
        ...(updatedStudentData.examSchoolType && { examSchoolType: updatedStudentData.examSchoolType as SchoolType }),
        ...(updatedStudentData.examSchoolCategoryType && { examSchoolCategoryType: updatedStudentData.examSchoolCategoryType as examSchoolType }),
        ...(updatedStudentData.firstChoiceSchool && { firstChoiceSchool: updatedStudentData.firstChoiceSchool }),
        ...(updatedStudentData.secondChoiceSchool && { secondChoiceSchool: updatedStudentData.secondChoiceSchool }),
        ...(updatedStudentData.homePhone && { homePhone: updatedStudentData.homePhone }),
        ...(updatedStudentData.notes && { notes: updatedStudentData.notes }), // Assuming Student model has 'notes'
        // Convert date strings to Date objects or null if present
        ...(updatedStudentData.birthDate && { birthDate: new Date(updatedStudentData.birthDate) }),
        ...(updatedStudentData.enrollmentDate && { enrollmentDate: new Date(updatedStudentData.enrollmentDate) }),
        updatedAt: new Date(), // Optimistically update timestamp
      };

      queries.forEach(([queryKey, currentData]) => {
        if (currentData) {
          queryClient.setQueryData<StudentsQueryData>(queryKey, {
            ...currentData,
            data: currentData.data.map((student) =>
              student.studentId === resolvedId
                ? ({ ...student, ...studentUpdatePatch } as Student)
                : student
            ),
          });
        }
      });

      if (previousStudent) {
        queryClient.setQueryData<Student>(["student", resolvedId], {
          ...previousStudent,
          ...studentUpdatePatch,
        } as Student);
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
