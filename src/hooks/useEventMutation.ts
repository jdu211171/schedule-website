// src/hooks/useEventMutation.ts
import { fetcher } from "@/lib/fetcher";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { EventCreate, EventUpdate } from "@/schemas/event.schema";

type Event = {
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

type EventsResponse = {
  data: Event[];
  message?: string;
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
};

type EventMutationContext = {
  previousEvents?: Record<string, EventsResponse>;
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
  EventsResponse,
    Error,
    EventCreate,
    EventMutationContext >
      ({
        mutationFn: (data) =>
          fetcher("/api/events", {
            method: "POST",
            body: JSON.stringify(data),
          }),
        onMutate: async (newEvent) => {
          await queryClient.cancelQueries({ queryKey: ["events"] });
          const queries = queryClient.getQueriesData<EventsResponse>({
            queryKey: ["events"],
          });
          const previousEvents: Record<string, EventsResponse> = {};
          queries.forEach(([queryKey, data]) => {
            if (data) {
              previousEvents[JSON.stringify(queryKey)] = data;
            }
          });
          const tempId = `temp-${Date.now()}`;
          queries.forEach(([queryKey]) => {
            const currentData =
              queryClient.getQueryData<EventsResponse>(queryKey);
            if (currentData) {
              // Create optimistic event
              const branchId = localStorage.getItem("selectedBranchId") || "";
              const branchName = ""; // We can't know the branch name optimistically

              const optimisticEvent: Event = {
                id: tempId,
                name: newEvent.name,
                startDate: new Date(newEvent.startDate),
                endDate: new Date(newEvent.endDate),
                isRecurring: newEvent.isRecurring ?? false,
                notes: newEvent.notes || null,
                branchId: newEvent.branchId || branchId,
                branchName: branchName,
                createdAt: new Date(),
                updatedAt: new Date(),
                _optimistic: true, // Flag to identify optimistic entries
              } as Event & { _optimistic?: boolean };

              queryClient.setQueryData<EventsResponse>(queryKey, {
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
            id: "event-create-error",
            description: error.message,
          });
        },
        onSuccess: (response, _, context) => {
          if (!context?.tempId) return;

          // Store the mapping between temporary ID and server ID
          const newEvent = response.data[0];
          tempToServerIdMap.set(context.tempId, newEvent.id);

          // Update all event queries
          const queries = queryClient.getQueriesData<EventsResponse>({
            queryKey: ["events"],
          });

          queries.forEach(([queryKey]) => {
            const currentData =
              queryClient.getQueryData<EventsResponse>(queryKey);
            if (currentData) {
              queryClient.setQueryData<EventsResponse>(queryKey, {
                ...currentData,
                data: currentData.data.map((event) =>
                  event.id === context.tempId ? newEvent : event
                ),
              });
            }
          });

          toast.success("イベントを追加しました", {
            id: "event-create-success",
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
  EventsResponse,
    Error,
    EventUpdate,
    EventMutationContext >
      ({
        mutationFn: ({ eventId, ...data }) => {
          // Resolve the ID before sending to the server
          const resolvedId = getResolvedEventId(eventId);

          return fetcher(`/api/events/${resolvedId}`, {
            method: "PATCH",
            body: JSON.stringify(data),
          });
        },
        onMutate: async (updatedEvent) => {
          await queryClient.cancelQueries({ queryKey: ["events"] });

          // Resolve ID for any potential temporary ID
          const resolvedId = getResolvedEventId(updatedEvent.eventId);

          await queryClient.cancelQueries({
            queryKey: ["event", resolvedId],
          });
          const queries = queryClient.getQueriesData<EventsResponse>({
            queryKey: ["events"],
          });
          const previousEvents: Record<string, EventsResponse> = {};
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
              queryClient.getQueryData<EventsResponse>(queryKey);
            if (currentData) {
              queryClient.setQueryData<EventsResponse>(queryKey, {
                ...currentData,
                data: currentData.data.map((event) =>
                  event.id === updatedEvent.eventId
                    ? {
                        ...event,
                        ...updatedEvent,
                        name: updatedEvent.name || event.name,
                        startDate: updatedEvent.startDate || event.startDate,
                        endDate: updatedEvent.endDate || event.endDate,
                        updatedAt: new Date(),
                      }
                    : event
                ),
              });
            }
          });
          if (previousEvent) {
            queryClient.setQueryData<Event>(["event", resolvedId], {
              ...previousEvent,
              ...updatedEvent,
              name: updatedEvent.name || previousEvent.name,
              startDate: updatedEvent.startDate || previousEvent.startDate,
              endDate: updatedEvent.endDate || previousEvent.endDate,
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
          const resolvedId = getResolvedEventId(variables.eventId);

          if (context?.previousEvent) {
            queryClient.setQueryData(
              ["event", resolvedId],
              context.previousEvent
            );
          }
          toast.error("イベントの更新に失敗しました", {
            id: "event-update-error",
            description: error.message,
          });
        },
        onSuccess: (data) => {
          toast.success("イベントを更新しました", {
            id: "event-update-success",
          });
        },
        onSettled: (_, __, variables) => {
          // Resolve ID for proper invalidation
          const resolvedId = getResolvedEventId(variables.eventId);

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
  return useMutation<EventsResponse, Error, string, EventMutationContext>({
    mutationFn: (eventId) => {
      // Resolve the ID before sending to the server
      const resolvedId = getResolvedEventId(eventId);

      return fetcher(`/api/events/${resolvedId}`, {
        method: "DELETE",
      });
    },
    onMutate: async (eventId) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["events"] });

      // Resolve ID for any potential temporary ID
      const resolvedId = getResolvedEventId(eventId);

      await queryClient.cancelQueries({ queryKey: ["event", resolvedId] });

      // Snapshot all event queries
      const queries = queryClient.getQueriesData<EventsResponse>({
        queryKey: ["events"],
      });
      const previousEvents: Record<string, EventsResponse> = {};

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
          const found = data.data.find((event) => event.id === eventId);
          if (found) {
            deletedEvent = found;
            break;
          }
        }
      }

      // Optimistically update all event queries
      queries.forEach(([queryKey]) => {
        const currentData = queryClient.getQueryData<EventsResponse>(queryKey);

        if (currentData) {
          queryClient.setQueryData<EventsResponse>(queryKey, {
            ...currentData,
            data: currentData.data.filter((event) => event.id !== eventId),
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
      if (eventId.startsWith("temp-")) {
        tempToServerIdMap.delete(eventId);
      }

      // Return the snapshots for rollback
      return { previousEvents, deletedEvent };
    },
    onError: (error, eventId, context) => {
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
      if (eventId.startsWith("temp-") && context?.deletedEvent) {
        tempToServerIdMap.set(eventId, context.deletedEvent.id);
      }

      // Resolve ID for restoring the single event query
      const resolvedId = getResolvedEventId(eventId);

      // Restore individual event query if it existed
      if (context?.deletedEvent) {
        queryClient.setQueryData(["event", resolvedId], context.deletedEvent);
      }

      toast.error("イベントの削除に失敗しました", {
        id: "event-delete-error",
        description: error.message,
      });
    },
    onSuccess: (data, eventId) => {
      // If it was a temporary ID, clean up the mapping on success
      if (eventId.startsWith("temp-")) {
        tempToServerIdMap.delete(eventId);
      }

      toast.success("イベントを削除しました", {
        id: "event-delete-success",
      });
    },
    onSettled: (_, __, eventId) => {
      // Resolve ID for proper invalidation
      const resolvedId = getResolvedEventId(eventId);

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
