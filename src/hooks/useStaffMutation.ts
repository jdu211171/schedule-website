// src/hooks/useStaffMutation.ts
import { fetcher, CustomError } from "@/lib/fetcher";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Staff } from "./useStaffQuery";

// Helper function to extract error message from CustomError or regular Error
const getErrorMessage = (error: Error): string => {
  if (error instanceof CustomError) {
    return (error.info.error as string) || error.message;
  }
  return error.message;
};

type StaffCreate = {
  username: string;
  password: string;
  email?: string | null;
  name?: string | null;
  branchIds?: string[];
};

type StaffUpdate = {
  id: string;
  username?: string;
  password?: string;
  email?: string | null;
  name?: string | null;
  branchIds?: string[];
};

type StaffsResponse = {
  data: Staff[];
  message?: string;
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
};

type StaffMutationContext = {
  previousStaffs?: Record<string, StaffsResponse>;
  previousStaff?: Staff;
  deletedStaff?: Staff;
  tempId?: string;
};

// Maintain a mapping between temporary IDs and server IDs
const tempToServerIdMap = new Map<string, string>();

export function getResolvedStaffId(id: string): string {
  return tempToServerIdMap.get(id) || id;
}

export function useStaffCreate() {
  const queryClient = useQueryClient();
  return useMutation<
  StaffsResponse,
    Error,
    StaffCreate,
    StaffMutationContext >
      ({
        mutationFn: (data) =>
          fetcher("/api/staffs", {
            method: "POST",
            body: JSON.stringify(data),
          }),
        onMutate: async (newStaff) => {
          await queryClient.cancelQueries({ queryKey: ["staffs"] });
          const queries = queryClient.getQueriesData<StaffsResponse>({
            queryKey: ["staffs"],
          });
          const previousStaffs: Record<string, StaffsResponse> = {};
          queries.forEach(([queryKey, data]) => {
            if (data) {
              previousStaffs[JSON.stringify(queryKey)] = data;
            }
          });
          const tempId = `temp-${Date.now()}`;
          queries.forEach(([queryKey]) => {
            const currentData =
              queryClient.getQueryData<StaffsResponse>(queryKey);
            if (currentData) {
              // Create optimistic staff
              const optimisticStaff: Staff = {
                id: tempId,
                name: newStaff.name || null,
                username: newStaff.username,
                email: newStaff.email || null,
                role: "STAFF",
                branches: [],
                createdAt: new Date(),
                updatedAt: new Date(),
                _optimistic: true, // Flag to identify optimistic entries
              } as Staff & { _optimistic?: boolean };

              queryClient.setQueryData<StaffsResponse>(queryKey, {
                ...currentData,
                data: [optimisticStaff, ...currentData.data],
                pagination: {
                  ...currentData.pagination,
                  total: currentData.pagination.total + 1,
                },
              });
            }
          });
          return { previousStaffs, tempId };
        },
        onError: (error, _, context) => {
          if (context?.previousStaffs) {
            Object.entries(context.previousStaffs).forEach(
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

          toast.error("スタッフの追加に失敗しました", {
            id: "staff-create-error",
            description: getErrorMessage(error),
          });
        },
        onSuccess: (response, _, context) => {
          if (!context?.tempId) return;

          // Store the mapping between temporary ID and server ID
          const newStaff = response.data[0];
          tempToServerIdMap.set(context.tempId, newStaff.id);

          // Update all staff queries
          const queries = queryClient.getQueriesData<StaffsResponse>({
            queryKey: ["staffs"],
          });

          queries.forEach(([queryKey]) => {
            const currentData =
              queryClient.getQueryData<StaffsResponse>(queryKey);
            if (currentData) {
              queryClient.setQueryData<StaffsResponse>(queryKey, {
                ...currentData,
                data: currentData.data.map((staff) =>
                  staff.id === context.tempId ? newStaff : staff
                ),
              });
            }
          });

          toast.success("スタッフを追加しました", {
            id: "staff-create-success",
          });
        },
        onSettled: () => {
          queryClient.invalidateQueries({
            queryKey: ["staffs"],
            refetchType: "none",
          });
        },
      });
}

export function useStaffUpdate() {
  const queryClient = useQueryClient();
  return useMutation<
  StaffsResponse,
    Error,
    StaffUpdate,
    StaffMutationContext >
      ({
        mutationFn: ({ id, ...data }) => {
          // Resolve the ID before sending to the server
          const resolvedId = getResolvedStaffId(id);

          return fetcher(`/api/staffs/${resolvedId}`, {
            method: "PATCH",
            body: JSON.stringify(data),
          });
        },
        onMutate: async (updatedStaff) => {
          await queryClient.cancelQueries({ queryKey: ["staffs"] });

          // Resolve ID for any potential temporary ID
          const resolvedId = getResolvedStaffId(updatedStaff.id);

          await queryClient.cancelQueries({
            queryKey: ["staff", resolvedId],
          });
          const queries = queryClient.getQueriesData<StaffsResponse>({
            queryKey: ["staffs"],
          });
          const previousStaffs: Record<string, StaffsResponse> = {};
          queries.forEach(([queryKey, data]) => {
            if (data) {
              previousStaffs[JSON.stringify(queryKey)] = data;
            }
          });
          const previousStaff = queryClient.getQueryData<Staff>([
            "staff",
            resolvedId,
          ]);
          queries.forEach(([queryKey]) => {
            const currentData =
              queryClient.getQueryData<StaffsResponse>(queryKey);
            if (currentData) {
              queryClient.setQueryData<StaffsResponse>(queryKey, {
                ...currentData,
                data: currentData.data.map((staff) =>
                  staff.id === updatedStaff.id
                    ? {
                        ...staff,
                        ...updatedStaff,
                        name: updatedStaff.name ?? staff.name,
                        username: updatedStaff.username ?? staff.username,
                        email: updatedStaff.email ?? staff.email,
                        updatedAt: new Date(),
                      }
                    : staff
                ),
              });
            }
          });
          if (previousStaff) {
            queryClient.setQueryData<Staff>(["staff", resolvedId], {
              ...previousStaff,
              ...updatedStaff,
              name: updatedStaff.name ?? previousStaff.name,
              username: updatedStaff.username ?? previousStaff.username,
              email: updatedStaff.email ?? previousStaff.email,
              updatedAt: new Date(),
            });
          }
          return { previousStaffs, previousStaff };
        },
        onError: (error, variables, context) => {
          if (context?.previousStaffs) {
            Object.entries(context.previousStaffs).forEach(
              ([queryKeyStr, data]) => {
                const queryKey = JSON.parse(queryKeyStr);
                queryClient.setQueryData(queryKey, data);
              }
            );
          }

          // Resolve the ID for restoring the single staff query
          const resolvedId = getResolvedStaffId(variables.id);

          if (context?.previousStaff) {
            queryClient.setQueryData(
              ["staff", resolvedId],
              context.previousStaff
            );
          }
          toast.error("スタッフの更新に失敗しました", {
            id: "staff-update-error",
            description: getErrorMessage(error),
          });
        },
        onSuccess: (data) => {
          // Find the updated staff from the response
          const updatedStaff = data?.data?.[0];
          if (updatedStaff) {
            // Update all staff queries to replace the staff with the updated one
            const queries = queryClient.getQueriesData<StaffsResponse>({
              queryKey: ["staffs"],
            });
            queries.forEach(([queryKey]) => {
              const currentData = queryClient.getQueryData<StaffsResponse>(queryKey);
              if (currentData) {
                queryClient.setQueryData<StaffsResponse>(queryKey, {
                  ...currentData,
                  data: currentData.data.map((staff) =>
                    staff.id === updatedStaff.id ? updatedStaff : staff
                  ),
                });
              }
            });
            // Also update the single staff query if it exists
            queryClient.setQueryData(["staff", updatedStaff.id], updatedStaff);
          }
          toast.success("スタッフを更新しました", {
            id: "staff-update-success",
          });
        },
        onSettled: (_, __, variables) => {
          // Resolve ID for proper invalidation
          const resolvedId = getResolvedStaffId(variables.id);

          queryClient.invalidateQueries({
            queryKey: ["staffs"],
            refetchType: "none",
          });
          queryClient.invalidateQueries({
            queryKey: ["staff", resolvedId],
            refetchType: "none",
          });
        },
      });
}

export function useStaffDelete() {
  const queryClient = useQueryClient();
  return useMutation<StaffsResponse, Error, string, StaffMutationContext>({
    mutationFn: (staffId) => {
      // Resolve the ID before sending to the server
      const resolvedId = getResolvedStaffId(staffId);

      return fetcher(`/api/staffs/${resolvedId}`, {
        method: "DELETE",
      });
    },
    onMutate: async (staffId) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["staffs"] });

      // Resolve ID for any potential temporary ID
      const resolvedId = getResolvedStaffId(staffId);

      await queryClient.cancelQueries({ queryKey: ["staff", resolvedId] });

      // Snapshot all staff queries
      const queries = queryClient.getQueriesData<StaffsResponse>({
        queryKey: ["staffs"],
      });
      const previousStaffs: Record<string, StaffsResponse> = {};

      // Save all staff queries for potential rollback
      queries.forEach(([queryKey, data]) => {
        if (data) {
          previousStaffs[JSON.stringify(queryKey)] = data;
        }
      });

      // Save the staff being deleted
      let deletedStaff: Staff | undefined;
      for (const [, data] of queries) {
        if (data) {
          const found = data.data.find((staff) => staff.id === staffId);
          if (found) {
            deletedStaff = found;
            break;
          }
        }
      }

      // Optimistically update all staff queries
      queries.forEach(([queryKey]) => {
        const currentData = queryClient.getQueryData<StaffsResponse>(queryKey);

        if (currentData) {
          queryClient.setQueryData<StaffsResponse>(queryKey, {
            ...currentData,
            data: currentData.data.filter((staff) => staff.id !== staffId),
            pagination: {
              ...currentData.pagination,
              total: Math.max(0, currentData.pagination.total - 1),
            },
          });
        }
      });

      // Remove the individual staff query
      queryClient.removeQueries({ queryKey: ["staff", resolvedId] });

      // If it was a temporary ID, clean up the mapping
      if (staffId.startsWith("temp-")) {
        tempToServerIdMap.delete(staffId);
      }

      // Return the snapshots for rollback
      return { previousStaffs, deletedStaff };
    },
    onError: (error, staffId, context) => {
      // Rollback staff list queries
      if (context?.previousStaffs) {
        Object.entries(context.previousStaffs).forEach(
          ([queryKeyStr, data]) => {
            const queryKey = JSON.parse(queryKeyStr);
            queryClient.setQueryData(queryKey, data);
          }
        );
      }

      // Restore mapping if it was removed
      if (staffId.startsWith("temp-") && context?.deletedStaff) {
        tempToServerIdMap.set(staffId, context.deletedStaff.id);
      }

      // Resolve ID for restoring the single staff query
      const resolvedId = getResolvedStaffId(staffId);

      // Restore individual staff query if it existed
      if (context?.deletedStaff) {
        queryClient.setQueryData(["staff", resolvedId], context.deletedStaff);
      }

      toast.error("スタッフの削除に失敗しました", {
        id: "staff-delete-error",
        description: getErrorMessage(error),
      });
    },
    onSuccess: (data, staffId) => {
      // If it was a temporary ID, clean up the mapping on success
      if (staffId.startsWith("temp-")) {
        tempToServerIdMap.delete(staffId);
      }

      toast.success("スタッフを削除しました", {
        id: "staff-delete-success",
      });
    },
    onSettled: (_, __, staffId) => {
      // Resolve ID for proper invalidation
      const resolvedId = getResolvedStaffId(staffId);

      // Invalidate queries in the background to ensure eventual consistency
      queryClient.invalidateQueries({
        queryKey: ["staffs"],
        refetchType: "none",
      });
      queryClient.invalidateQueries({
        queryKey: ["staff", resolvedId],
        refetchType: "none",
      });
    },
  });
}
