// src/hooks/useLineChannelMutation.ts
import { fetcher, CustomError } from "@/lib/fetcher";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { 
  LineChannelCreate, 
  LineChannelUpdate, 
  LineChannelAssignBranches,
  LineChannelTest,
  LineChannelSetPrimary
} from "@/schemas/line-channel.schema";
import { LineChannelResponse, LineChannelListResponse } from "@/types/line-channel";

// Helper function to extract error message from CustomError or regular Error
const getErrorMessage = (error: Error): string => {
  if (error instanceof CustomError) {
    return (error.info.error as string) || error.message;
  }
  return error.message;
};

type LineChannelMutationContext = {
  previousChannels?: Record<string, LineChannelListResponse>;
  previousChannel?: LineChannelResponse;
  deletedChannel?: LineChannelResponse;
  tempId?: string;
};

// Create a new LINE channel
export function useLineChannelCreate() {
  const queryClient = useQueryClient();
  
  return useMutation<
    { data: LineChannelResponse; message?: string },
    Error,
    LineChannelCreate,
    LineChannelMutationContext
  >({
    mutationFn: (data) =>
      fetcher("/api/admin/line-channels", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onMutate: async (newChannel) => {
      await queryClient.cancelQueries({ queryKey: ["line-channels"] });
      
      const queries = queryClient.getQueriesData<LineChannelListResponse>({
        queryKey: ["line-channels"],
      });
      
      const previousChannels: Record<string, LineChannelListResponse> = {};
      queries.forEach(([queryKey, data]) => {
        if (data) {
          previousChannels[JSON.stringify(queryKey)] = data;
        }
      });
      
      const tempId = `temp-${Date.now()}`;
      
      // Optimistic update for all line-channels queries
      queries.forEach(([queryKey]) => {
        const currentData = queryClient.getQueryData<LineChannelListResponse>(queryKey);
        if (currentData) {
          const optimisticChannel: LineChannelResponse = {
            id: tempId,
            name: newChannel.name,
            description: newChannel.description || null,
            webhookUrl: null,
            isActive: newChannel.isActive !== false,
            isDefault: false,
            channelAccessTokenPreview: "****",
            channelSecretPreview: "****",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            branches: [],
            _optimistic: true,
          } as LineChannelResponse & { _optimistic?: boolean };
          
          queryClient.setQueryData<LineChannelListResponse>(queryKey, {
            ...currentData,
            data: [optimisticChannel, ...currentData.data],
            pagination: {
              ...currentData.pagination,
              total: currentData.pagination.total + 1,
            },
          });
        }
      });
      
      return { previousChannels, tempId };
    },
    onError: (error, _, context) => {
      if (context?.previousChannels) {
        Object.entries(context.previousChannels).forEach(
          ([queryKeyStr, data]) => {
            const queryKey = JSON.parse(queryKeyStr);
            queryClient.setQueryData(queryKey, data);
          }
        );
      }
      
      toast.error("LINEチャンネルの追加に失敗しました", {
        id: "line-channel-create-error",
        description: getErrorMessage(error),
      });
    },
    onSuccess: (response, _, context) => {
      if (!context?.tempId) return;
      
      const newChannel = response.data;
      
      // Update all line-channels queries with the real data
      const queries = queryClient.getQueriesData<LineChannelListResponse>({
        queryKey: ["line-channels"],
      });
      
      queries.forEach(([queryKey]) => {
        const currentData = queryClient.getQueryData<LineChannelListResponse>(queryKey);
        if (currentData?.data) {
          queryClient.setQueryData<LineChannelListResponse>(queryKey, {
            ...currentData,
            data: currentData.data.map((channel) =>
              channel.id === context.tempId ? newChannel : channel
            ),
          });
        }
      });
      
      toast.success("LINEチャンネルを追加しました", {
        id: "line-channel-create-success",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ["line-channels"],
        refetchType: "none",
      });
      queryClient.invalidateQueries({
        queryKey: ["branch-line-channels"],
        refetchType: "none",
      });
    },
  });
}

// Update an existing LINE channel
export function useLineChannelUpdate() {
  const queryClient = useQueryClient();
  
  return useMutation<
    { data: LineChannelResponse; message?: string },
    Error,
    { channelId: string } & LineChannelUpdate,
    LineChannelMutationContext
  >({
    mutationFn: ({ channelId, ...data }) =>
      fetcher(`/api/admin/line-channels/${channelId}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    onMutate: async ({ channelId, ...updatedChannel }) => {
      await queryClient.cancelQueries({ queryKey: ["line-channels"] });
      await queryClient.cancelQueries({ queryKey: ["line-channel", channelId] });
      
      const queries = queryClient.getQueriesData<LineChannelListResponse>({
        queryKey: ["line-channels"],
      });
      
      const previousChannels: Record<string, LineChannelListResponse> = {};
      queries.forEach(([queryKey, data]) => {
        if (data) {
          previousChannels[JSON.stringify(queryKey)] = data;
        }
      });
      
      const previousChannel = queryClient.getQueryData<LineChannelResponse>([
        "line-channel",
        channelId,
      ]);
      
      // Optimistic update for list queries
      queries.forEach(([queryKey]) => {
        const currentData = queryClient.getQueryData<LineChannelListResponse>(queryKey);
        if (currentData?.data) {
          queryClient.setQueryData<LineChannelListResponse>(queryKey, {
            ...currentData,
            data: currentData.data.map((channel) =>
              channel.id === channelId
                ? {
                    ...channel,
                    ...updatedChannel,
                    updatedAt: new Date().toISOString(),
                  }
                : channel
            ),
          });
        }
      });
      
      // Optimistic update for single channel query
      if (previousChannel) {
        queryClient.setQueryData<LineChannelResponse>(["line-channel", channelId], {
          ...previousChannel,
          ...updatedChannel,
          updatedAt: new Date().toISOString(),
        });
      }
      
      return { previousChannels, previousChannel };
    },
    onError: (error, variables, context) => {
      if (context?.previousChannels) {
        Object.entries(context.previousChannels).forEach(
          ([queryKeyStr, data]) => {
            const queryKey = JSON.parse(queryKeyStr);
            queryClient.setQueryData(queryKey, data);
          }
        );
      }
      
      if (context?.previousChannel) {
        queryClient.setQueryData(
          ["line-channel", variables.channelId],
          context.previousChannel
        );
      }
      
      toast.error("LINEチャンネルの更新に失敗しました", {
        id: "line-channel-update-error",
        description: getErrorMessage(error),
      });
    },
    onSuccess: () => {
      toast.success("LINEチャンネルを更新しました", {
        id: "line-channel-update-success",
      });
    },
    onSettled: (_, __, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["line-channels"],
        refetchType: "none",
      });
      queryClient.invalidateQueries({
        queryKey: ["line-channel", variables.channelId],
        refetchType: "none",
      });
      queryClient.invalidateQueries({
        queryKey: ["branch-line-channels"],
        refetchType: "none",
      });
    },
  });
}

// Delete a LINE channel
export function useLineChannelDelete() {
  const queryClient = useQueryClient();
  
  return useMutation<
    { message: string },
    Error,
    string,
    LineChannelMutationContext
  >({
    mutationFn: (channelId) =>
      fetcher(`/api/admin/line-channels/${channelId}`, {
        method: "DELETE",
      }),
    onMutate: async (channelId) => {
      await queryClient.cancelQueries({ queryKey: ["line-channels"] });
      await queryClient.cancelQueries({ queryKey: ["line-channel", channelId] });
      
      const queries = queryClient.getQueriesData<LineChannelListResponse>({
        queryKey: ["line-channels"],
      });
      
      const previousChannels: Record<string, LineChannelListResponse> = {};
      
      // Save all channel queries for potential rollback
      queries.forEach(([queryKey, data]) => {
        if (data) {
          previousChannels[JSON.stringify(queryKey)] = data;
        }
      });
      
      // Save the channel being deleted
      let deletedChannel: LineChannelResponse | undefined;
      for (const [, data] of queries) {
        if (data?.data) {
          const found = data.data.find((channel) => channel.id === channelId);
          if (found) {
            deletedChannel = found;
            break;
          }
        }
      }
      
      // Optimistically update all channel queries
      queries.forEach(([queryKey]) => {
        const currentData = queryClient.getQueryData<LineChannelListResponse>(queryKey);
        
        if (currentData?.data) {
          queryClient.setQueryData<LineChannelListResponse>(queryKey, {
            ...currentData,
            data: currentData.data.filter((channel) => channel.id !== channelId),
            pagination: {
              ...currentData.pagination,
              total: Math.max(0, currentData.pagination.total - 1),
            },
          });
        }
      });
      
      // Remove the individual channel query
      queryClient.removeQueries({ queryKey: ["line-channel", channelId] });
      
      return { previousChannels, deletedChannel };
    },
    onError: (error, channelId, context) => {
      // Rollback channel list queries
      if (context?.previousChannels) {
        Object.entries(context.previousChannels).forEach(
          ([queryKeyStr, data]) => {
            const queryKey = JSON.parse(queryKeyStr);
            queryClient.setQueryData(queryKey, data);
          }
        );
      }
      
      // Restore individual channel query if it existed
      if (context?.deletedChannel) {
        queryClient.setQueryData(["line-channel", channelId], context.deletedChannel);
      }
      
      toast.error("LINEチャンネルの削除に失敗しました", {
        id: "line-channel-delete-error",
        description: getErrorMessage(error),
      });
    },
    onSuccess: () => {
      toast.success("LINEチャンネルを削除しました", {
        id: "line-channel-delete-success",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ["line-channels"],
        refetchType: "none",
      });
      queryClient.invalidateQueries({
        queryKey: ["branch-line-channels"],
        refetchType: "none",
      });
    },
  });
}

// Assign branches to a LINE channel
export function useLineChannelAssignBranches() {
  const queryClient = useQueryClient();
  
  return useMutation<
    { message: string },
    Error,
    { channelId: string } & LineChannelAssignBranches
  >({
    mutationFn: ({ channelId, ...data }) =>
      fetcher(`/api/admin/line-channels/${channelId}/branches`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onError: (error) => {
      toast.error("ブランチの割り当てに失敗しました", {
        id: "line-channel-assign-error",
        description: getErrorMessage(error),
      });
    },
    onSuccess: () => {
      toast.success("ブランチを割り当てました", {
        id: "line-channel-assign-success",
      });
    },
    onSettled: (_, __, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["line-channels"],
      });
      queryClient.invalidateQueries({
        queryKey: ["line-channel", variables.channelId],
      });
      queryClient.invalidateQueries({
        queryKey: ["branch-line-channels"],
      });
    },
  });
}

// Test LINE channel credentials (for new channels)
export function useLineChannelTest() {
  return useMutation<
    { success: boolean; message: string; details?: any },
    Error,
    LineChannelTest
  >({
    mutationFn: (data) =>
      fetcher("/api/admin/line-channels/test", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onError: (error) => {
      toast.error("認証情報のテストに失敗しました", {
        id: "line-channel-test-error",
        description: getErrorMessage(error),
      });
    },
    onSuccess: (response) => {
      if (response.success) {
        toast.success("認証情報のテストに成功しました", {
          id: "line-channel-test-success",
          description: response.message,
        });
      } else {
        toast.error("認証情報のテストに失敗しました", {
          id: "line-channel-test-fail",
          description: response.message,
        });
      }
    },
  });
}

// Test existing LINE channel (using channel ID)
export function useLineChannelTestExisting() {
  return useMutation<
    { success: boolean; botInfo?: any; messageResult?: any },
    Error,
    { channelId: string; testUserId?: string }
  >({
    mutationFn: ({ channelId, testUserId }) =>
      fetcher(`/api/admin/line-channels/${channelId}/test`, {
        method: "POST",
        body: JSON.stringify({ testUserId }),
      }),
    onError: (error) => {
      toast.error("チャンネルのテストに失敗しました", {
        id: "line-channel-test-existing-error",
        description: getErrorMessage(error),
      });
    },
    onSuccess: (response) => {
      if (response.success) {
        toast.success("チャンネルのテストに成功しました", {
          id: "line-channel-test-existing-success",
          description: "チャンネルは正常に動作しています",
        });
      } else {
        toast.error("チャンネルのテストに失敗しました", {
          id: "line-channel-test-existing-fail",
        });
      }
    },
  });
}

// Set a channel as primary for a branch
export function useLineChannelSetPrimary() {
  const queryClient = useQueryClient();
  
  return useMutation<
    { message: string },
    Error,
    LineChannelSetPrimary
  >({
    mutationFn: (data) =>
      fetcher("/api/admin/line-channels/set-primary", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onError: (error) => {
      toast.error("プライマリチャンネルの設定に失敗しました", {
        id: "line-channel-primary-error",
        description: getErrorMessage(error),
      });
    },
    onSuccess: () => {
      toast.success("プライマリチャンネルを設定しました", {
        id: "line-channel-primary-success",
      });
    },
    onSettled: (_, __, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["branch-line-channels", variables.branchId],
      });
      queryClient.invalidateQueries({
        queryKey: ["line-channels"],
      });
    },
  });
}

// Set channel type (TEACHER/STUDENT) for a branch
export function useLineChannelSetType() {
  const queryClient = useQueryClient();
  
  return useMutation<
    { message: string },
    Error,
    { branchId: string; channelId: string; channelType: 'TEACHER' | 'STUDENT' }
  >({
    mutationFn: (data) =>
      fetcher("/api/admin/line-channels/set-primary", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onError: (error) => {
      toast.error("チャンネルタイプの設定に失敗しました", {
        id: "line-channel-type-error",
        description: getErrorMessage(error),
      });
    },
    onSuccess: (_, variables) => {
      const typeLabel = variables.channelType === 'TEACHER' ? '講師用' : '生徒用';
      toast.success(`チャンネルを${typeLabel}に設定しました`, {
        id: "line-channel-type-success",
      });
    },
    onSettled: (_, __, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["branch-line-channels", variables.branchId],
      });
      queryClient.invalidateQueries({
        queryKey: ["line-channels"],
      });
    },
  });
}

// Unassign channel type from a branch
export function useLineChannelUnassign() {
  const queryClient = useQueryClient();
  
  return useMutation<
    { message: string },
    Error,
    { branchId: string; channelType: 'TEACHER' | 'STUDENT' }
  >({
    mutationFn: (data) =>
      fetcher("/api/admin/line-channels/unassign", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onError: (error) => {
      toast.error("チャンネルの割り当て解除に失敗しました", {
        id: "line-channel-unassign-error",
        description: getErrorMessage(error),
      });
    },
    onSuccess: (_, variables) => {
      const typeLabel = variables.channelType === 'TEACHER' ? '講師用' : '生徒用';
      toast.success(`${typeLabel}チャンネルの割り当てを解除しました`, {
        id: "line-channel-unassign-success",
      });
    },
    onSettled: (_, __, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["branch-line-channels", variables.branchId],
      });
      queryClient.invalidateQueries({
        queryKey: ["line-channels"],
      });
    },
  });
}

// Migrate from environment variables to database
export function useLineChannelMigrate() {
  const queryClient = useQueryClient();
  
  return useMutation<
    { data: LineChannelResponse; message: string },
    Error,
    void
  >({
    mutationFn: () =>
      fetcher("/api/admin/line-channels/migrate", {
        method: "POST",
      }),
    onError: (error) => {
      toast.error("環境変数からの移行に失敗しました", {
        id: "line-channel-migrate-error",
        description: getErrorMessage(error),
      });
    },
    onSuccess: () => {
      toast.success("環境変数からの移行が完了しました", {
        id: "line-channel-migrate-success",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ["line-channels"],
      });
      queryClient.invalidateQueries({
        queryKey: ["line-channel-migration-status"],
      });
    },
  });
}