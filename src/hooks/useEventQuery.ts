// src/hooks/useEventQuery.ts
import { fetcher } from "@/lib/fetcher";
import { useQuery } from "@tanstack/react-query";
import { eventFilterSchema } from "@/schemas/event.schema";

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

type UseEventsParams = {
  page?: number;
  limit?: number;
  name?: string;
  startDate?: Date;
  endDate?: Date;
  isRecurring?: boolean;
  branchId?: string;
};

type EventsResponse = {
  data: Event[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
};

type SingleEventResponse = {
  data: Event[];
};

export function useEvents(params: UseEventsParams = {}) {
  const {
    page = 1,
    limit = 10,
    name,
    startDate,
    endDate,
    isRecurring,
    branchId,
  } = params;

  const query = eventFilterSchema.parse({
    page,
    limit,
    name,
    startDate,
    endDate,
    isRecurring,
    branchId,
  });

  const searchParams = new URLSearchParams(
    Object.entries(query).reduce((acc, [key, value]) => {
      if (value !== undefined) {
        // Handle Date objects
        if (value instanceof Date) {
          acc[key] = value.toISOString();
        } else {
          acc[key] = String(value);
        }
      }
      return acc;
    }, {} as Record<string, string>)
  ).toString();

  return useQuery<EventsResponse>({
    queryKey: [
      "events",
      page,
      limit,
      name,
      startDate,
      endDate,
      isRecurring,
      branchId,
    ],
    queryFn: async () =>
      await fetcher<EventsResponse>(`/api/events?${searchParams}`),
  });
}

export function useEvent(eventId: string) {
  return useQuery<Event>({
    queryKey: ["event", eventId],
    queryFn: async () =>
      await fetcher<SingleEventResponse>(`/api/events/${eventId}`).then(
        (res) => res.data[0]
      ),
    enabled: !!eventId,
  });
}
