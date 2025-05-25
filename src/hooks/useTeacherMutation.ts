// src/hooks/useTeacherMutation.ts
import { fetcher } from "@/lib/fetcher";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { TeacherCreate, TeacherUpdate } from "@/schemas/teacher.schema";
import { Teacher } from "./useTeacherQuery";

type TeachersResponse = {
  data: Teacher[];
  message?: string;
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
};

type TeacherMutationContext = {
  previousTeachers?: Record<string, TeachersResponse>;
  previousTeacher?: Teacher;
  deletedTeacher?: Teacher;
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
  TeachersResponse,
    Error,
    TeacherCreate,
    TeacherMutationContext >
      ({
        mutationFn: (data) =>
          fetcher("/api/teachers", {
            method: "POST",
            body: JSON.stringify(data),
          }),
        onMutate: async (newTeacher) => {
          await queryClient.cancelQueries({ queryKey: ["teachers"] });
          const queries = queryClient.getQueriesData<TeachersResponse>({
            queryKey: ["teachers"],
          });
          const previousTeachers: Record<string, TeachersResponse> = {};
          queries.forEach(([queryKey, data]) => {
            if (data) {
              previousTeachers[JSON.stringify(queryKey)] = data;
            }
          });
          const tempId = `temp-${Date.now()}`;
          queries.forEach(([queryKey]) => {
            const currentData =
              queryClient.getQueryData<TeachersResponse>(queryKey);
            if (currentData) {
              // Create optimistic teacher
              const optimisticTeacher: Teacher = {
                teacherId: tempId,
                userId: tempId,
                name: newTeacher.name,
                kanaName: newTeacher.kanaName || null,
                email: newTeacher.email || null,
                lineId: newTeacher.lineId || null,
                notes: newTeacher.notes || null,
                username: newTeacher.username,
                password: newTeacher.password || null,
                branches: [],
                createdAt: new Date(),
                updatedAt: new Date(),
                _optimistic: true,
              };

              queryClient.setQueryData<TeachersResponse>(queryKey, {
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
            id: "teacher-create-error",
            description: error.message,
          });
        },
        onSuccess: (response, _, context) => {
          if (!context?.tempId) return;

          // Store the mapping between temporary ID and server ID
          const newTeacher = response.data[0];
          tempToServerIdMap.set(context.tempId, newTeacher.teacherId);

          // Update all teacher queries
          const queries = queryClient.getQueriesData<TeachersResponse>({
            queryKey: ["teachers"],
          });

          queries.forEach(([queryKey]) => {
            const currentData =
              queryClient.getQueryData<TeachersResponse>(queryKey);
            if (currentData) {
              queryClient.setQueryData<TeachersResponse>(queryKey, {
                ...currentData,
                data: currentData.data.map((teacher) =>
                  teacher.teacherId === context.tempId ? newTeacher : teacher
                ),
              });
            }
          });

          toast.success("教師を追加しました", {
            id: "teacher-create-success",
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
  TeachersResponse,
    Error,
    TeacherUpdate,
    TeacherMutationContext >
      ({
        mutationFn: ({ teacherId, ...data }) => {
          const resolvedId = getResolvedTeacherId(teacherId);
          return fetcher(`/api/teachers/${resolvedId}`, {
            method: "PATCH",
            body: JSON.stringify(data),
          });
        },
        onMutate: async (updatedTeacher) => {
          await queryClient.cancelQueries({ queryKey: ["teachers"] });

          const resolvedId = getResolvedTeacherId(updatedTeacher.teacherId);

          await queryClient.cancelQueries({
            queryKey: ["teacher", resolvedId],
          });
          const queries = queryClient.getQueriesData<TeachersResponse>({
            queryKey: ["teachers"],
          });
          const previousTeachers: Record<string, TeachersResponse> = {};
          queries.forEach(([queryKey, data]) => {
            if (data) {
              previousTeachers[JSON.stringify(queryKey)] = data;
            }
          });
          const previousTeacher = queryClient.getQueryData<Teacher>([
            "teacher",
            resolvedId,
          ]);
          queries.forEach(([queryKey]) => {
            const currentData =
              queryClient.getQueryData<TeachersResponse>(queryKey);
            if (currentData) {
              queryClient.setQueryData<TeachersResponse>(queryKey, {
                ...currentData,
                data: currentData.data.map((teacher) =>
                  teacher.teacherId === updatedTeacher.teacherId
                    ? {
                        ...teacher,
                        ...updatedTeacher,
                        name: updatedTeacher.name || teacher.name,
                        updatedAt: new Date(),
                      }
                    : teacher
                ),
              });
            }
          });
          if (previousTeacher) {
            queryClient.setQueryData<Teacher>(["teacher", resolvedId], {
              ...previousTeacher,
              ...updatedTeacher,
              name: updatedTeacher.name || previousTeacher.name,
              updatedAt: new Date(),
            });
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

          const resolvedId = getResolvedTeacherId(variables.teacherId);

          if (context?.previousTeacher) {
            queryClient.setQueryData(
              ["teacher", resolvedId],
              context.previousTeacher
            );
          }
          toast.error("教師の更新に失敗しました", {
            id: "teacher-update-error",
            description: error.message,
          });
        },
        onSuccess: (data) => {
          // Find the updated teacher from the response
          const updatedTeacher = data?.data?.[0];
          if (updatedTeacher) {
            // Update all teacher queries to replace the teacher with the updated one
            const queries = queryClient.getQueriesData<TeachersResponse>({
              queryKey: ["teachers"],
            });
            queries.forEach(([queryKey]) => {
              const currentData = queryClient.getQueryData<TeachersResponse>(queryKey);
              if (currentData) {
                queryClient.setQueryData<TeachersResponse>(queryKey, {
                  ...currentData,
                  data: currentData.data.map((teacher) =>
                    teacher.teacherId === updatedTeacher.teacherId ? updatedTeacher : teacher
                  ),
                });
              }
            });
            // Also update the single teacher query if it exists
            queryClient.setQueryData(["teacher", updatedTeacher.teacherId], updatedTeacher);
          }
          toast.success("教師を更新しました", {
            id: "teacher-update-success",
          });
        },
        onSettled: (_, __, variables) => {
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
      })
}

export function useTeacherDelete() {
  const queryClient = useQueryClient();
  return useMutation<
  TeachersResponse,
    Error,
    string,
    TeacherMutationContext >
      ({
        mutationFn: (teacherId) => {
          const resolvedId = getResolvedTeacherId(teacherId);
          return fetcher(`/api/teachers/${resolvedId}`, {
            method: "DELETE",
          });
        },
        onMutate: async (teacherId) => {
          await queryClient.cancelQueries({ queryKey: ["teachers"] });

          const resolvedId = getResolvedTeacherId(teacherId);

          await queryClient.cancelQueries({
            queryKey: ["teacher", resolvedId],
          });

          const queries = queryClient.getQueriesData<TeachersResponse>({
            queryKey: ["teachers"],
          });
          const previousTeachers: Record<string, TeachersResponse> = {};

          queries.forEach(([queryKey, data]) => {
            if (data) {
              previousTeachers[JSON.stringify(queryKey)] = data;
            }
          });

          let deletedTeacher: Teacher | undefined;
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

          queries.forEach(([queryKey]) => {
            const currentData =
              queryClient.getQueryData<TeachersResponse>(queryKey);

            if (currentData) {
              queryClient.setQueryData<TeachersResponse>(queryKey, {
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

          queryClient.removeQueries({ queryKey: ["teacher", resolvedId] });

          if (teacherId.startsWith("temp-")) {
            tempToServerIdMap.delete(teacherId);
          }

          return { previousTeachers, deletedTeacher };
        },
        onError: (error, teacherId, context) => {
          if (context?.previousTeachers) {
            Object.entries(context.previousTeachers).forEach(
              ([queryKeyStr, data]) => {
                const queryKey = JSON.parse(queryKeyStr);
                queryClient.setQueryData(queryKey, data);
              }
            );
          }

          if (teacherId.startsWith("temp-") && context?.deletedTeacher) {
            tempToServerIdMap.set(teacherId, context.deletedTeacher.teacherId);
          }

          const resolvedId = getResolvedTeacherId(teacherId);

          if (context?.deletedTeacher) {
            queryClient.setQueryData(
              ["teacher", resolvedId],
              context.deletedTeacher
            );
          }

          toast.error("教師の削除に失敗しました", {
            id: "teacher-delete-error",
            description: error.message,
          });
        },
        onSuccess: (data, teacherId) => {
          if (teacherId.startsWith("temp-")) {
            tempToServerIdMap.delete(teacherId);
          }

          toast.success("教師を削除しました", {
            id: "teacher-delete-success",
          });
        },
        onSettled: (_, __, teacherId) => {
          const resolvedId = getResolvedTeacherId(teacherId);

          queryClient.invalidateQueries({
            queryKey: ["teachers"],
            refetchType: "none",
          });
          queryClient.invalidateQueries({
            queryKey: ["teacher", resolvedId],
            refetchType: "none",
          });

          queryClient.invalidateQueries({
            queryKey: ["classSessions"],
            refetchType: "none",
          });
        },
      });
}
