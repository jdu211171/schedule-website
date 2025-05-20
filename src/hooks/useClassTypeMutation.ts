// src/hooks/useClassTypeMutation.ts
import { fetcher } from "@/lib/fetcher";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ClassTypeCreate, ClassTypeUpdate } from "@/schemas/class-type.schema";
import { ClassType } from "@/hooks/useClassTypeQuery";

type ClassTypesResponse = {
  data: ClassType[];
  message?: string;
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
};

type ClassTypeMutationContext = {
  previousClassTypes?: Record<string, ClassTypesResponse>;
  previousClassType?: ClassType;
  deletedClassType?: ClassType;
  tempId?: string;
};

// Maintain a mapping between temporary IDs and server IDs
const tempToServerIdMap = new Map<string, string>();

export function getResolvedClassTypeId(id: string): string {
  return tempToServerIdMap.get(id) || id;
}

export function useClassTypeCreate() {
  const queryClient = useQueryClient();
  return useMutation<
  ClassTypesResponse,
    Error,
    ClassTypeCreate,
    ClassTypeMutationContext >
      ({
        mutationFn: (data) =>
          fetcher("/api/class-types", {
            method: "POST",
            body: JSON.stringify(data),
          }),
        onMutate: async (newClassType) => {
          await queryClient.cancelQueries({ queryKey: ["classTypes"] });
          const queries = queryClient.getQueriesData<ClassTypesResponse>({
            queryKey: ["classTypes"],
          });
          const previousClassTypes: Record<string, ClassTypesResponse> = {};
          queries.forEach(([queryKey, data]) => {
            if (data) {
              previousClassTypes[JSON.stringify(queryKey)] = data;
            }
          });
          const tempId = `temp-${Date.now()}`;
          queries.forEach(([queryKey]) => {
            const currentData =
              queryClient.getQueryData<ClassTypesResponse>(queryKey);
            if (currentData) {
              // Create optimistic class type
              const optimisticClassType: ClassType = {
                classTypeId: tempId,
                name: newClassType.name,
                notes: newClassType.notes || null,
                createdAt: new Date(),
                updatedAt: new Date(),
                _optimistic: true, // Flag to identify optimistic entries
              } as ClassType & { _optimistic?: boolean };

              queryClient.setQueryData<ClassTypesResponse>(queryKey, {
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

          toast.error("クラスタイプの追加に失敗しました", {
            id: "class-type-create-error",
            description: error.message,
          });
        },
        onSuccess: (response, _, context) => {
          if (!context?.tempId) return;

          // Store the mapping between temporary ID and server ID
          const newClassType = response.data[0];
          tempToServerIdMap.set(context.tempId, newClassType.classTypeId);

          // Update all class type queries
          const queries = queryClient.getQueriesData<ClassTypesResponse>({
            queryKey: ["classTypes"],
          });

          queries.forEach(([queryKey]) => {
            const currentData =
              queryClient.getQueryData<ClassTypesResponse>(queryKey);
            if (currentData) {
              queryClient.setQueryData<ClassTypesResponse>(queryKey, {
                ...currentData,
                data: currentData.data.map((classType) =>
                  classType.classTypeId === context.tempId
                    ? newClassType
                    : classType
                ),
              });
            }
          });

          toast.success("クラスタイプを追加しました", {
            id: "class-type-create-success",
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
  ClassTypesResponse,
    Error,
    ClassTypeUpdate,
    ClassTypeMutationContext >
      ({
        mutationFn: ({ classTypeId, ...data }) => {
          // Resolve the ID before sending to the server
          const resolvedId = getResolvedClassTypeId(classTypeId);

          return fetcher(`/api/class-types/${resolvedId}`, {
            method: "PATCH",
            body: JSON.stringify(data),
          });
        },
        onMutate: async (updatedClassType) => {
          await queryClient.cancelQueries({ queryKey: ["classTypes"] });

          // Resolve ID for any potential temporary ID
          const resolvedId = getResolvedClassTypeId(
            updatedClassType.classTypeId
          );

          await queryClient.cancelQueries({
            queryKey: ["classType", resolvedId],
          });
          const queries = queryClient.getQueriesData<ClassTypesResponse>({
            queryKey: ["classTypes"],
          });
          const previousClassTypes: Record<string, ClassTypesResponse> = {};
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
              queryClient.getQueryData<ClassTypesResponse>(queryKey);
            if (currentData) {
              queryClient.setQueryData<ClassTypesResponse>(queryKey, {
                ...currentData,
                data: currentData.data.map((classType) =>
                  classType.classTypeId === updatedClassType.classTypeId
                    ? {
                        ...classType,
                        ...updatedClassType,
                        name: updatedClassType.name || classType.name,
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
              name: updatedClassType.name || previousClassType.name,
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
          toast.error("クラスタイプの更新に失敗しました", {
            id: "class-type-update-error",
            description: error.message,
          });
        },
        onSuccess: (data) => {
          toast.success("クラスタイプを更新しました", {
            id: "class-type-update-success",
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
  ClassTypesResponse,
    Error,
    string,
    ClassTypeMutationContext >
      ({
        mutationFn: (classTypeId) => {
          // Resolve the ID before sending to the server
          const resolvedId = getResolvedClassTypeId(classTypeId);

          return fetcher(`/api/class-types/${resolvedId}`, {
            method: "DELETE",
          });
        },
        onMutate: async (classTypeId) => {
          // Cancel any outgoing refetches
          await queryClient.cancelQueries({ queryKey: ["classTypes"] });

          // Resolve ID for any potential temporary ID
          const resolvedId = getResolvedClassTypeId(classTypeId);

          await queryClient.cancelQueries({
            queryKey: ["classType", resolvedId],
          });

          // Snapshot all class type queries
          const queries = queryClient.getQueriesData<ClassTypesResponse>({
            queryKey: ["classTypes"],
          });
          const previousClassTypes: Record<string, ClassTypesResponse> = {};

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
              queryClient.getQueryData<ClassTypesResponse>(queryKey);

            if (currentData) {
              queryClient.setQueryData<ClassTypesResponse>(queryKey, {
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

          toast.error("クラスタイプの削除に失敗しました", {
            id: "class-type-delete-error",
            description: error.message,
          });
        },
        onSuccess: (data, classTypeId) => {
          // If it was a temporary ID, clean up the mapping on success
          if (classTypeId.startsWith("temp-")) {
            tempToServerIdMap.delete(classTypeId);
          }

          toast.success("クラスタイプを削除しました", {
            id: "class-type-delete-success",
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
