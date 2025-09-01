// src/hooks/useClassTypeMutation.ts
import { fetcher, CustomError } from "@/lib/fetcher";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ClassTypeCreate, ClassTypeUpdate } from "@/schemas/class-type.schema";
import { ClassType } from "@/hooks/useClassTypeQuery";

// Helper function to extract error message from CustomError or regular Error
const getErrorMessage = (error: Error): string => {
  if (error instanceof CustomError) {
    const info = error.info as any;
    return (info?.error as string) || error.message;
  }
  return error.message;
};

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
  previousAllClassTypes?: ClassType[];
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
    ClassTypeMutationContext
  >({
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

      const previousAllClassTypes = queryClient.getQueryData<ClassType[]>(["classTypes", "all"]);
      const tempId = `temp-${Date.now()}`;

      queries.forEach(([queryKey]) => {
        const currentData = queryClient.getQueryData<ClassTypesResponse>(queryKey);
        if (currentData?.data) {
          const optimisticClassType: ClassType & { _optimistic?: boolean } = {
            classTypeId: tempId,
            name: newClassType.name,
            notes: newClassType.notes || null,
            parentId: newClassType.parentId || null,
            order: newClassType.order || null,
            color: (newClassType as any).color ?? null,
            createdAt: new Date(),
            updatedAt: new Date(),
            _optimistic: true,
          };

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

      if (previousAllClassTypes) {
        const optimisticClassType: ClassType & { _optimistic?: boolean } = {
          classTypeId: tempId,
          name: newClassType.name,
          notes: newClassType.notes || null,
          parentId: newClassType.parentId || null,
          order: newClassType.order || null,
          color: (newClassType as any).color ?? null,
          createdAt: new Date(),
          updatedAt: new Date(),
          _optimistic: true,
        };

        queryClient.setQueryData<ClassType[]>(["classTypes", "all"], [
          optimisticClassType,
          ...previousAllClassTypes,
        ]);
      }

      return { previousClassTypes, previousAllClassTypes, tempId };
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

      if (context?.previousAllClassTypes) {
        queryClient.setQueryData(["classTypes", "all"], context.previousAllClassTypes);
      }

      if (context?.tempId) {
        tempToServerIdMap.delete(context.tempId);
      }

      toast.error("クラスタイプの追加に失敗しました", {
        id: "class-type-create-error",
        description: getErrorMessage(error),
      });
    },
    onSuccess: (response, _, context) => {
      if (!context?.tempId || !response?.data?.[0]) return;

      const newClassType = response.data[0];
      tempToServerIdMap.set(context.tempId, newClassType.classTypeId);

      const queries = queryClient.getQueriesData<ClassTypesResponse>({
        queryKey: ["classTypes"],
      });

      queries.forEach(([queryKey]) => {
        const currentData = queryClient.getQueryData<ClassTypesResponse>(queryKey);
        if (currentData?.data) {
          queryClient.setQueryData<ClassTypesResponse>(queryKey, {
            ...currentData,
            data: currentData.data.map((classType) =>
              classType.classTypeId === context.tempId ? newClassType : classType
            ),
          });
        }
      });

      const allClassTypes = queryClient.getQueryData<ClassType[]>(["classTypes", "all"]);
      if (allClassTypes) {
        queryClient.setQueryData<ClassType[]>(["classTypes", "all"],
          allClassTypes.map((classType) =>
            classType.classTypeId === context.tempId ? newClassType : classType
          )
        );
      }

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
    ClassTypeMutationContext
  >({
    mutationFn: ({ classTypeId, ...data }) => {
      const resolvedId = getResolvedClassTypeId(classTypeId);
      return fetcher(`/api/class-types/${resolvedId}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
    },
    onMutate: async (updatedClassType) => {
      await queryClient.cancelQueries({ queryKey: ["classTypes"] });
      const resolvedId = getResolvedClassTypeId(updatedClassType.classTypeId);
      await queryClient.cancelQueries({ queryKey: ["classType", resolvedId] });

      const queries = queryClient.getQueriesData<ClassTypesResponse>({
        queryKey: ["classTypes"],
      });
      const previousClassTypes: Record<string, ClassTypesResponse> = {};
      queries.forEach(([queryKey, data]) => {
        if (data) {
          previousClassTypes[JSON.stringify(queryKey)] = data;
        }
      });

      const previousAllClassTypes = queryClient.getQueryData<ClassType[]>(["classTypes", "all"]);
      const previousClassType = queryClient.getQueryData<ClassType>(["classType", resolvedId]);

      queries.forEach(([queryKey]) => {
        const currentData = queryClient.getQueryData<ClassTypesResponse>(queryKey);
        if (currentData?.data) {
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

      if (previousAllClassTypes) {
        queryClient.setQueryData<ClassType[]>(["classTypes", "all"],
          previousAllClassTypes.map((classType) =>
            classType.classTypeId === updatedClassType.classTypeId
              ? {
                ...classType,
                ...updatedClassType,
                name: updatedClassType.name || classType.name,
                updatedAt: new Date(),
              }
              : classType
          )
        );
      }

      if (previousClassType) {
        queryClient.setQueryData<ClassType>(["classType", resolvedId], {
          ...previousClassType,
          ...updatedClassType,
          name: updatedClassType.name || previousClassType.name,
          updatedAt: new Date(),
        });
      }

      return { previousClassTypes, previousAllClassTypes, previousClassType };
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

      if (context?.previousAllClassTypes) {
        queryClient.setQueryData(["classTypes", "all"], context.previousAllClassTypes);
      }

      const resolvedId = getResolvedClassTypeId(variables.classTypeId);
      if (context?.previousClassType) {
        queryClient.setQueryData(["classType", resolvedId], context.previousClassType);
      }

      toast.error("クラスタイプの更新に失敗しました", {
        id: "class-type-update-error",
        description: getErrorMessage(error),
      });
    },
    onSuccess: () => {
      toast.success("クラスタイプを更新しました", {
        id: "class-type-update-success",
      });
    },
    onSettled: (_, __, variables) => {
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
    ClassTypeMutationContext
  >({
    mutationFn: async (classTypeId) => {
      const resolvedId = getResolvedClassTypeId(classTypeId);
      return await fetcher(`/api/class-types/${resolvedId}`, {
        method: "DELETE",
      });
    },
    onMutate: async (classTypeId) => {
      await queryClient.cancelQueries({ queryKey: ["classTypes"] });
      const resolvedId = getResolvedClassTypeId(classTypeId);
      await queryClient.cancelQueries({ queryKey: ["classType", resolvedId] });

      const queries = queryClient.getQueriesData<ClassTypesResponse>({
        queryKey: ["classTypes"],
      });
      const previousClassTypes: Record<string, ClassTypesResponse> = {};
      queries.forEach(([queryKey, data]) => {
        if (data) {
          previousClassTypes[JSON.stringify(queryKey)] = data;
        }
      });

      const previousAllClassTypes = queryClient.getQueryData<ClassType[]>(["classTypes", "all"]);

      let deletedClassType: ClassType | undefined;
      for (const [, data] of queries) {
        if (data?.data) {
          const found = data.data.find(
            (classType) => classType.classTypeId === classTypeId
          );
          if (found) {
            deletedClassType = found;
            break;
          }
        }
      }

      if (!deletedClassType && previousAllClassTypes) {
        deletedClassType = previousAllClassTypes.find(
          (classType) => classType.classTypeId === classTypeId
        );
      }

      queries.forEach(([queryKey]) => {
        const currentData = queryClient.getQueryData<ClassTypesResponse>(queryKey);
        if (currentData?.data) {
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

      if (previousAllClassTypes) {
        queryClient.setQueryData<ClassType[]>(["classTypes", "all"],
          previousAllClassTypes.filter(
            (classType) => classType.classTypeId !== classTypeId
          )
        );
      }

      queryClient.removeQueries({ queryKey: ["classType", resolvedId] });

      if (classTypeId.startsWith("temp-")) {
        tempToServerIdMap.delete(classTypeId);
      }

      return { previousClassTypes, previousAllClassTypes, deletedClassType };
    },
    onError: (error, classTypeId, context) => {
      if (context?.previousClassTypes) {
        Object.entries(context.previousClassTypes).forEach(
          ([queryKeyStr, data]) => {
            const queryKey = JSON.parse(queryKeyStr);
            queryClient.setQueryData(queryKey, data);
          }
        );
      }

      if (context?.previousAllClassTypes) {
        queryClient.setQueryData(["classTypes", "all"], context.previousAllClassTypes);
      }

      if (classTypeId.startsWith("temp-") && context?.deletedClassType) {
        tempToServerIdMap.set(classTypeId, context.deletedClassType.classTypeId);
      }

      const resolvedId = getResolvedClassTypeId(classTypeId);
      if (context?.deletedClassType) {
        queryClient.setQueryData(["classType", resolvedId], context.deletedClassType);
      }

      let errorMessage = "予期しないエラーが発生しました";

      if (error instanceof CustomError && error.info) {
        const info = error.info as any;
        if (typeof info === 'string') {
          errorMessage = info;
        } else if (info?.error && typeof info.error === 'string') {
          errorMessage = info.error;
        } else if (info?.message && typeof info.message === 'string') {
          errorMessage = info.message;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast.error("クラスタイプの削除に失敗しました", {
        id: "class-type-delete-error",
        description: errorMessage,
      });
    },
    onSuccess: (data, classTypeId) => {
      if (classTypeId.startsWith("temp-")) {
        tempToServerIdMap.delete(classTypeId);
      }

      toast.success("クラスタイプを削除しました", {
        id: "class-type-delete-success",
      });
    },
    onSettled: (_, __, classTypeId) => {
      const resolvedId = getResolvedClassTypeId(classTypeId);
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

export function useClassTypeOrderUpdate() {
  const queryClient = useQueryClient();
  return useMutation<
    ClassTypesResponse,
    Error,
    { classTypeIds: string[] },
    ClassTypeMutationContext
  >({
    mutationFn: ({ classTypeIds }) =>
      fetcher("/api/class-types/order", {
        method: "PATCH",
        body: JSON.stringify({ classTypeIds }),
      }),
    onMutate: async ({ classTypeIds }) => {
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

      const previousAllClassTypes = queryClient.getQueryData<ClassType[]>(["classTypes", "all"]);

      // Optimistically update the order
      queries.forEach(([queryKey]) => {
        const currentData = queryClient.getQueryData<ClassTypesResponse>(queryKey);
        if (currentData?.data) {
          const updatedData = {
            ...currentData,
            data: currentData.data.map((classType) => {
              const newOrder = classTypeIds.indexOf(classType.classTypeId);
              return newOrder !== -1
                ? { ...classType, order: newOrder + 1 }
                : classType;
            }),
          };

          // Re-sort the data based on the query parameters
          const queryKeyArray = queryKey as any[];
          const sortBy = queryKeyArray[5] || "order";
          const sortOrder = queryKeyArray[6] || "asc";

          if (sortBy === "order") {
            updatedData.data.sort((a, b) => {
              const aOrder = a.order ?? Number.MAX_SAFE_INTEGER;
              const bOrder = b.order ?? Number.MAX_SAFE_INTEGER;
              return sortOrder === "asc" ? aOrder - bOrder : bOrder - aOrder;
            });
          }

          queryClient.setQueryData<ClassTypesResponse>(queryKey, updatedData);
        }
      });

      // Update the "all" query if it exists
      if (previousAllClassTypes && Array.isArray(previousAllClassTypes)) {
        const updatedAllClassTypes = previousAllClassTypes.map((classType) => {
          const newOrder = classTypeIds.indexOf(classType.classTypeId);
          return newOrder !== -1
            ? { ...classType, order: newOrder + 1 }
            : classType;
        });

        // Sort by order
        updatedAllClassTypes.sort((a, b) => {
          const aOrder = a.order ?? Number.MAX_SAFE_INTEGER;
          const bOrder = b.order ?? Number.MAX_SAFE_INTEGER;
          return aOrder - bOrder;
        });

        queryClient.setQueryData<ClassType[]>(["classTypes", "all"], updatedAllClassTypes);
      }

      return { previousClassTypes, previousAllClassTypes };
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

      if (context?.previousAllClassTypes) {
        queryClient.setQueryData(["classTypes", "all"], context.previousAllClassTypes);
      }

      toast.error("クラスタイプの並び替えに失敗しました", {
        id: "class-type-order-error",
        description: getErrorMessage(error),
      });
    },
    onSuccess: () => {
      toast.success("クラスタイプの並び順を更新しました", {
        id: "class-type-order-success",
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
