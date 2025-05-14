import { fetcher } from "@/lib/fetcher";
import {
  CreateClassTypeInput,
  UpdateClassTypeInput,
} from "@/schemas/class-type.schema";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ClassType } from "@prisma/client";
import { toast } from "sonner";

type CreateClassTypeResponse = {
  message: string;
  data: ClassType;
};

type UpdateClassTypeResponse = {
  message: string;
  data: ClassType;
};

type DeleteClassTypeResponse = {
  message: string;
};

type ClassTypesQueryData = {
  data: ClassType[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
};

// Define context types for mutations
type ClassTypeMutationContext = {
  previousClassTypes?: Record<string, ClassTypesQueryData>;
  previousClassType?: ClassType;
  deletedClassType?: ClassType;
  tempId?: string;
};

// Maintain a mapping between temporary IDs and server IDs
const tempToServerIdMap = new Map<string, string>();

export function getResolvedClassTypeId(classTypeId: string): string {
  return tempToServerIdMap.get(classTypeId) || classTypeId;
}

export function useClassTypeCreate() {
  const queryClient = useQueryClient();
  return useMutation<
    CreateClassTypeResponse,
    Error,
    CreateClassTypeInput,
    ClassTypeMutationContext
  >({
    mutationFn: (data) =>
      fetcher("/api/class-type", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onMutate: async (newClassType) => {
      await queryClient.cancelQueries({ queryKey: ["classTypes"] });
      const queries = queryClient.getQueriesData<ClassTypesQueryData>({
        queryKey: ["classTypes"],
      });
      const previousClassTypes: Record<string, ClassTypesQueryData> = {};
      queries.forEach(([queryKey, data]) => {
        if (data) {
          previousClassTypes[JSON.stringify(queryKey)] = data;
        }
      });
      const tempId = `temp-${Date.now()}`;
      queries.forEach(([queryKey]) => {
        const currentData =
          queryClient.getQueryData<ClassTypesQueryData>(queryKey);
        if (currentData) {
          const optimisticClassType: ClassType = {
            ...newClassType,
            classTypeId: tempId,
            // Add extra metadata for tracking
            _optimistic: true, // Flag to identify optimistic entries
            createdAt: new Date(),
            updatedAt: new Date(),
          } as ClassType & { _optimistic?: boolean };

          queryClient.setQueryData<ClassTypesQueryData>(queryKey, {
            ...currentData,
            data: [optimisticClassType, ...currentData.data],
            pagination: {
              ...currentData.pagination,
              total: currentData.pagination.total + 1,
            },
          });
        }
      });
      return { previousClassTypes, tempId };
    },
    onError: (error, _, context) => {
      if (context?.previousClassTypes) {
        Object.entries(context.previousClassTypes).forEach(
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

      toast.error("授業タイプの追加に失敗しました", {
        description: error.message,
      });
    },
    onSuccess: (response, _, context) => {
      if (!context?.tempId) return;

      // Store the mapping between temporary ID and server ID
      tempToServerIdMap.set(context.tempId, response.data.classTypeId);

      // Update all class type queries
      const queries = queryClient.getQueriesData<ClassTypesQueryData>({
        queryKey: ["classTypes"],
      });
      queries.forEach(([queryKey]) => {
        const currentData =
          queryClient.getQueryData<ClassTypesQueryData>(queryKey);
        if (currentData) {
          queryClient.setQueryData<ClassTypesQueryData>(queryKey, {
            ...currentData,
            data: currentData.data.map((classType) =>
              classType.classTypeId === context.tempId
                ? response.data
                : classType
            ),
          });
        }
      });
      toast.success("授業タイプを追加しました", {
        description: response.message,
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ["classTypes"],
        refetchType: "none",
      });
    },
  });
}

export function useClassTypeUpdate() {
  const queryClient = useQueryClient();
  return useMutation<
    UpdateClassTypeResponse,
    Error,
    UpdateClassTypeInput,
    ClassTypeMutationContext
  >({
    mutationFn: ({ classTypeId, ...data }) => {
      // Resolve the ID before sending to the server
      const resolvedId = getResolvedClassTypeId(classTypeId);

      return fetcher(`/api/class-type`, {
        method: "PUT",
        body: JSON.stringify({ classTypeId: resolvedId, ...data }),
      });
    },
    onMutate: async (updatedClassType) => {
      await queryClient.cancelQueries({ queryKey: ["classTypes"] });

      // Resolve ID for any potential temporary ID
      const resolvedId = getResolvedClassTypeId(updatedClassType.classTypeId);

      await queryClient.cancelQueries({
        queryKey: ["classType", resolvedId],
      });
      const queries = queryClient.getQueriesData<ClassTypesQueryData>({
        queryKey: ["classTypes"],
      });
      const previousClassTypes: Record<string, ClassTypesQueryData> = {};
      queries.forEach(([queryKey, data]) => {
        if (data) {
          previousClassTypes[JSON.stringify(queryKey)] = data;
        }
      });
      const previousClassType = queryClient.getQueryData<ClassType>([
        "classType",
        resolvedId,
      ]);
      queries.forEach(([queryKey]) => {
        const currentData =
          queryClient.getQueryData<ClassTypesQueryData>(queryKey);
        if (currentData) {
          queryClient.setQueryData<ClassTypesQueryData>(queryKey, {
            ...currentData,
            data: currentData.data.map((classType) =>
              classType.classTypeId === updatedClassType.classTypeId
                ? {
                    ...classType,
                    ...updatedClassType,
                    updatedAt: new Date(),
                  }
                : classType
            ),
          });
        }
      });
      if (previousClassType) {
        queryClient.setQueryData<ClassType>(["classType", resolvedId], {
          ...previousClassType,
          ...updatedClassType,
          updatedAt: new Date(),
        });
      }
      return { previousClassTypes, previousClassType };
    },
    onError: (error, variables, context) => {
      if (context?.previousClassTypes) {
        Object.entries(context.previousClassTypes).forEach(
          ([queryKeyStr, data]) => {
            const queryKey = JSON.parse(queryKeyStr);
            queryClient.setQueryData(queryKey, data);
          }
        );
      }

      // Resolve the ID for restoring the single class type query
      const resolvedId = getResolvedClassTypeId(variables.classTypeId);

      if (context?.previousClassType) {
        queryClient.setQueryData(
          ["classType", resolvedId],
          context.previousClassType
        );
      }
      toast.error("授業タイプの更新に失敗しました", {
        description: error.message,
      });
    },
    onSuccess: (data) => {
      toast.success("授業タイプを更新しました", {
        description: data.message,
      });
    },
    onSettled: (_, __, variables) => {
      // Resolve ID for proper invalidation
      const resolvedId = getResolvedClassTypeId(variables.classTypeId);

      queryClient.invalidateQueries({
        queryKey: ["classTypes"],
        refetchType: "none",
      });
      queryClient.invalidateQueries({
        queryKey: ["classType", resolvedId],
        refetchType: "none",
      });
    },
  });
}

export function useClassTypeDelete() {
  const queryClient = useQueryClient();
  return useMutation<
    DeleteClassTypeResponse,
    Error,
    string,
    ClassTypeMutationContext
  >({
    mutationFn: (classTypeId) => {
      // Resolve the ID before sending to the server
      const resolvedId = getResolvedClassTypeId(classTypeId);

      return fetcher(`/api/class-type?classTypeId=${resolvedId}`, {
        method: "DELETE",
      });
    },
    onMutate: async (classTypeId) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["classTypes"] });

      // Resolve ID for any potential temporary ID
      const resolvedId = getResolvedClassTypeId(classTypeId);

      await queryClient.cancelQueries({ queryKey: ["classType", resolvedId] });

      // Snapshot all class type queries
      const queries = queryClient.getQueriesData<ClassTypesQueryData>({
        queryKey: ["classTypes"],
      });
      const previousClassTypes: Record<string, ClassTypesQueryData> = {};

      // Save all class type queries for potential rollback
      queries.forEach(([queryKey, data]) => {
        if (data) {
          previousClassTypes[JSON.stringify(queryKey)] = data;
        }
      });

      // Save the class type being deleted
      let deletedClassType: ClassType | undefined;
      for (const [, data] of queries) {
        if (data) {
          const found = data.data.find(
            (classType) => classType.classTypeId === classTypeId
          );
          if (found) {
            deletedClassType = found;
            break;
          }
        }
      }

      // Optimistically update all class type queries
      queries.forEach(([queryKey]) => {
        const currentData =
          queryClient.getQueryData<ClassTypesQueryData>(queryKey);

        if (currentData) {
          queryClient.setQueryData<ClassTypesQueryData>(queryKey, {
            ...currentData,
            data: currentData.data.filter(
              (classType) => classType.classTypeId !== classTypeId
            ),
            pagination: {
              ...currentData.pagination,
              total: Math.max(0, currentData.pagination.total - 1),
            },
          });
        }
      });

      // Remove the individual class type query
      queryClient.removeQueries({ queryKey: ["classType", resolvedId] });

      // If it was a temporary ID, clean up the mapping
      if (classTypeId.startsWith("temp-")) {
        tempToServerIdMap.delete(classTypeId);
      }

      // Return the snapshots for rollback
      return { previousClassTypes, deletedClassType };
    },
    onError: (error, classTypeId, context) => {
      // Rollback class type list queries
      if (context?.previousClassTypes) {
        Object.entries(context.previousClassTypes).forEach(
          ([queryKeyStr, data]) => {
            const queryKey = JSON.parse(queryKeyStr);
            queryClient.setQueryData(queryKey, data);
          }
        );
      }

      // Restore mapping if it was removed
      if (classTypeId.startsWith("temp-") && context?.deletedClassType) {
        tempToServerIdMap.set(
          classTypeId,
          context.deletedClassType.classTypeId
        );
      }

      // Resolve ID for restoring the single class type query
      const resolvedId = getResolvedClassTypeId(classTypeId);

      // Restore individual class type query if it existed
      if (context?.deletedClassType) {
        queryClient.setQueryData(
          ["classType", resolvedId],
          context.deletedClassType
        );
      }

      toast.error("授業タイプの削除に失敗しました", {
        description: error.message,
      });
    },
    onSuccess: (data, classTypeId) => {
      // If it was a temporary ID, clean up the mapping on success
      if (classTypeId.startsWith("temp-")) {
        tempToServerIdMap.delete(classTypeId);
      }

      toast.success("授業タイプを削除しました", {
        description: data.message,
      });
    },
    onSettled: (_, __, classTypeId) => {
      // Resolve ID for proper invalidation
      const resolvedId = getResolvedClassTypeId(classTypeId);

      // Invalidate queries in the background to ensure eventual consistency
      queryClient.invalidateQueries({
        queryKey: ["classTypes"],
        refetchType: "none",
      });
      queryClient.invalidateQueries({
        queryKey: ["classType", resolvedId],
        refetchType: "none",
      });
    },
  });
}
