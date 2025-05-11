import { fetcher } from "@/lib/fetcher";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { TeacherWithPreference } from "./useTeacherQuery";
import { toast } from "sonner";
import { DayOfWeekEnum } from "@/schemas/teacher.schema";
import { z } from "zod";

export type DayOfWeek = z.infer<typeof DayOfWeekEnum>;

// Define the subject type pair interface for consistency
export interface SubjectTypePair {
  subjectId: string;
  subjectTypeId: string;
}

// Input for creating a teacher (matches Zod and Prisma)
type CreateTeacherInput = {
  name: string;
  evaluationId: string;
  birthDate: string; // ISO string
  mobileNumber: string;
  email: string;
  highSchool: string;
  university: string;
  faculty: string;
  department: string;
  enrollmentStatus: string;
  otherUniversities?: string | null;
  englishProficiency?: string | null;
  toeic?: number | null;
  toefl?: number | null;
  mathCertification?: string | null;
  kanjiCertification?: string | null;
  otherCertifications?: string | null;
  notes?: string | null;
  username: string;
  password: string;
  subjects?: SubjectTypePair[];
  shifts?: {
    dayOfWeek: DayOfWeek;
    startTime: string;
    endTime: string;
    notes?: string | null;
  }[];
};

// Input for updating a teacher (matches Zod and Prisma)
type UpdateTeacherInput = {
  teacherId: string;
  name?: string;
  evaluationId?: string;
  birthDate?: string;
  mobileNumber?: string;
  email?: string;
  highSchool?: string;
  university?: string;
  faculty?: string;
  department?: string;
  enrollmentStatus?: string;
  otherUniversities?: string | null;
  englishProficiency?: string | null;
  toeic?: number | null;
  toefl?: number | null;
  mathCertification?: string | null;
  kanjiCertification?: string | null;
  otherCertifications?: string | null;
  notes?: string | null;
  password?: string;
  subjects?: SubjectTypePair[];
  shifts?: {
    dayOfWeek: DayOfWeek;
    startTime: string;
    endTime: string;
    notes?: string | null;
  }[];
};

type CreateTeacherResponse = {
  message: string;
  data: TeacherWithPreference;
};

type UpdateTeacherResponse = {
  message: string;
  data: TeacherWithPreference;
};

type DeleteTeacherResponse = {
  message: string;
};

type TeachersQueryData = {
  data: TeacherWithPreference[];
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    pages: number;
  };
};

// Define context types for mutations
type TeacherMutationContext = {
  previousTeachers?: Record<string, TeachersQueryData>;
  previousTeacher?: TeacherWithPreference;
  deletedTeacher?: TeacherWithPreference;
  tempId?: string;
};

// Maintain a mapping between temporary IDs and server IDs
const tempToServerIdMap = new Map<string, string>();

export function getResolvedTeacherId(id: string): string {
  return tempToServerIdMap.get(id) || id;
}

export function useTeacherCreate() {
  const queryClient = useQueryClient();
  return useMutation<
    CreateTeacherResponse,
    Error,
    CreateTeacherInput,
    TeacherMutationContext
  >({
    mutationFn: (data) => {
      return fetcher("/api/teacher", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onMutate: async (newTeacher) => {
      await queryClient.cancelQueries({ queryKey: ["teachers"] });
      const queries = queryClient.getQueriesData<TeachersQueryData>({
        queryKey: ["teachers"],
      });
      const previousTeachers: Record<string, TeachersQueryData> = {};
      queries.forEach(([queryKey, data]) => {
        if (data) {
          previousTeachers[JSON.stringify(queryKey)] = data;
        }
      });
      const tempId = `temp-${Date.now()}`;
      queries.forEach(([queryKey]) => {
        const currentData =
          queryClient.getQueryData<TeachersQueryData>(queryKey);
        if (currentData) {
          // For optimistic updates, create a temporary teacher
          const optimisticTeacher = {
            teacherId: tempId,
            name: newTeacher.name,
            evaluationId: newTeacher.evaluationId,
            birthDate: new Date(newTeacher.birthDate),
            mobileNumber: newTeacher.mobileNumber,
            email: newTeacher.email,
            highSchool: newTeacher.highSchool,
            university: newTeacher.university,
            faculty: newTeacher.faculty,
            department: newTeacher.department,
            enrollmentStatus: newTeacher.enrollmentStatus,
            otherUniversities: newTeacher.otherUniversities || null,
            englishProficiency: newTeacher.englishProficiency || null,
            toeic: newTeacher.toeic || null,
            toefl: newTeacher.toefl || null,
            mathCertification: newTeacher.mathCertification || null,
            kanjiCertification: newTeacher.kanjiCertification || null,
            otherCertifications: newTeacher.otherCertifications || null,
            notes: newTeacher.notes || null,
            userId: `temp-user-${Date.now()}`,
            createdAt: new Date(),
            updatedAt: new Date(),
            teacherSubjects: newTeacher.subjects
              ? newTeacher.subjects.map((s) => ({
                  subjectId: s.subjectId,
                  subjectTypeId: s.subjectTypeId,
                  teacherId: tempId,
                }))
              : [],
            TeacherShiftReference: newTeacher.shifts
              ? newTeacher.shifts.map((shift) => ({
                  shiftId: `temp-shift-${Date.now()}-${Math.random()
                    .toString()
                    .slice(2, 8)}`,
                  teacherId: tempId,
                  dayOfWeek: shift.dayOfWeek,
                  startTime: new Date(`1970-01-01T${shift.startTime}`),
                  endTime: new Date(`1970-01-01T${shift.endTime}`),
                  notes: shift.notes || null,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                }))
              : [],
            user: {
              id: `temp-user-${Date.now()}`,
              name: newTeacher.name,
              username: newTeacher.username,
              role: "TEACHER",
            },
            evaluation: null,
            _optimistic: true,
          } as unknown as TeacherWithPreference & { _optimistic?: boolean };

          queryClient.setQueryData<TeachersQueryData>(queryKey, {
            ...currentData,
            data: [optimisticTeacher, ...currentData.data],
            pagination: {
              ...currentData.pagination,
              total: currentData.pagination.total + 1,
            },
          });
        }
      });
      return { previousTeachers, tempId };
    },
    onError: (error, _, context) => {
      if (context?.previousTeachers) {
        Object.entries(context.previousTeachers).forEach(
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

      toast.error("教師の追加に失敗しました", {
        description: error.message,
      });
    },
    onSuccess: (response, _, context) => {
      if (!context?.tempId) return;

      // Store the mapping between temporary ID and server ID
      tempToServerIdMap.set(context.tempId, response.data.teacherId);

      // Update all teacher queries
      const queries = queryClient.getQueriesData<TeachersQueryData>({
        queryKey: ["teachers"],
      });
      queries.forEach(([queryKey]) => {
        const currentData =
          queryClient.getQueryData<TeachersQueryData>(queryKey);
        if (currentData) {
          queryClient.setQueryData<TeachersQueryData>(queryKey, {
            ...currentData,
            data: currentData.data.map((teacher) =>
              teacher.teacherId === context.tempId ? response.data : teacher
            ),
          });
        }
      });

      toast.success("教師を追加しました", {
        description: response.message,
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ["teachers"],
        refetchType: "none",
      });
    },
  });
}

export function useTeacherUpdate() {
  const queryClient = useQueryClient();
  return useMutation<
    UpdateTeacherResponse,
    Error,
    UpdateTeacherInput,
    TeacherMutationContext
  >({
    mutationFn: (data) => {
      // Resolve the ID before sending to the server
      const resolvedId = getResolvedTeacherId(data.teacherId);

      return fetcher(`/api/teacher`, {
        method: "PUT",
        body: JSON.stringify({ ...data, teacherId: resolvedId }),
      });
    },
    onMutate: async (updatedTeacher) => {
      await queryClient.cancelQueries({ queryKey: ["teachers"] });

      // Resolve ID for any potential temporary ID
      const resolvedId = getResolvedTeacherId(updatedTeacher.teacherId);

      await queryClient.cancelQueries({
        queryKey: ["teacher", resolvedId],
      });
      const queries = queryClient.getQueriesData<TeachersQueryData>({
        queryKey: ["teachers"],
      });
      const previousTeachers: Record<string, TeachersQueryData> = {};
      queries.forEach(([queryKey, data]) => {
        if (data) {
          previousTeachers[JSON.stringify(queryKey)] = data;
        }
      });
      const previousTeacher = queryClient.getQueryData<TeacherWithPreference>([
        "teacher",
        resolvedId,
      ]);
      queries.forEach(([queryKey]) => {
        const currentData =
          queryClient.getQueryData<TeachersQueryData>(queryKey);
        if (currentData) {
          queryClient.setQueryData<TeachersQueryData>(queryKey, {
            ...currentData,
            data: currentData.data.map((teacher) =>
              teacher.teacherId === updatedTeacher.teacherId
                ? {
                    ...teacher,
                    ...updatedTeacher,
                    birthDate: updatedTeacher.birthDate
                      ? new Date(updatedTeacher.birthDate)
                      : teacher.birthDate,
                    updatedAt: new Date(),
                  }
                : teacher
            ),
          });
        }
      });
      if (previousTeacher) {
        queryClient.setQueryData<TeacherWithPreference>(
          ["teacher", resolvedId],
          {
            ...previousTeacher,
            ...updatedTeacher,
            birthDate: updatedTeacher.birthDate
              ? new Date(updatedTeacher.birthDate)
              : previousTeacher.birthDate,
            updatedAt: new Date(),
          }
        );
      }
      return { previousTeachers, previousTeacher };
    },
    onError: (error, variables, context) => {
      if (context?.previousTeachers) {
        Object.entries(context.previousTeachers).forEach(
          ([queryKeyStr, data]) => {
            const queryKey = JSON.parse(queryKeyStr);
            queryClient.setQueryData(queryKey, data);
          }
        );
      }

      // Resolve the ID for restoring the single teacher query
      const resolvedId = getResolvedTeacherId(variables.teacherId);

      if (context?.previousTeacher) {
        queryClient.setQueryData(
          ["teacher", resolvedId],
          context.previousTeacher
        );
      }
      toast.error("教師の更新に失敗しました", {
        description: error.message,
      });
    },
    onSuccess: (data) => {
      toast.success("教師を更新しました", {
        description: data.message,
      });
    },
    onSettled: (_, __, variables) => {
      // Resolve ID for proper invalidation
      const resolvedId = getResolvedTeacherId(variables.teacherId);

      queryClient.invalidateQueries({
        queryKey: ["teachers"],
        refetchType: "none",
      });
      queryClient.invalidateQueries({
        queryKey: ["teacher", resolvedId],
        refetchType: "none",
      });
    },
  });
}

export function useTeacherDelete() {
  const queryClient = useQueryClient();
  return useMutation<
    DeleteTeacherResponse,
    Error,
    string,
    TeacherMutationContext
  >({
    mutationFn: (teacherId) => {
      // Resolve the ID before sending to the server
      const resolvedId = getResolvedTeacherId(teacherId);

      return fetcher(`/api/teacher?teacherId=${resolvedId}`, {
        method: "DELETE",
      });
    },
    onMutate: async (teacherId) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["teachers"] });

      // Resolve ID for any potential temporary ID
      const resolvedId = getResolvedTeacherId(teacherId);

      await queryClient.cancelQueries({
        queryKey: ["teacher", resolvedId],
      });

      // Snapshot all teacher queries
      const queries = queryClient.getQueriesData<TeachersQueryData>({
        queryKey: ["teachers"],
      });
      const previousTeachers: Record<string, TeachersQueryData> = {};

      // Save all teacher queries for potential rollback
      queries.forEach(([queryKey, data]) => {
        if (data) {
          previousTeachers[JSON.stringify(queryKey)] = data;
        }
      });

      // Save the teacher being deleted
      let deletedTeacher: TeacherWithPreference | undefined;
      for (const [, data] of queries) {
        if (data) {
          const found = data.data.find(
            (teacher) => teacher.teacherId === teacherId
          );
          if (found) {
            deletedTeacher = found;
            break;
          }
        }
      }

      // Optimistically update all teacher queries
      queries.forEach(([queryKey]) => {
        const currentData =
          queryClient.getQueryData<TeachersQueryData>(queryKey);

        if (currentData) {
          queryClient.setQueryData<TeachersQueryData>(queryKey, {
            ...currentData,
            data: currentData.data.filter(
              (teacher) => teacher.teacherId !== teacherId
            ),
            pagination: {
              ...currentData.pagination,
              total: Math.max(0, currentData.pagination.total - 1),
            },
          });
        }
      });

      // Remove the individual teacher query
      queryClient.removeQueries({ queryKey: ["teacher", resolvedId] });

      // If it was a temporary ID, clean up the mapping
      if (teacherId.startsWith("temp-")) {
        tempToServerIdMap.delete(teacherId);
      }

      // Return the snapshots for rollback
      return { previousTeachers, deletedTeacher };
    },
    onError: (error, teacherId, context) => {
      // Rollback teacher list queries
      if (context?.previousTeachers) {
        Object.entries(context.previousTeachers).forEach(
          ([queryKeyStr, data]) => {
            const queryKey = JSON.parse(queryKeyStr);
            queryClient.setQueryData(queryKey, data);
          }
        );
      }

      // Restore mapping if it was removed
      if (teacherId.startsWith("temp-") && context?.deletedTeacher) {
        tempToServerIdMap.set(teacherId, context.deletedTeacher.teacherId);
      }

      // Resolve ID for restoring the single teacher query
      const resolvedId = getResolvedTeacherId(teacherId);

      // Restore individual teacher query if it existed
      if (context?.deletedTeacher) {
        queryClient.setQueryData(
          ["teacher", resolvedId],
          context.deletedTeacher
        );
      }

      toast.error("教師の削除に失敗しました", {
        description: error.message,
      });
    },
    onSuccess: (data, teacherId) => {
      // If it was a temporary ID, clean up the mapping on success
      if (teacherId.startsWith("temp-")) {
        tempToServerIdMap.delete(teacherId);
      }

      toast.success("教師を削除しました", {
        description: data.message,
      });
    },
    onSettled: (_, __, teacherId) => {
      // Resolve ID for proper invalidation
      const resolvedId = getResolvedTeacherId(teacherId);

      // Invalidate queries in the background to ensure eventual consistency
      queryClient.invalidateQueries({
        queryKey: ["teachers"],
        refetchType: "none",
      });
      queryClient.invalidateQueries({
        queryKey: ["teacher", resolvedId],
        refetchType: "none",
      });
    },
  });
}
