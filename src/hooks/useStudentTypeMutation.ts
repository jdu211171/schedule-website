// src/hooks/useStudentTypeMutation.ts
import { fetcher } from "@/lib/fetcher";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  StudentTypeCreate,
  StudentTypeUpdate,
} from "@/schemas/student-type.schema";
import { StudentType } from "./useStudentTypeQuery";

type StudentTypesResponse = {
  data: StudentType[];
  message?: string;
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
};

type StudentTypeMutationContext = {
  previousStudentTypes?: Record<string, StudentTypesResponse>;
  previousStudentType?: StudentType;
  deletedStudentType?: StudentType;
  tempId?: string;
};

// Maintain a mapping between temporary IDs and server IDs
const tempToServerIdMap = new Map<string, string>();

export function getResolvedStudentTypeId(id: string): string {
  return tempToServerIdMap.get(id) || id;
}

export function useStudentTypeCreate() {
  const queryClient = useQueryClient();
  return useMutation<
  StudentTypesResponse,
    Error,
    StudentTypeCreate,
    StudentTypeMutationContext >
      ({
        mutationFn: (data) =>
          fetcher("/api/student-types", {
            method: "POST",
            body: JSON.stringify(data),
          }),
        onMutate: async (newStudentType) => {
          await queryClient.cancelQueries({ queryKey: ["studentTypes"] });
          const queries = queryClient.getQueriesData<StudentTypesResponse>({
            queryKey: ["studentTypes"],
          });
          const previousStudentTypes: Record<string, StudentTypesResponse> = {};
          queries.forEach(([queryKey, data]) => {
            if (data) {
              previousStudentTypes[JSON.stringify(queryKey)] = data;
            }
          });
          const tempId = `temp-${Date.now()}`;
          queries.forEach(([queryKey]) => {
            const currentData =
              queryClient.getQueryData<StudentTypesResponse>(queryKey);
            if (currentData) {
              // Create optimistic student type
              const optimisticStudentType: StudentType = {
                studentTypeId: tempId,
                name: newStudentType.name,
                maxYears: newStudentType.maxYears || null,
                description: newStudentType.description || null,
                studentCount: 0,
                createdAt: new Date(),
                updatedAt: new Date(),
                _optimistic: true, // Flag to identify optimistic entries
              } as StudentType & { _optimistic?: boolean };

              queryClient.setQueryData<StudentTypesResponse>(queryKey, {
                ...currentData,
                data: [optimisticStudentType, ...currentData.data],
                pagination: {
                  ...currentData.pagination,
                  total: currentData.pagination.total + 1,
                },
              });
            }
          });
          return { previousStudentTypes, tempId };
        },
        onError: (error, _, context) => {
          if (context?.previousStudentTypes) {
            Object.entries(context.previousStudentTypes).forEach(
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

          toast.error("生徒タイプの追加に失敗しました", {
            id: "student-type-create-error",
            description: error.message,
          });
        },
        onSuccess: (response, _, context) => {
          if (!context?.tempId) return;

          // Store the mapping between temporary ID and server ID
          const newStudentType = response.data[0];
          tempToServerIdMap.set(context.tempId, newStudentType.studentTypeId);

          // Update all student type queries
          const queries = queryClient.getQueriesData<StudentTypesResponse>({
            queryKey: ["studentTypes"],
          });

          queries.forEach(([queryKey]) => {
            const currentData =
              queryClient.getQueryData<StudentTypesResponse>(queryKey);
            if (currentData) {
              queryClient.setQueryData<StudentTypesResponse>(queryKey, {
                ...currentData,
                data: currentData.data.map((studentType) =>
                  studentType.studentTypeId === context.tempId
                    ? newStudentType
                    : studentType
                ),
              });
            }
          });

          toast.success("生徒タイプを追加しました", {
            id: "student-type-create-success",
          });
        },
        onSettled: () => {
          queryClient.invalidateQueries({
            queryKey: ["studentTypes"],
            refetchType: "none",
          });
        },
      });
}

export function useStudentTypeUpdate() {
  const queryClient = useQueryClient();
  return useMutation<
  StudentTypesResponse,
    Error,
    StudentTypeUpdate,
    StudentTypeMutationContext >
      ({
        mutationFn: ({ studentTypeId, ...data }) => {
          // Resolve the ID before sending to the server
          const resolvedId = getResolvedStudentTypeId(studentTypeId);

          return fetcher(`/api/student-types/${resolvedId}`, {
            method: "PATCH",
            body: JSON.stringify(data),
          });
        },
        onMutate: async (updatedStudentType) => {
          await queryClient.cancelQueries({ queryKey: ["studentTypes"] });

          // Resolve ID for any potential temporary ID
          const resolvedId = getResolvedStudentTypeId(
            updatedStudentType.studentTypeId
          );

          await queryClient.cancelQueries({
            queryKey: ["studentType", resolvedId],
          });
          const queries = queryClient.getQueriesData<StudentTypesResponse>({
            queryKey: ["studentTypes"],
          });
          const previousStudentTypes: Record<string, StudentTypesResponse> = {};
          queries.forEach(([queryKey, data]) => {
            if (data) {
              previousStudentTypes[JSON.stringify(queryKey)] = data;
            }
          });
          const previousStudentType = queryClient.getQueryData<StudentType>([
            "studentType",
            resolvedId,
          ]);
          queries.forEach(([queryKey]) => {
            const currentData =
              queryClient.getQueryData<StudentTypesResponse>(queryKey);
            if (currentData) {
              queryClient.setQueryData<StudentTypesResponse>(queryKey, {
                ...currentData,
                data: currentData.data.map((studentType) =>
                  studentType.studentTypeId === updatedStudentType.studentTypeId
                    ? {
                        ...studentType,
                        ...updatedStudentType,
                        name: updatedStudentType.name || studentType.name,
                        updatedAt: new Date(),
                      }
                    : studentType
                ),
              });
            }
          });
          if (previousStudentType) {
            queryClient.setQueryData<StudentType>(["studentType", resolvedId], {
              ...previousStudentType,
              ...updatedStudentType,
              name: updatedStudentType.name || previousStudentType.name,
              updatedAt: new Date(),
            });
          }
          return { previousStudentTypes, previousStudentType };
        },
        onError: (error, variables, context) => {
          if (context?.previousStudentTypes) {
            Object.entries(context.previousStudentTypes).forEach(
              ([queryKeyStr, data]) => {
                const queryKey = JSON.parse(queryKeyStr);
                queryClient.setQueryData(queryKey, data);
              }
            );
          }

          // Resolve the ID for restoring the single student type query
          const resolvedId = getResolvedStudentTypeId(variables.studentTypeId);

          if (context?.previousStudentType) {
            queryClient.setQueryData(
              ["studentType", resolvedId],
              context.previousStudentType
            );
          }
          toast.error("生徒タイプの更新に失敗しました", {
            id: "student-type-update-error",
            description: error.message,
          });
        },
        onSuccess: (data) => {
          toast.success("生徒タイプを更新しました", {
            id: "student-type-update-success",
          });
        },
        onSettled: (_, __, variables) => {
          // Resolve ID for proper invalidation
          const resolvedId = getResolvedStudentTypeId(variables.studentTypeId);

          queryClient.invalidateQueries({
            queryKey: ["studentTypes"],
            refetchType: "none",
          });
          queryClient.invalidateQueries({
            queryKey: ["studentType", resolvedId],
            refetchType: "none",
          });
        },
      });
}

export function useStudentTypeDelete() {
  const queryClient = useQueryClient();
  return useMutation<
  StudentTypesResponse,
    Error,
    string,
    StudentTypeMutationContext >
      ({
        mutationFn: (studentTypeId) => {
          // Resolve the ID before sending to the server
          const resolvedId = getResolvedStudentTypeId(studentTypeId);

          return fetcher(`/api/student-types/${resolvedId}`, {
            method: "DELETE",
          });
        },
        onMutate: async (studentTypeId) => {
          // Cancel any outgoing refetches
          await queryClient.cancelQueries({ queryKey: ["studentTypes"] });

          // Resolve ID for any potential temporary ID
          const resolvedId = getResolvedStudentTypeId(studentTypeId);

          await queryClient.cancelQueries({
            queryKey: ["studentType", resolvedId],
          });

          // Snapshot all student type queries
          const queries = queryClient.getQueriesData<StudentTypesResponse>({
            queryKey: ["studentTypes"],
          });
          const previousStudentTypes: Record<string, StudentTypesResponse> = {};

          // Save all student type queries for potential rollback
          queries.forEach(([queryKey, data]) => {
            if (data) {
              previousStudentTypes[JSON.stringify(queryKey)] = data;
            }
          });

          // Save the student type being deleted
          let deletedStudentType: StudentType | undefined;
          for (const [, data] of queries) {
            if (data) {
              const found = data.data.find(
                (studentType) => studentType.studentTypeId === studentTypeId
              );
              if (found) {
                deletedStudentType = found;
                break;
              }
            }
          }

          // Optimistically update all student type queries
          queries.forEach(([queryKey]) => {
            const currentData =
              queryClient.getQueryData<StudentTypesResponse>(queryKey);

            if (currentData) {
              queryClient.setQueryData<StudentTypesResponse>(queryKey, {
                ...currentData,
                data: currentData.data.filter(
                  (studentType) => studentType.studentTypeId !== studentTypeId
                ),
                pagination: {
                  ...currentData.pagination,
                  total: Math.max(0, currentData.pagination.total - 1),
                },
              });
            }
          });

          // Remove the individual student type query
          queryClient.removeQueries({ queryKey: ["studentType", resolvedId] });

          // If it was a temporary ID, clean up the mapping
          if (studentTypeId.startsWith("temp-")) {
            tempToServerIdMap.delete(studentTypeId);
          }

          // Return the snapshots for rollback
          return { previousStudentTypes, deletedStudentType };
        },
        onError: (error, studentTypeId, context) => {
          // Rollback student type list queries
          if (context?.previousStudentTypes) {
            Object.entries(context.previousStudentTypes).forEach(
              ([queryKeyStr, data]) => {
                const queryKey = JSON.parse(queryKeyStr);
                queryClient.setQueryData(queryKey, data);
              }
            );
          }

          // Restore mapping if it was removed
          if (
            studentTypeId.startsWith("temp-") &&
            context?.deletedStudentType
          ) {
            tempToServerIdMap.set(
              studentTypeId,
              context.deletedStudentType.studentTypeId
            );
          }

          // Resolve ID for restoring the single student type query
          const resolvedId = getResolvedStudentTypeId(studentTypeId);

          // Restore individual student type query if it existed
          if (context?.deletedStudentType) {
            queryClient.setQueryData(
              ["studentType", resolvedId],
              context.deletedStudentType
            );
          }

          toast.error("生徒タイプの削除に失敗しました", {
            id: "student-type-delete-error",
            description: error.message,
          });
        },
        onSuccess: (data, studentTypeId) => {
          // If it was a temporary ID, clean up the mapping on success
          if (studentTypeId.startsWith("temp-")) {
            tempToServerIdMap.delete(studentTypeId);
          }

          toast.success("生徒タイプを削除しました", {
            id: "student-type-delete-success",
          });
        },
        onSettled: (_, __, studentTypeId) => {
          // Resolve ID for proper invalidation
          const resolvedId = getResolvedStudentTypeId(studentTypeId);

          // Invalidate queries in the background to ensure eventual consistency
          queryClient.invalidateQueries({
            queryKey: ["studentTypes"],
            refetchType: "none",
          });
          queryClient.invalidateQueries({
            queryKey: ["studentType", resolvedId],
            refetchType: "none",
          });

          // Also invalidate student queries as they may reference student types
          queryClient.invalidateQueries({
            queryKey: ["students"],
            refetchType: "none",
          });
        },
      });
}
