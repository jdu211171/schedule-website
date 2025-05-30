// src/hooks/useVacationMutation.ts
import { fetcher } from "@/lib/fetcher";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { VacationCreate, VacationUpdate } from "@/schemas/vacation.schema";

type Vacation = {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  isRecurring: boolean;
  notes: string | null;
  branchId: string | null;
  branchName: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type VacationsResponse = {
  data: Vacation[];
  message?: string;
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
};

type VacationMutationContext = {
  previousVacations?: Record<string, VacationsResponse>;
  previousVacation?: Vacation;
  deletedVacation?: Vacation;
  tempId?: string;
};

// Maintain a mapping between temporary IDs and server IDs
const tempToServerIdMap = new Map<string, string>();

export function getResolvedVacationId(id: string): string {
  return tempToServerIdMap.get(id) || id;
}

export function useVacationCreate() {
  const queryClient = useQueryClient();
  return useMutation<
  VacationsResponse,
    Error,
    VacationCreate,
    VacationMutationContext >
      ({
        mutationFn: (data) =>
          fetcher("/api/vacations", {
            method: "POST",
            body: JSON.stringify(data),
          }),
        onMutate: async (newVacation) => {
          await queryClient.cancelQueries({ queryKey: ["vacations"] });
          const queries = queryClient.getQueriesData<VacationsResponse>({
            queryKey: ["vacations"],
          });
          const previousVacations: Record<string, VacationsResponse> = {};
          queries.forEach(([queryKey, data]) => {
            if (data) {
              previousVacations[JSON.stringify(queryKey)] = data;
            }
          });
          const tempId = `temp-${Date.now()}`;
          queries.forEach(([queryKey]) => {
            queryClient.setQueryData(queryKey, (old: VacationsResponse | undefined) => {
              if (!old) return old;
              const tempVacation: Vacation = {
                id: tempId,
                name: newVacation.name,
                startDate: newVacation.startDate,
                endDate: newVacation.endDate,
                isRecurring: newVacation.isRecurring || false,
                notes: newVacation.notes || null,
                branchId: newVacation.branchId || null,
                branchName: null,
                createdAt: new Date(),
                updatedAt: new Date(),
              };
              return {
                ...old,
                data: [tempVacation, ...old.data],
                pagination: {
                  ...old.pagination,
                  total: old.pagination.total + 1,
                },
              };
            });
          });
          return { previousVacations, tempId };
        },
        onError: (error, _, context) => {
          if (context?.previousVacations) {
            Object.entries(context.previousVacations).forEach(([queryKey, data]) => {
              queryClient.setQueryData(JSON.parse(queryKey), data);
            });
          }

          // Clean up the ID mapping if we created one
          if (context?.tempId) {
            tempToServerIdMap.delete(context.tempId);
          }

          toast.error("休日の追加に失敗しました", {
            id: "vacation-create-error",
            description: error.message,
          });
        },
        onSuccess: (response, _, context) => {
          if (!context?.tempId) return;

          // Store the mapping between temporary ID and server ID
          const newVacation = response.data[0];
          tempToServerIdMap.set(context.tempId, newVacation.id);

          // Update all vacation queries
          const queries = queryClient.getQueriesData<VacationsResponse>({
            queryKey: ["vacations"],
          });

          queries.forEach(([queryKey]) => {
            queryClient.setQueryData(queryKey, (old: VacationsResponse | undefined) => {
              if (!old) return old;
              return {
                ...old,
                data: old.data.map((vacation) =>
                  vacation.id === context.tempId ? newVacation : vacation
                ),
              };
            });
          });

          toast.success("休日を追加しました", {
            id: "vacation-create-success",
          });
        },
        onSettled: () => {
          queryClient.invalidateQueries({
            queryKey: ["vacations"],
            refetchType: "none",
          });
        },
      });
}

export function useVacationUpdate() {
  const queryClient = useQueryClient();
  return useMutation<
  VacationsResponse,
    Error,
    VacationUpdate,
    VacationMutationContext >
      ({
        mutationFn: ({ vacationId, ...data }) => {
          // Resolve the ID before sending to the server
          const resolvedId = getResolvedVacationId(vacationId);

          return fetcher(`/api/vacations/${resolvedId}`, {
            method: "PATCH",
            body: JSON.stringify(data),
          });
        },
        onMutate: async (updatedVacation) => {
          await queryClient.cancelQueries({ queryKey: ["vacations"] });

          // Resolve ID for any potential temporary ID
          const resolvedId = getResolvedVacationId(updatedVacation.vacationId);

          await queryClient.cancelQueries({
            queryKey: ["vacation", resolvedId],
          });
          const queries = queryClient.getQueriesData<VacationsResponse>({
            queryKey: ["vacations"],
          });
          const previousVacations: Record<string, VacationsResponse> = {};
          queries.forEach(([queryKey, data]) => {
            if (data) {
              previousVacations[JSON.stringify(queryKey)] = data;
            }
          });
          const previousVacation = queryClient.getQueryData<Vacation>([
            "vacation",
            resolvedId,
          ]);
          queries.forEach(([queryKey]) => {
            queryClient.setQueryData(queryKey, (old: VacationsResponse | undefined) => {
              if (!old) return old;
              return {
                ...old,
                data: old.data.map((vacation) =>
                  vacation.id === updatedVacation.vacationId || vacation.id === resolvedId
                    ? { ...vacation, ...updatedVacation }
                    : vacation
                ),
              };
            });
          });
          if (previousVacation) {
            queryClient.setQueryData(["vacation", resolvedId], {
              ...previousVacation,
              ...updatedVacation,
            });
          }
          return { previousVacations, previousVacation };
        },
        onError: (error, variables, context) => {
          if (context?.previousVacations) {
            Object.entries(context.previousVacations).forEach(([queryKey, data]) => {
              queryClient.setQueryData(JSON.parse(queryKey), data);
            });
          }

          // Resolve the ID for restoring the single vacation query
          const resolvedId = getResolvedVacationId(variables.vacationId);

          if (context?.previousVacation) {
            queryClient.setQueryData(["vacation", resolvedId], context.previousVacation);
          }
          toast.error("休日の更新に失敗しました", {
            id: "vacation-update-error",
            description: error.message,
          });
        },
        onSuccess: (data) => {
          toast.success("休日を更新しました", {
            id: "vacation-update-success",
          });
        },
        onSettled: (_, __, variables) => {
          // Resolve ID for proper invalidation
          const resolvedId = getResolvedVacationId(variables.vacationId);

          queryClient.invalidateQueries({
            queryKey: ["vacations"],
            refetchType: "none",
          });
          queryClient.invalidateQueries({
            queryKey: ["vacation", resolvedId],
            refetchType: "none",
          });
        },
      });
}

export function useVacationDelete() {
  const queryClient = useQueryClient();
  return useMutation<VacationsResponse, Error, string, VacationMutationContext>({
    mutationFn: (vacationId) => {
      // Resolve the ID before sending to the server
      const resolvedId = getResolvedVacationId(vacationId);

      return fetcher(`/api/vacations/${resolvedId}`, {
        method: "DELETE",
      });
    },
    onMutate: async (vacationId) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["vacations"] });

      // Resolve ID for any potential temporary ID
      const resolvedId = getResolvedVacationId(vacationId);

      await queryClient.cancelQueries({ queryKey: ["vacation", resolvedId] });

      // Snapshot all vacation queries
      const queries = queryClient.getQueriesData<VacationsResponse>({
        queryKey: ["vacations"],
      });
      const previousVacations: Record<string, VacationsResponse> = {};

      // Save all vacation queries for potential rollback
      queries.forEach(([queryKey, data]) => {
        if (data) {
          previousVacations[JSON.stringify(queryKey)] = data;
        }
      });

      // Save the vacation being deleted
      let deletedVacation: Vacation | undefined;
      for (const [, data] of queries) {
        if (data) {
          deletedVacation = data.data.find((v) => v.id === vacationId || v.id === resolvedId);
          if (deletedVacation) break;
        }
      }

      // Optimistically update all vacation queries
      queries.forEach(([queryKey]) => {
        queryClient.setQueryData(queryKey, (old: VacationsResponse | undefined) => {
          if (!old) return old;
          return {
            ...old,
            data: old.data.filter((vacation) => vacation.id !== vacationId && vacation.id !== resolvedId),
            pagination: {
              ...old.pagination,
              total: Math.max(0, old.pagination.total - 1),
            },
          };
        });
      });

      // Remove the individual vacation query
      queryClient.removeQueries({ queryKey: ["vacation", resolvedId] });

      // If it was a temporary ID, clean up the mapping
      if (vacationId.startsWith("temp-")) {
        tempToServerIdMap.delete(vacationId);
      }

      // Return the snapshots for rollback
      return { previousVacations, deletedVacation };
    },
    onError: (error, vacationId, context) => {
      // Rollback vacation list queries
      if (context?.previousVacations) {
        Object.entries(context.previousVacations).forEach(([queryKey, data]) => {
          queryClient.setQueryData(JSON.parse(queryKey), data);
        });
      }

      // Restore mapping if it was removed
      toast.error("休日の削除に失敗しました", {
        id: "vacation-delete-error",
        description: error.message,
      });
    },
    onSuccess: (data, vacationId) => {
      toast.success("休日を削除しました", {
        id: "vacation-delete-success",
      });
    },
    onSettled: (_, __, vacationId) => {
      const resolvedId = getResolvedVacationId(vacationId);
      queryClient.invalidateQueries({
        queryKey: ["vacations"],
        refetchType: "none",
      });
      queryClient.invalidateQueries({
        queryKey: ["vacation", resolvedId],
        refetchType: "none",
      });
    },
  });
}
