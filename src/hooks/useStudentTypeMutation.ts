import { fetcher } from "@/lib/fetcher";
import {
  CreateStudentTypeInput,
  UpdateStudentTypeInput,
} from "@/schemas/student-type.schema";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { StudentType } from "@prisma/client";
import { toast } from "sonner";

type CreateStudentTypeResponse = {
  message: string;
  data: StudentType;
};

type UpdateStudentTypeResponse = {
  message: string;
  data: StudentType;
};

type DeleteStudentTypeResponse = {
  message: string;
};

type StudentTypesQueryData = {
  data: StudentType[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
};

// Define context types for mutations
type StudentTypeMutationContext = {
  previousStudentTypes?: Record<string, StudentTypesQueryData>;
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
    CreateStudentTypeResponse,
    Error,
    CreateStudentTypeInput,
    StudentTypeMutationContext
  >({
    mutationFn: (data) =>
      fetcher("/api/student-type", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onMutate: async (newStudentType) => {
      await queryClient.cancelQueries({ queryKey: ["studentType"] });
      const queries = queryClient.getQueriesData<StudentTypesQueryData>({
        queryKey: ["studentType"],
      });
      const previousStudentTypes: Record<string, StudentTypesQueryData> = {};
      queries.forEach(([queryKey, data]) => {
        if (data) {
          previousStudentTypes[JSON.stringify(queryKey)] = data;
        }
      });
      const tempId = `temp-${Date.now()}`;
      queries.forEach(([queryKey]) => {
        const currentData =
          queryClient.getQueryData<StudentTypesQueryData>(queryKey);
        if (currentData) {
          const optimisticStudentType: StudentType = {
            ...newStudentType,
            studentTypeId: tempId,
            // Add extra metadata for tracking
            _optimistic: true, // Flag to identify optimistic entries
            createdAt: new Date(),
            updatedAt: new Date(),
          } as StudentType & { _optimistic?: boolean };

          queryClient.setQueryData<StudentTypesQueryData>(queryKey, {
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
        description: error.message,
      });
    },
    onSuccess: (response, _, context) => {
      if (!context?.tempId) return;

      // Store the mapping between temporary ID and server ID
      tempToServerIdMap.set(context.tempId, response.data.studentTypeId);

      // Update all studentType queries
      const queries = queryClient.getQueriesData<StudentTypesQueryData>({
        queryKey: ["studentType"],
      });
      queries.forEach(([queryKey]) => {
        const currentData =
          queryClient.getQueryData<StudentTypesQueryData>(queryKey);
        if (currentData) {
          queryClient.setQueryData<StudentTypesQueryData>(queryKey, {
            ...currentData,
            data: currentData.data.map((studentType) =>
              studentType.studentTypeId === context.tempId
                ? response.data
                : studentType
            ),
          });
        }
      });
      toast.success("生徒タイプを追加しました", {
        description: response.message,
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ["studentType"],
        refetchType: "none",
      });
    },
  });
}

export function useStudentTypeUpdate() {
  const queryClient = useQueryClient();
  return useMutation<
    UpdateStudentTypeResponse,
    Error,
    UpdateStudentTypeInput,
    StudentTypeMutationContext
  >({
    mutationFn: ({ studentTypeId, ...data }) => {
      // Resolve the ID before sending to the server
      const resolvedId = getResolvedStudentTypeId(studentTypeId);

      return fetcher(`/api/student-type`, {
        method: "PUT",
        body: JSON.stringify({ studentTypeId: resolvedId, ...data }),
      });
    },
    onMutate: async (updatedStudentType) => {
      await queryClient.cancelQueries({ queryKey: ["studentType"] });

      // Resolve ID for any potential temporary ID
      const resolvedId = getResolvedStudentTypeId(
        updatedStudentType.studentTypeId
      );

      await queryClient.cancelQueries({
        queryKey: ["studentType", resolvedId],
      });
      const queries = queryClient.getQueriesData<StudentTypesQueryData>({
        queryKey: ["studentType"],
      });
      const previousStudentTypes: Record<string, StudentTypesQueryData> = {};
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
          queryClient.getQueryData<StudentTypesQueryData>(queryKey);
        if (currentData) {
          queryClient.setQueryData<StudentTypesQueryData>(queryKey, {
            ...currentData,
            data: currentData.data.map((studentType) =>
              studentType.studentTypeId === updatedStudentType.studentTypeId
                ? {
                    ...studentType,
                    ...updatedStudentType,
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

      // Resolve the ID for restoring the single studentType query
      const resolvedId = getResolvedStudentTypeId(variables.studentTypeId);

      if (context?.previousStudentType) {
        queryClient.setQueryData(
          ["studentType", resolvedId],
          context.previousStudentType
        );
      }
      toast.error("生徒タイプの更新に失敗しました", {
        description: error.message,
      });
    },
    onSuccess: (data) => {
      toast.success("生徒タイプを更新しました", {
        description: data.message,
      });
    },
    onSettled: (_, __, variables) => {
      // Resolve ID for proper invalidation
      const resolvedId = getResolvedStudentTypeId(variables.studentTypeId);

      queryClient.invalidateQueries({
        queryKey: ["studentType"],
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
    DeleteStudentTypeResponse,
    Error,
    string,
    StudentTypeMutationContext
  >({
    mutationFn: (studentTypeId) => {
      // Resolve the ID before sending to the server
      const resolvedId = getResolvedStudentTypeId(studentTypeId);

      return fetcher(`/api/student-type?studentTypeId=${resolvedId}`, {
        method: "DELETE",
      });
    },
    onMutate: async (studentTypeId) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["studentType"] });

      // Resolve ID for any potential temporary ID
      const resolvedId = getResolvedStudentTypeId(studentTypeId);

      await queryClient.cancelQueries({
        queryKey: ["studentType", resolvedId],
      });

      // Snapshot all studentType queries
      const queries = queryClient.getQueriesData<StudentTypesQueryData>({
        queryKey: ["studentType"],
      });
      const previousStudentTypes: Record<string, StudentTypesQueryData> = {};

      // Save all studentType queries for potential rollback
      queries.forEach(([queryKey, data]) => {
        if (data) {
          previousStudentTypes[JSON.stringify(queryKey)] = data;
        }
      });

      // Save the studentType being deleted
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

      // Optimistically update all studentType queries
      queries.forEach(([queryKey]) => {
        const currentData =
          queryClient.getQueryData<StudentTypesQueryData>(queryKey);

        if (currentData) {
          queryClient.setQueryData<StudentTypesQueryData>(queryKey, {
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

      // Remove the individual studentType query
      queryClient.removeQueries({ queryKey: ["studentType", resolvedId] });

      // If it was a temporary ID, clean up the mapping
      if (studentTypeId.startsWith("temp-")) {
        tempToServerIdMap.delete(studentTypeId);
      }

      // Return the snapshots for rollback
      return { previousStudentTypes, deletedStudentType };
    },
    onError: (error, studentTypeId, context) => {
      // Rollback studentType list queries
      if (context?.previousStudentTypes) {
        Object.entries(context.previousStudentTypes).forEach(
          ([queryKeyStr, data]) => {
            const queryKey = JSON.parse(queryKeyStr);
            queryClient.setQueryData(queryKey, data);
          }
        );
      }

      // Restore mapping if it was removed
      if (studentTypeId.startsWith("temp-") && context?.deletedStudentType) {
        tempToServerIdMap.set(
          studentTypeId,
          context.deletedStudentType.studentTypeId
        );
      }

      // Resolve ID for restoring the single studentType query
      const resolvedId = getResolvedStudentTypeId(studentTypeId);

      // Restore individual studentType query if it existed
      if (context?.deletedStudentType) {
        queryClient.setQueryData(
          ["studentType", resolvedId],
          context.deletedStudentType
        );
      }

      toast.error("生徒タイプの削除に失敗しました", {
        description: error.message,
      });
    },
    onSuccess: (data, studentTypeId) => {
      // If it was a temporary ID, clean up the mapping on success
      if (studentTypeId.startsWith("temp-")) {
        tempToServerIdMap.delete(studentTypeId);
      }

      toast.success("生徒タイプを削除しました", {
        description: data.message,
      });
    },
    onSettled: (_, __, studentTypeId) => {
      // Resolve ID for proper invalidation
      const resolvedId = getResolvedStudentTypeId(studentTypeId);

      // Invalidate queries in the background to ensure eventual consistency
      queryClient.invalidateQueries({
        queryKey: ["studentType"],
        refetchType: "none",
      });
      queryClient.invalidateQueries({
        queryKey: ["studentType", resolvedId],
        refetchType: "none",
      });
    },
  });
}
