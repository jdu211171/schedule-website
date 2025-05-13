import { fetcher } from "@/lib/fetcher";
import { CreateEventInput, UpdateEventInput } from "@/schemas/event.schema";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Event } from "@prisma/client";
import { toast } from "sonner";

type CreateEventResponse = {
  message: string;
  data: Event;
};

type UpdateEventResponse = {
  message: string;
  data: Event;
};

type DeleteEventResponse = {
  message: string;
};

type EventsQueryData = {
  data: Event[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
};

// Define context types for mutations
type EventMutationContext = {
  previousEvents?: Record<string, EventsQueryData>;
  previousEvent?: Event;
  deletedEvent?: Event;
  tempId?: string;
};

// Maintain a mapping between temporary IDs and server IDs
const tempToServerIdMap = new Map<string, string>();

export function getResolvedEventId(id: string): string {
  return tempToServerIdMap.get(id) || id;
}

export function useEventCreate() {
  const queryClient = useQueryClient();
  return useMutation<
  CreateEventResponse,
    Error,
    CreateEventInput,
    EventMutationContext >
      ({
        mutationFn: (data) =>
          fetcher("/api/event", {
            method: "POST",
            body: JSON.stringify(data),
          }),
        onMutate: async (newEvent) => {
          await queryClient.cancelQueries({ queryKey: ["events"] });
          const queries = queryClient.getQueriesData<EventsQueryData>({
            queryKey: ["events"],
          });
          const previousEvents: Record<string, EventsQueryData> = {};
          queries.forEach(([queryKey, data]) => {
            if (data) {
              previousEvents[JSON.stringify(queryKey)] = data;
            }
          });
          const tempId = `temp-${Date.now()}`;
          queries.forEach(([queryKey]) => {
            const currentData =
              queryClient.getQueryData<EventsQueryData>(queryKey);
            if (currentData) {
              const optimisticEvent: Event = {
                ...newEvent,
                id: tempId,
                // Add extra metadata for tracking
                _optimistic: true, // Flag to identify optimistic entries
                createdAt: new Date(),
                updatedAt: new Date(),
              } as Event & { _optimistic?: boolean };

              queryClient.setQueryData<EventsQueryData>(queryKey, {
                ...currentData,
                data: [optimisticEvent, ...currentData.data],
                pagination: {
                  ...currentData.pagination,
                  total: currentData.pagination.total + 1,
                },
              });
            }
          });
          return { previousEvents, tempId };
        },
        onError: (error, _, context) => {
          if (context?.previousEvents) {
            Object.entries(context.previousEvents).forEach(
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

          toast.error("イベントの追加に失敗しました", {
            description: error.message,
          });
        },
        onSuccess: (response, _, context) => {
          if (!context?.tempId) return;

          // Store the mapping between temporary ID and server ID
          tempToServerIdMap.set(context.tempId, response.data.id);

          // Update all event queries
          const queries = queryClient.getQueriesData<EventsQueryData>({
            queryKey: ["events"],
          });
          queries.forEach(([queryKey]) => {
            const currentData =
              queryClient.getQueryData<EventsQueryData>(queryKey);
            if (currentData) {
              queryClient.setQueryData<EventsQueryData>(queryKey, {
                ...currentData,
                data: currentData.data.map((event) =>
                  event.id === context.tempId ? response.data : event
                ),
              });
            }
          });
          toast.success("イベントを追加しました", {
            description: response.message,
          });
        },
        onSettled: () => {
          queryClient.invalidateQueries({
            queryKey: ["events"],
            refetchType: "none",
          });
        },
      });
}

export function useEventUpdate() {
  const queryClient = useQueryClient();
  return useMutation<
  UpdateEventResponse,
    Error,
    UpdateEventInput,
    EventMutationContext >
      ({
        mutationFn: ({ id, ...data }) => {
          // Resolve the ID before sending to the server
          const resolvedId = getResolvedEventId(id);

          return fetcher(`/api/event`, {
            method: "PUT",
            body: JSON.stringify({ id: resolvedId, ...data }),
          });
        },
        onMutate: async (updatedEvent) => {
          await queryClient.cancelQueries({ queryKey: ["events"] });

          // Resolve ID for any potential temporary ID
          const resolvedId = getResolvedEventId(updatedEvent.id);

          await queryClient.cancelQueries({
            queryKey: ["event", resolvedId],
          });
          const queries = queryClient.getQueriesData<EventsQueryData>({
            queryKey: ["events"],
          });
          const previousEvents: Record<string, EventsQueryData> = {};
          queries.forEach(([queryKey, data]) => {
            if (data) {
              previousEvents[JSON.stringify(queryKey)] = data;
            }
          });
          const previousEvent = queryClient.getQueryData<Event>([
            "event",
            resolvedId,
          ]);
          queries.forEach(([queryKey]) => {
            const currentData =
              queryClient.getQueryData<EventsQueryData>(queryKey);
            if (currentData) {
              queryClient.setQueryData<EventsQueryData>(queryKey, {
                ...currentData,
                data: currentData.data.map((event) =>
                  event.id === updatedEvent.id
                    ? { ...event, ...updatedEvent, updatedAt: new Date() }
                    : event
                ),
              });
            }
          });
          if (previousEvent) {
            queryClient.setQueryData<Event>(["event", resolvedId], {
              ...previousEvent,
              ...updatedEvent,
              updatedAt: new Date(),
            });
          }
          return { previousEvents, previousEvent };
        },
        onError: (error, variables, context) => {
          if (context?.previousEvents) {
            Object.entries(context.previousEvents).forEach(
              ([queryKeyStr, data]) => {
                const queryKey = JSON.parse(queryKeyStr);
                queryClient.setQueryData(queryKey, data);
              }
            );
          }

          // Resolve the ID for restoring the single event query
          const resolvedId = getResolvedEventId(variables.id);

          if (context?.previousEvent) {
            queryClient.setQueryData(
              ["event", resolvedId],
              context.previousEvent
            );
          }
          toast.error("イベントの更新に失敗しました", {
            description: error.message,
          });
        },
        onSuccess: (data) => {
          toast.success("イベントを更新しました", {
            description: data.message,
          });
        },
        onSettled: (_, __, variables) => {
          // Resolve ID for proper invalidation
          const resolvedId = getResolvedEventId(variables.id);

          queryClient.invalidateQueries({
            queryKey: ["events"],
            refetchType: "none",
          });
          queryClient.invalidateQueries({
            queryKey: ["event", resolvedId],
            refetchType: "none",
          });
        },
      });
}

export function useEventDelete() {
  const queryClient = useQueryClient();
  return useMutation<DeleteEventResponse, Error, string, EventMutationContext>({
    mutationFn: (id) => {
      // Resolve the ID before sending to the server
      const resolvedId = getResolvedEventId(id);

      return fetcher(`/api/event?id=${resolvedId}`, {
        method: "DELETE",
      });
    },
    onMutate: async (id) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["events"] });

      // Resolve ID for any potential temporary ID
      const resolvedId = getResolvedEventId(id);

      await queryClient.cancelQueries({ queryKey: ["event", resolvedId] });

      // Snapshot all event queries
      const queries = queryClient.getQueriesData<EventsQueryData>({
        queryKey: ["events"],
      });
      const previousEvents: Record<string, EventsQueryData> = {};

      // Save all event queries for potential rollback
      queries.forEach(([queryKey, data]) => {
        if (data) {
          previousEvents[JSON.stringify(queryKey)] = data;
        }
      });

      // Save the event being deleted
      let deletedEvent: Event | undefined;
      for (const [, data] of queries) {
        if (data) {
          const found = data.data.find((event) => event.id === id);
          if (found) {
            deletedEvent = found;
            break;
          }
        }
      }

      // Optimistically update all event queries
      queries.forEach(([queryKey]) => {
        const currentData = queryClient.getQueryData<EventsQueryData>(queryKey);

        if (currentData) {
          queryClient.setQueryData<EventsQueryData>(queryKey, {
            ...currentData,
            data: currentData.data.filter((event) => event.id !== id),
            pagination: {
              ...currentData.pagination,
              total: Math.max(0, currentData.pagination.total - 1),
            },
          });
        }
      });

      // Remove the individual event query
      queryClient.removeQueries({ queryKey: ["event", resolvedId] });

      // If it was a temporary ID, clean up the mapping
      if (id.startsWith("temp-")) {
        tempToServerIdMap.delete(id);
      }

      // Return the snapshots for rollback
      return { previousEvents, deletedEvent };
    },
    onError: (error, id, context) => {
      // Rollback event list queries
      if (context?.previousEvents) {
        Object.entries(context.previousEvents).forEach(
          ([queryKeyStr, data]) => {
            const queryKey = JSON.parse(queryKeyStr);
            queryClient.setQueryData(queryKey, data);
          }
        );
      }

      // Restore mapping if it was removed
      if (id.startsWith("temp-") && context?.deletedEvent) {
        tempToServerIdMap.set(id, context.deletedEvent.id);
      }

      // Resolve ID for restoring the single event query
      const resolvedId = getResolvedEventId(id);

      // Restore individual event query if it existed
      if (context?.deletedEvent) {
        queryClient.setQueryData(["event", resolvedId], context.deletedEvent);
      }

      toast.error("イベントの削除に失敗しました", {
        description: error.message,
      });
    },
    onSuccess: (data, id) => {
      // If it was a temporary ID, clean up the mapping on success
      if (id.startsWith("temp-")) {
        tempToServerIdMap.delete(id);
      }

      toast.success("イベントを削除しました", {
        description: data.message,
      });
    },
    onSettled: (_, __, id) => {
      // Resolve ID for proper invalidation
      const resolvedId = getResolvedEventId(id);

      // Invalidate queries in the background to ensure eventual consistency
      queryClient.invalidateQueries({
        queryKey: ["events"],
        refetchType: "none",
      });
      queryClient.invalidateQueries({
        queryKey: ["event", resolvedId],
        refetchType: "none",
      });
    },
  });
}
