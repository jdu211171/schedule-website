// src/hooks/useUserSubjectPreferenceMutation.ts
import { fetcher, CustomError } from "@/lib/fetcher";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  UserSubjectPreferenceCreate,
  UserSubjectPreferenceUpdate,
} from "@/schemas/user-subject-preference.schema";
import { UserSubjectPreference } from "@/hooks/useUserSubjectPreferenceQuery";

// Helper function to extract error message from CustomError or regular Error
const getErrorMessage = (error: Error): string => {
  if (error instanceof CustomError) {
    return (error.info.error as string) || error.message;
  }
  return error.message;
};

type UserSubjectPreferencesResponse = {
  data: UserSubjectPreference[];
  message?: string;
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
};

type UserSubjectPreferenceMutationContext = {
  previousUserSubjectPreferences?: Record<
    string,
    UserSubjectPreferencesResponse
  >;
  previousUserSubjectPreference?: UserSubjectPreference;
  deletedUserSubjectPreference?: UserSubjectPreference;
  tempId?: string;
};

// Maintain a mapping between temporary IDs and server IDs
const tempToServerIdMap = new Map<string, string>();

export function getResolvedUserSubjectPreferenceId(id: string): string {
  return tempToServerIdMap.get(id) || id;
}

export function useUserSubjectPreferenceCreate() {
  const queryClient = useQueryClient();
  return useMutation<
    UserSubjectPreferencesResponse,
    Error,
    UserSubjectPreferenceCreate,
    UserSubjectPreferenceMutationContext
  >({
    mutationFn: (data) =>
      fetcher("/api/user-subject-preferences", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onMutate: async (newUserSubjectPreference) => {
      await queryClient.cancelQueries({ queryKey: ["userSubjectPreferences"] });
      const queries =
        queryClient.getQueriesData<UserSubjectPreferencesResponse>({
          queryKey: ["userSubjectPreferences"],
        });
      const previousUserSubjectPreferences: Record<
        string,
        UserSubjectPreferencesResponse
      > = {};
      queries.forEach(([queryKey, data]) => {
        if (data) {
          previousUserSubjectPreferences[JSON.stringify(queryKey)] = data;
        }
      });
      const tempId = `temp-${Date.now()}`;
      queries.forEach(([queryKey]) => {
        const currentData =
          queryClient.getQueryData<UserSubjectPreferencesResponse>(queryKey);
        if (currentData) {
          // Create optimistic user subject preference
          const optimisticUserSubjectPreference: UserSubjectPreference = {
            id: tempId,
            userId: newUserSubjectPreference.userId,
            userName: null, // We don't have this info optimistically
            username: null, // We don't have this info optimistically
            subjectId: newUserSubjectPreference.subjectId,
            subjectName: "", // We don't have this info optimistically
            subjectTypeId: newUserSubjectPreference.subjectTypeId,
            subjectTypeName: "", // We don't have this info optimistically
            createdAt: new Date(),
            _optimistic: true, // Flag to identify optimistic entries
          } as UserSubjectPreference & { _optimistic?: boolean };

          queryClient.setQueryData<UserSubjectPreferencesResponse>(queryKey, {
            ...currentData,
            data: [optimisticUserSubjectPreference, ...currentData.data],
            pagination: {
              ...currentData.pagination,
              total: currentData.pagination.total + 1,
            },
          });
        }
      });
      return { previousUserSubjectPreferences, tempId };
    },
    onError: (error, _, context) => {
      if (context?.previousUserSubjectPreferences) {
        Object.entries(context.previousUserSubjectPreferences).forEach(
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

      toast.error("ユーザー科目設定の追加に失敗しました", {
        id: "user-subject-preference-create-error",
        description: getErrorMessage(error),
      });
    },
    onSuccess: (response, _, context) => {
      if (!context?.tempId) return;

      // Store the mapping between temporary ID and server ID
      const newUserSubjectPreference = response.data[0];
      tempToServerIdMap.set(context.tempId, newUserSubjectPreference.id);

      // Update all user subject preference queries
      const queries =
        queryClient.getQueriesData<UserSubjectPreferencesResponse>({
          queryKey: ["userSubjectPreferences"],
        });

      queries.forEach(([queryKey]) => {
        const currentData =
          queryClient.getQueryData<UserSubjectPreferencesResponse>(queryKey);
        if (currentData) {
          queryClient.setQueryData<UserSubjectPreferencesResponse>(queryKey, {
            ...currentData,
            data: currentData.data.map((preference) =>
              preference.id === context.tempId
                ? newUserSubjectPreference
                : preference
            ),
          });
        }
      });

      toast.success("ユーザー科目設定を追加しました", {
        id: "user-subject-preference-create-success",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ["userSubjectPreferences"],
        refetchType: "none",
      });
    },
  });
}

export function useUserSubjectPreferenceUpdate() {
  const queryClient = useQueryClient();
  return useMutation<
    UserSubjectPreferencesResponse,
    Error,
    UserSubjectPreferenceUpdate,
    UserSubjectPreferenceMutationContext
  >({
    mutationFn: ({ id, ...data }) => {
      // Resolve the ID before sending to the server
      const resolvedId = getResolvedUserSubjectPreferenceId(id);

      return fetcher(`/api/user-subject-preferences/${resolvedId}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
    },
    onMutate: async (updatedUserSubjectPreference) => {
      await queryClient.cancelQueries({ queryKey: ["userSubjectPreferences"] });

      // Resolve ID for any potential temporary ID
      const resolvedId = getResolvedUserSubjectPreferenceId(
        updatedUserSubjectPreference.id
      );

      await queryClient.cancelQueries({
        queryKey: ["userSubjectPreference", resolvedId],
      });
      const queries =
        queryClient.getQueriesData<UserSubjectPreferencesResponse>({
          queryKey: ["userSubjectPreferences"],
        });
      const previousUserSubjectPreferences: Record<
        string,
        UserSubjectPreferencesResponse
      > = {};
      queries.forEach(([queryKey, data]) => {
        if (data) {
          previousUserSubjectPreferences[JSON.stringify(queryKey)] = data;
        }
      });
      const previousUserSubjectPreference =
        queryClient.getQueryData<UserSubjectPreference>([
          "userSubjectPreference",
          resolvedId,
        ]);
      queries.forEach(([queryKey]) => {
        const currentData =
          queryClient.getQueryData<UserSubjectPreferencesResponse>(queryKey);
        if (currentData) {
          queryClient.setQueryData<UserSubjectPreferencesResponse>(queryKey, {
            ...currentData,
            data: currentData.data.map((preference) =>
              preference.id === updatedUserSubjectPreference.id
                ? {
                    ...preference,
                    ...updatedUserSubjectPreference,
                    userId:
                      updatedUserSubjectPreference.userId || preference.userId,
                    subjectId:
                      updatedUserSubjectPreference.subjectId ||
                      preference.subjectId,
                    subjectTypeId:
                      updatedUserSubjectPreference.subjectTypeId ||
                      preference.subjectTypeId,
                  }
                : preference
            ),
          });
        }
      });
      if (previousUserSubjectPreference) {
        queryClient.setQueryData<UserSubjectPreference>(
          ["userSubjectPreference", resolvedId],
          {
            ...previousUserSubjectPreference,
            ...updatedUserSubjectPreference,
            userId:
              updatedUserSubjectPreference.userId ||
              previousUserSubjectPreference.userId,
            subjectId:
              updatedUserSubjectPreference.subjectId ||
              previousUserSubjectPreference.subjectId,
            subjectTypeId:
              updatedUserSubjectPreference.subjectTypeId ||
              previousUserSubjectPreference.subjectTypeId,
          }
        );
      }
      return { previousUserSubjectPreferences, previousUserSubjectPreference };
    },
    onError: (error, variables, context) => {
      if (context?.previousUserSubjectPreferences) {
        Object.entries(context.previousUserSubjectPreferences).forEach(
          ([queryKeyStr, data]) => {
            const queryKey = JSON.parse(queryKeyStr);
            queryClient.setQueryData(queryKey, data);
          }
        );
      }

      // Resolve the ID for restoring the single user subject preference query
      const resolvedId = getResolvedUserSubjectPreferenceId(variables.id);

      if (context?.previousUserSubjectPreference) {
        queryClient.setQueryData(
          ["userSubjectPreference", resolvedId],
          context.previousUserSubjectPreference
        );
      }
      toast.error("ユーザー科目設定の更新に失敗しました", {
        id: "user-subject-preference-update-error",
        description: getErrorMessage(error),
      });
    },
    onSuccess: () => {
      toast.success("ユーザー科目設定を更新しました", {
        id: "user-subject-preference-update-success",
      });
    },
    onSettled: (_, __, variables) => {
      // Resolve ID for proper invalidation
      const resolvedId = getResolvedUserSubjectPreferenceId(variables.id);

      queryClient.invalidateQueries({
        queryKey: ["userSubjectPreferences"],
        refetchType: "none",
      });
      queryClient.invalidateQueries({
        queryKey: ["userSubjectPreference", resolvedId],
        refetchType: "none",
      });
    },
  });
}

export function useUserSubjectPreferenceDelete() {
  const queryClient = useQueryClient();
  return useMutation<
    UserSubjectPreferencesResponse,
    Error,
    string,
    UserSubjectPreferenceMutationContext
  >({
    mutationFn: (id) => {
      // Resolve the ID before sending to the server
      const resolvedId = getResolvedUserSubjectPreferenceId(id);

      return fetcher(`/api/user-subject-preferences/${resolvedId}`, {
        method: "DELETE",
      });
    },
    onMutate: async (id) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["userSubjectPreferences"] });

      // Resolve ID for any potential temporary ID
      const resolvedId = getResolvedUserSubjectPreferenceId(id);

      await queryClient.cancelQueries({
        queryKey: ["userSubjectPreference", resolvedId],
      });

      // Snapshot all user subject preference queries
      const queries =
        queryClient.getQueriesData<UserSubjectPreferencesResponse>({
          queryKey: ["userSubjectPreferences"],
        });
      const previousUserSubjectPreferences: Record<
        string,
        UserSubjectPreferencesResponse
      > = {};

      // Save all user subject preference queries for potential rollback
      queries.forEach(([queryKey, data]) => {
        if (data) {
          previousUserSubjectPreferences[JSON.stringify(queryKey)] = data;
        }
      });

      // Save the user subject preference being deleted
      let deletedUserSubjectPreference: UserSubjectPreference | undefined;
      for (const [, data] of queries) {
        if (data) {
          const found = data.data.find((preference) => preference.id === id);
          if (found) {
            deletedUserSubjectPreference = found;
            break;
          }
        }
      }

      // Optimistically update all user subject preference queries
      queries.forEach(([queryKey]) => {
        const currentData =
          queryClient.getQueryData<UserSubjectPreferencesResponse>(queryKey);

        if (currentData) {
          queryClient.setQueryData<UserSubjectPreferencesResponse>(queryKey, {
            ...currentData,
            data: currentData.data.filter((preference) => preference.id !== id),
            pagination: {
              ...currentData.pagination,
              total: Math.max(0, currentData.pagination.total - 1),
            },
          });
        }
      });

      // Remove the individual user subject preference query
      queryClient.removeQueries({
        queryKey: ["userSubjectPreference", resolvedId],
      });

      // If it was a temporary ID, clean up the mapping
      if (id.startsWith("temp-")) {
        tempToServerIdMap.delete(id);
      }

      // Return the snapshots for rollback
      return { previousUserSubjectPreferences, deletedUserSubjectPreference };
    },
    onError: (error, id, context) => {
      // Rollback user subject preference list queries
      if (context?.previousUserSubjectPreferences) {
        Object.entries(context.previousUserSubjectPreferences).forEach(
          ([queryKeyStr, data]) => {
            const queryKey = JSON.parse(queryKeyStr);
            queryClient.setQueryData(queryKey, data);
          }
        );
      }

      // Restore mapping if it was removed
      if (id.startsWith("temp-") && context?.deletedUserSubjectPreference) {
        tempToServerIdMap.set(id, context.deletedUserSubjectPreference.id);
      }

      // Resolve ID for restoring the single user subject preference query
      const resolvedId = getResolvedUserSubjectPreferenceId(id);

      // Restore individual user subject preference query if it existed
      if (context?.deletedUserSubjectPreference) {
        queryClient.setQueryData(
          ["userSubjectPreference", resolvedId],
          context.deletedUserSubjectPreference
        );
      }

      toast.error("ユーザー科目設定の削除に失敗しました", {
        id: "user-subject-preference-delete-error",
        description: getErrorMessage(error),
      });
    },
    onSuccess: (data, id) => {
      // If it was a temporary ID, clean up the mapping on success
      if (id.startsWith("temp-")) {
        tempToServerIdMap.delete(id);
      }

      toast.success("ユーザー科目設定を削除しました", {
        id: "user-subject-preference-delete-success",
      });
    },
    onSettled: (_, __, id) => {
      // Resolve ID for proper invalidation
      const resolvedId = getResolvedUserSubjectPreferenceId(id);

      // Invalidate queries in the background to ensure eventual consistency
      queryClient.invalidateQueries({
        queryKey: ["userSubjectPreferences"],
        refetchType: "none",
      });
      queryClient.invalidateQueries({
        queryKey: ["userSubjectPreference", resolvedId],
        refetchType: "none",
      });
    },
  });
}
