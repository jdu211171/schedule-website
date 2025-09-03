// src/hooks/useClassSessionMutation.ts
import { fetcher, CustomError } from "@/lib/fetcher";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ClassSessionCreate,
  ClassSessionUpdate,
  ClassSessionSeriesUpdate,
  ClassSessionBulkDelete,
} from "@/schemas/class-session.schema";
import { ClassSession } from "@prisma/client";

// Helper function to extract error message from CustomError or regular Error
const getErrorMessage = (error: Error): string => {
  if (error instanceof CustomError) {
    return (error.info.error as string) || error.message;
  }
  return error.message;
};

type ClassSessionResponse = {
  data: ClassSession[];
  message?: string;
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
  seriesId?: string;
};

type SingleClassSessionResponse = {
  data: ClassSession;
  message?: string;
};

type BulkDeleteResponse = {
  data: [];
  message: string;
  deletedCount: number;
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
};

// Add extra fields to ClassSession type for optimistic updates and API compatibility
// These fields are present in ExtendedClassSessionWithRelations but not in the base Prisma type
// ClassSessionWithExtras is for optimistic updates and allows string/Date for date/time fields
export type ClassSessionWithExtras = {
  classId: string;
  seriesId: string | null;
  teacherId: string | null;
  teacherName?: string | null;
  studentId: string | null;
  studentName?: string | null;
  subjectId: string | null;
  subjectName?: string | null;
  classTypeId: string | null;
  classTypeName?: string | null;
  boothId: string | null;
  boothName?: string | null;
  branchId: string | null;
  branchName?: string | null;
  date: string | Date;
  startTime: string | Date;
  endTime: string | Date;
  duration: number | null;
  notes: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  _optimistic?: boolean;
};

type ClassSessionMutationContext = {
  previousClassSessions?: Record<string, ClassSessionResponse>;
  previousClassSession?: ClassSession;
  deletedClassSession?: ClassSession;
  deletedClassSessions?: ClassSession[];
  tempId?: string;
};

// Maintain a mapping between temporary IDs and server IDs
const tempToServerIdMap = new Map<string, string>();

export function getResolvedClassSessionId(id: string): string {
  return tempToServerIdMap.get(id) || id;
}

// Hook for creating a class session (supports both one-time and recurring)
export function useClassSessionCreate() {
  const queryClient = useQueryClient();
  return useMutation<
    ClassSessionResponse,
    Error,
    ClassSessionCreate,
    ClassSessionMutationContext
  >({
    mutationFn: (data) =>
      fetcher("/api/class-sessions", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onMutate: async (newClassSession) => {
      await queryClient.cancelQueries({ queryKey: ["classSessions"] });
      const queries = queryClient.getQueriesData<ClassSessionResponse>({
        queryKey: ["classSessions"],
      });
      const previousClassSessions: Record<string, ClassSessionResponse> = {};
      queries.forEach(([queryKey, data]) => {
        if (data) {
          previousClassSessions[JSON.stringify(queryKey)] = data;
        }
      });

      // For one-time sessions, we can do optimistic updates
      if (!newClassSession.isRecurring) {
        const tempId = `temp-${Date.now()}`;
        queries.forEach(([queryKey]) => {
          const currentData =
            queryClient.getQueryData<ClassSessionResponse>(queryKey);
          if (currentData) {
            // Create optimistic class session with extra fields
            const optimisticClassSession: ClassSessionWithExtras = {
              classId: tempId,
              seriesId: null,
              teacherId: newClassSession.teacherId || null,
              teacherName: null,
              studentId: newClassSession.studentId || null,
              studentName: null,
              subjectId: newClassSession.subjectId || null,
              subjectName: null,
              classTypeId: newClassSession.classTypeId || null,
              classTypeName: null,
              boothId: newClassSession.boothId || null,
              boothName: null,
              branchId: newClassSession.branchId || null,
              branchName: null,
              date: newClassSession.date,
              startTime: newClassSession.startTime,
              endTime: newClassSession.endTime,
              duration: newClassSession.duration || null,
              notes: newClassSession.notes || null,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              _optimistic: true,
            };

            queryClient.setQueryData<ClassSessionResponse>(queryKey, {
              ...currentData,
              data: [
                optimisticClassSession as unknown as ClassSession,
                ...currentData.data,
              ],
              pagination: {
                ...currentData.pagination,
                total: currentData.pagination.total + 1,
              },
            });
          }
        });
        return { previousClassSessions, tempId };
      }

      // For recurring sessions, we don't do optimistic updates since multiple records are created
      return { previousClassSessions };
    },
    onError: (error, _, context) => {
      if (context?.previousClassSessions) {
        Object.entries(context.previousClassSessions).forEach(
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

      toast.error("授業の追加に失敗しました", {
        id: "class-session-create-error",
        description: getErrorMessage(error),
      });
    },
    onSuccess: (response, newClassSession, context) => {
      // For one-time sessions, update the temp ID mapping
      if (
        !newClassSession.isRecurring &&
        context?.tempId &&
        response.data.length > 0
      ) {
        const newClassSession = response.data[0];
        tempToServerIdMap.set(context.tempId, newClassSession.classId);

        // Update all class session queries
        const queries = queryClient.getQueriesData<ClassSessionResponse>({
          queryKey: ["classSessions"],
        });

        queries.forEach(([queryKey]) => {
          const currentData =
            queryClient.getQueryData<ClassSessionResponse>(queryKey);
          if (currentData) {
            queryClient.setQueryData<ClassSessionResponse>(queryKey, {
              ...currentData,
              data: currentData.data.map((session) =>
                session.classId === context.tempId ? newClassSession : session
              ),
            });
          }
        });
      }

      // For recurring sessions, we'll just refresh the data
      if (newClassSession.isRecurring && response.seriesId) {
        // Add the seriesId to the cache for possible future reference
        queryClient.setQueryData(
          ["classSessionSeriesId", response.seriesId],
          response.seriesId
        );
      }

      const successMessage = newClassSession.isRecurring
        ? `${response.data.length}件の繰り返し授業を作成しました`
        : "授業を作成しました";

      toast.success(successMessage, {
        id: "class-session-create-success",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ["classSessions"],
        refetchType: "none",
      });
    },
  });
}

// Hook for updating a class session
export function useClassSessionUpdate() {
  const queryClient = useQueryClient();
  return useMutation<
    SingleClassSessionResponse,
    Error,
    ClassSessionUpdate,
    ClassSessionMutationContext
  >({
    mutationFn: ({ classId, ...data }) => {
      // Resolve the ID before sending to the server
      const resolvedId = getResolvedClassSessionId(classId);

      return fetcher(`/api/class-sessions/${resolvedId}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
    },
    onMutate: async (updatedClassSession) => {
      await queryClient.cancelQueries({ queryKey: ["classSessions"] });

      // Resolve ID for any potential temporary ID
      const resolvedId = getResolvedClassSessionId(updatedClassSession.classId);

      await queryClient.cancelQueries({
        queryKey: ["classSession", resolvedId],
      });

      const queries = queryClient.getQueriesData<ClassSessionResponse>({
        queryKey: ["classSessions"],
      });

      const previousClassSessions: Record<string, ClassSessionResponse> = {};
      queries.forEach(([queryKey, data]) => {
        if (data) {
          previousClassSessions[JSON.stringify(queryKey)] = data;
        }
      });

      const previousClassSession = queryClient.getQueryData<ClassSession>([
        "classSession",
        resolvedId,
      ]);

      queries.forEach(([queryKey]) => {
        const currentData =
          queryClient.getQueryData<ClassSessionResponse>(queryKey);
        if (currentData) {
          queryClient.setQueryData<ClassSessionResponse>(queryKey, {
            ...currentData,
            data: currentData.data.map((session) =>
              session.classId === updatedClassSession.classId
                ? {
                    ...session,
                    ...updatedClassSession,
                    teacherId:
                      updatedClassSession.teacherId ?? session.teacherId,
                    studentId:
                      updatedClassSession.studentId ?? session.studentId,
                    subjectId:
                      updatedClassSession.subjectId ?? session.subjectId,
                    classTypeId:
                      updatedClassSession.classTypeId ?? session.classTypeId,
                    boothId: updatedClassSession.boothId ?? session.boothId,
                    date: (updatedClassSession.date ?? session.date) as Date,
                    startTime: (updatedClassSession.startTime ??
                      session.startTime) as Date,
                    endTime: (updatedClassSession.endTime ??
                      session.endTime) as Date,
                    duration: updatedClassSession.duration ?? session.duration,
                    notes: updatedClassSession.notes ?? session.notes,
                    updatedAt: new Date() as Date,
                  }
                : session
            ),
          });
        }
      });

      if (previousClassSession) {
        queryClient.setQueryData<ClassSession>(["classSession", resolvedId], {
          ...previousClassSession,
          ...updatedClassSession,
          teacherId:
            updatedClassSession.teacherId ?? previousClassSession.teacherId,
          studentId:
            updatedClassSession.studentId ?? previousClassSession.studentId,
          subjectId:
            updatedClassSession.subjectId ?? previousClassSession.subjectId,
          classTypeId:
            updatedClassSession.classTypeId ?? previousClassSession.classTypeId,
          boothId: updatedClassSession.boothId ?? previousClassSession.boothId,
          date: (updatedClassSession.date ?? previousClassSession.date) as Date,
          startTime: (updatedClassSession.startTime ??
            previousClassSession.startTime) as Date,
          endTime: (updatedClassSession.endTime ??
            previousClassSession.endTime) as Date,
          duration:
            updatedClassSession.duration ?? previousClassSession.duration,
          notes: updatedClassSession.notes ?? previousClassSession.notes,
          updatedAt: new Date() as Date,
        });
      }

      return { previousClassSessions, previousClassSession };
    },
    onError: (error, variables, context) => {
      if (context?.previousClassSessions) {
        Object.entries(context.previousClassSessions).forEach(
          ([queryKeyStr, data]) => {
            const queryKey = JSON.parse(queryKeyStr);
            queryClient.setQueryData(queryKey, data);
          }
        );
      }

      // Resolve the ID for restoring the single class session query
      const resolvedId = getResolvedClassSessionId(variables.classId);

      if (context?.previousClassSession) {
        queryClient.setQueryData(
          ["classSession", resolvedId],
          context.previousClassSession
        );
      }

      toast.error("授業の更新に失敗しました", {
        id: "class-session-update-error",
        description: getErrorMessage(error),
      });
    },
    onSuccess: () => {
      toast.success("授業を更新しました", {
        id: "class-session-update-success",
      });
    },
    onSettled: (_, __, variables) => {
      // Resolve ID for proper invalidation
      const resolvedId = getResolvedClassSessionId(variables.classId);

      queryClient.invalidateQueries({
        queryKey: ["classSessions"],
        refetchType: "none",
      });

      queryClient.invalidateQueries({
        queryKey: ["classSession", resolvedId],
        refetchType: "none",
      });

      // If this session belongs to a series, invalidate series data too
      const classSession = queryClient.getQueryData<ClassSession>([
        "classSession",
        resolvedId,
      ]);
      if (classSession?.seriesId) {
        queryClient.invalidateQueries({
          queryKey: ["classSessionSeries", classSession.seriesId],
          refetchType: "none",
        });
      }
    },
  });
}

// Hook for deleting a class session
export function useClassSessionDelete() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string, ClassSessionMutationContext>({
    mutationFn: (classId) => {
      // Resolve the ID before sending to the server
      const resolvedId = getResolvedClassSessionId(classId);

      return fetcher(`/api/class-sessions/${resolvedId}`, {
        method: "DELETE",
      });
    },
    onMutate: async (classId) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["classSessions"] });

      // Resolve ID for any potential temporary ID
      const resolvedId = getResolvedClassSessionId(classId);

      await queryClient.cancelQueries({
        queryKey: ["classSession", resolvedId],
      });

      // Snapshot all class session queries
      const queries = queryClient.getQueriesData<ClassSessionResponse>({
        queryKey: ["classSessions"],
      });

      const previousClassSessions: Record<string, ClassSessionResponse> = {};

      // Save all class session queries for potential rollback
      queries.forEach(([queryKey, data]) => {
        if (data) {
          previousClassSessions[JSON.stringify(queryKey)] = data;
        }
      });

      // Save the class session being deleted and its seriesId (if it has one)
      let deletedClassSession: ClassSession | undefined;
      let seriesId: string | null = null;

      for (const [, data] of queries) {
        if (data) {
          const found = data.data.find(
            (session) => session.classId === classId
          );
          if (found) {
            deletedClassSession = found;
            seriesId = found.seriesId;
            break;
          }
        }
      }

      // Optimistically update all class session queries
      queries.forEach(([queryKey]) => {
        const currentData =
          queryClient.getQueryData<ClassSessionResponse>(queryKey);

        if (currentData) {
          queryClient.setQueryData<ClassSessionResponse>(queryKey, {
            ...currentData,
            data: currentData.data.filter(
              (session) => session.classId !== classId
            ),
            pagination: {
              ...currentData.pagination,
              total: Math.max(0, currentData.pagination.total - 1),
            },
          });
        }
      });

      // If it belongs to a series, update that too
      if (seriesId) {
        const seriesData = queryClient.getQueryData<ClassSession[]>([
          "classSessionSeries",
          seriesId,
        ]);
        if (seriesData) {
          queryClient.setQueryData<ClassSession[]>(
            ["classSessionSeries", seriesId],
            seriesData.filter((session) => session.classId !== classId)
          );
        }
      }

      // Remove the individual class session query
      queryClient.removeQueries({ queryKey: ["classSession", resolvedId] });

      // If it was a temporary ID, clean up the mapping
      if (classId.startsWith("temp-")) {
        tempToServerIdMap.delete(classId);
      }

      // Return the snapshots for rollback
      return { previousClassSessions, deletedClassSession };
    },
    onError: (error, classId, context) => {
      // Rollback class session list queries
      if (context?.previousClassSessions) {
        Object.entries(context.previousClassSessions).forEach(
          ([queryKeyStr, data]) => {
            const queryKey = JSON.parse(queryKeyStr);
            queryClient.setQueryData(queryKey, data);
          }
        );
      }

      // Restore mapping if it was removed
      if (classId.startsWith("temp-") && context?.deletedClassSession) {
        tempToServerIdMap.set(classId, context.deletedClassSession.classId);
      }

      // Resolve ID for restoring the single class session query
      const resolvedId = getResolvedClassSessionId(classId);

      // Restore individual class session query if it existed
      if (context?.deletedClassSession) {
        queryClient.setQueryData(
          ["classSession", resolvedId],
          context.deletedClassSession
        );

        // If it belongs to a series, restore that too
        if (context.deletedClassSession.seriesId) {
          const seriesData = queryClient.getQueryData<ClassSession[]>([
            "classSessionSeries",
            context.deletedClassSession.seriesId,
          ]);

          if (seriesData) {
            // Check if the session is already in the array
            const sessionExists = seriesData.some(
              (session) => session.classId === classId
            );
            if (!sessionExists) {
              queryClient.setQueryData<ClassSession[]>(
                ["classSessionSeries", context.deletedClassSession.seriesId],
                [...seriesData, context.deletedClassSession]
              );
            }
          }
        }
      }

      toast.error("授業の削除に失敗しました", {
        id: "class-session-delete-error",
        description: getErrorMessage(error),
      });
    },
    onSuccess: (_, classId) => {
      // If it was a temporary ID, clean up the mapping on success
      if (classId.startsWith("temp-")) {
        tempToServerIdMap.delete(classId);
      }

      toast.success("授業を削除しました", {
        id: "class-session-delete-success",
      });
    },
    onSettled: (_, __, classId) => {
      // Resolve ID for proper invalidation
      const resolvedId = getResolvedClassSessionId(classId);

      // Invalidate queries in the background to ensure eventual consistency
      queryClient.invalidateQueries({
        queryKey: ["classSessions"],
        refetchType: "all",
      });

      queryClient.invalidateQueries({
        queryKey: ["classSession", resolvedId],
        refetchType: "none",
      });
    },
  });
}

// Hook for bulk deleting class sessions
export function useClassSessionBulkDelete() {
  const queryClient = useQueryClient();
  return useMutation<
    BulkDeleteResponse,
    Error,
    ClassSessionBulkDelete,
    ClassSessionMutationContext
  >({
    mutationFn: (data) =>
      fetcher("/api/class-sessions", {
        method: "DELETE",
        body: JSON.stringify(data),
      }),
    onMutate: async (bulkDeleteData) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["classSessions"] });

      const { classIds } = bulkDeleteData;

      // Resolve IDs for any potential temporary IDs
      const resolvedIds = classIds.map((id) => getResolvedClassSessionId(id));

      // Cancel individual class session queries
      resolvedIds.forEach((id) => {
        queryClient.cancelQueries({ queryKey: ["classSession", id] });
      });

      // Snapshot all class session queries
      const queries = queryClient.getQueriesData<ClassSessionResponse>({
        queryKey: ["classSessions"],
      });

      const previousClassSessions: Record<string, ClassSessionResponse> = {};
      const deletedClassSessions: ClassSession[] = [];

      // Save all class session queries for potential rollback
      queries.forEach(([queryKey, data]) => {
        if (data) {
          previousClassSessions[JSON.stringify(queryKey)] = data;

          // Collect sessions that will be deleted
          const sessionsToDelete = data.data.filter((session) =>
            classIds.includes(session.classId)
          );
          deletedClassSessions.push(...sessionsToDelete);
        }
      });

      // Optimistically update all class session queries
      queries.forEach(([queryKey]) => {
        const currentData =
          queryClient.getQueryData<ClassSessionResponse>(queryKey);

        if (currentData) {
          const remainingSessions = currentData.data.filter(
            (session) => !classIds.includes(session.classId)
          );

          queryClient.setQueryData<ClassSessionResponse>(queryKey, {
            ...currentData,
            data: remainingSessions,
            pagination: {
              ...currentData.pagination,
              total: Math.max(
                0,
                currentData.pagination.total -
                  (currentData.data.length - remainingSessions.length)
              ),
            },
          });
        }
      });

      // Update series data if any deleted sessions belong to series
      const seriesIds = new Set(
        deletedClassSessions
          .map((session) => session.seriesId)
          .filter((id): id is string => id !== null)
      );

      seriesIds.forEach((seriesId) => {
        const seriesData = queryClient.getQueryData<ClassSession[]>([
          "classSessionSeries",
          seriesId,
        ]);
        if (seriesData) {
          queryClient.setQueryData<ClassSession[]>(
            ["classSessionSeries", seriesId],
            seriesData.filter((session) => !classIds.includes(session.classId))
          );
        }
      });

      // Remove individual class session queries
      resolvedIds.forEach((id) => {
        queryClient.removeQueries({ queryKey: ["classSession", id] });
      });

      // Clean up temporary ID mappings
      classIds.forEach((id) => {
        if (id.startsWith("temp-")) {
          tempToServerIdMap.delete(id);
        }
      });

      // Return the snapshots for rollback
      return { previousClassSessions, deletedClassSessions };
    },
    onError: (error, variables, context) => {
      // Rollback class session list queries
      if (context?.previousClassSessions) {
        Object.entries(context.previousClassSessions).forEach(
          ([queryKeyStr, data]) => {
            const queryKey = JSON.parse(queryKeyStr);
            queryClient.setQueryData(queryKey, data);
          }
        );
      }

      // Restore temporary ID mappings
      if (context?.deletedClassSessions) {
        variables.classIds.forEach((id, index) => {
          if (id.startsWith("temp-") && context.deletedClassSessions?.[index]) {
            tempToServerIdMap.set(
              id,
              context.deletedClassSessions[index].classId
            );
          }
        });
      }

      // Restore individual class session queries
      if (context?.deletedClassSessions) {
        context.deletedClassSessions.forEach((session) => {
          const resolvedId = getResolvedClassSessionId(session.classId);
          queryClient.setQueryData(["classSession", resolvedId], session);

          // Restore series data if applicable
          if (session.seriesId) {
            const seriesData = queryClient.getQueryData<ClassSession[]>([
              "classSessionSeries",
              session.seriesId,
            ]);

            if (seriesData) {
              const sessionExists = seriesData.some(
                (s) => s.classId === session.classId
              );
              if (!sessionExists) {
                queryClient.setQueryData<ClassSession[]>(
                  ["classSessionSeries", session.seriesId],
                  [...seriesData, session]
                );
              }
            }
          }
        });
      }

      toast.error("授業の一括削除に失敗しました", {
        id: "class-session-bulk-delete-error",
        description: getErrorMessage(error),
      });
    },
    onSuccess: (response, variables) => {
      // Clean up temporary ID mappings on success
      variables.classIds.forEach((id) => {
        if (id.startsWith("temp-")) {
          tempToServerIdMap.delete(id);
        }
      });

      toast.success(response.message, {
        id: "class-session-bulk-delete-success",
      });
    },
    onSettled: (_, __, variables) => {
      // Resolve IDs for proper invalidation
      const resolvedIds = variables.classIds.map((id) =>
        getResolvedClassSessionId(id)
      );

      // Invalidate queries in the background to ensure eventual consistency
      queryClient.invalidateQueries({
        queryKey: ["classSessions"],
        refetchType: "all",
      });

      resolvedIds.forEach((id) => {
        queryClient.invalidateQueries({
          queryKey: ["classSession", id],
          refetchType: "none",
        });
      });
    },
  });
}

// Hook for updating all future sessions in a series
export function useClassSessionSeriesUpdate() {
  const queryClient = useQueryClient();
  return useMutation<
    ClassSessionResponse,
    Error,
    ClassSessionSeriesUpdate,
    { previousData?: ClassSession[] }
  >({
    mutationFn: ({ seriesId, ...data }) => {
      return fetcher(`/api/class-sessions/series/${seriesId}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
    },
    onMutate: async (updatedSeries) => {
      const { seriesId } = updatedSeries;

      // Cancel any outgoing refetches for the series
      await queryClient.cancelQueries({
        queryKey: ["classSessionSeries", seriesId],
      });

      // Save the current sessions for this series
      const previousData = queryClient.getQueryData<ClassSession[]>([
        "classSessionSeries",
        seriesId,
      ]);

      // We're not doing optimistic updates for series update since it's complex
      // to determine which sessions are in the future

      return { previousData };
    },
    onError: (error, variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(
          ["classSessionSeries", variables.seriesId],
          context.previousData
        );
      }

      toast.error("授業シリーズの更新に失敗しました", {
        id: "class-session-series-update-error",
        description: getErrorMessage(error),
      });
    },
    onSuccess: (response) => {
      toast.success(`${response.data.length}件の授業を更新しました`, {
        id: "class-session-series-update-success",
      });
    },
    onSettled: (_, __, variables) => {
      const { seriesId } = variables;

      // Invalidate the series query
      queryClient.invalidateQueries({
        queryKey: ["classSessionSeries", seriesId],
        refetchType: "none",
      });

      // Invalidate the general class sessions query
      queryClient.invalidateQueries({
        queryKey: ["classSessions"],
        refetchType: "none",
      });
    },
  });
}

// Hook for deleting all future sessions in a series
export function useClassSessionSeriesDelete() {
  const queryClient = useQueryClient();
  return useMutation<
    void,
    Error,
    string | { seriesId: string; fromClassId?: string },
    { previousData?: ClassSession[]; seriesId?: string }
  >({
    mutationFn: (input) => {
      if (typeof input === 'string') {
        // Backward-compatible: delete from today onward
        return fetcher(`/api/class-sessions/series/${input}`, {
          method: "DELETE",
        });
      }
      const { seriesId, fromClassId } = input;
      return fetcher(`/api/class-sessions/series/${seriesId}`, {
        method: "DELETE",
        body: fromClassId ? JSON.stringify({ fromClassId }) : undefined,
      });
    },
    onMutate: async (input) => {
      const seriesId = typeof input === 'string' ? input : input.seriesId;
      // Cancel any outgoing refetches for the series
      await queryClient.cancelQueries({
        queryKey: ["classSessionSeries", seriesId],
      });

      // Save the current sessions for this series
      const previousData = queryClient.getQueryData<ClassSession[]>([
        "classSessionSeries",
        seriesId,
      ]);

      // We're not doing optimistic updates for series deletion since it's complex
      // to determine which sessions are in the future

      return { previousData, seriesId };
    },
    onError: (error, _input, context) => {
      if (context?.previousData && context.seriesId) {
        queryClient.setQueryData(
          ["classSessionSeries", context.seriesId],
          context.previousData
        );
      }

      toast.error("授業シリーズの削除に失敗しました", {
        id: "class-session-series-delete-error",
        description: getErrorMessage(error),
      });
    },
    onSuccess: () => {
      toast.success("未来の授業を削除しました", {
        id: "class-session-series-delete-success",
      });
    },
    onSettled: (_, __, input) => {
      const seriesId = typeof input === 'string' ? input : input.seriesId;
      // Invalidate the series query
      queryClient.invalidateQueries({
        queryKey: ["classSessionSeries", seriesId],
        refetchType: "none",
      });

      // Invalidate the general class sessions query
      queryClient.invalidateQueries({
        queryKey: ["classSessions"],
        refetchType: "none",
      });
    },
  });
}

// Hook for cancelling class sessions (single or batch, or by series)
export function useClassSessionCancel() {
  const queryClient = useQueryClient();
  return useMutation<
    { data: []; message: string; updatedCount: number; pagination: { total: number; page: number; limit: number; pages: number } },
    Error,
    { classIds?: string[]; seriesId?: string; fromDate?: string; reason?: 'SICK' | 'PERMANENTLY_LEFT' | 'ADMIN_CANCELLED' }
  >({
    mutationFn: (payload) =>
      fetcher('/api/class-sessions/cancel', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: (response) => {
      toast.success(response.message || '授業をキャンセルしました');
    },
    onError: (error) => {
      const message = getErrorMessage(error);
      toast.error('授業のキャンセルに失敗しました', { description: message });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['classSessions'] });
    },
  });
}
