import { fetcher } from "@/lib/fetcher";
import { useQuery } from "@tanstack/react-query";
import { EventQuerySchema } from "@/schemas/event.schema";
import { Event } from "@prisma/client";

type UseEventsParams = {
  page?: number;
  limit?: number;
  name?: string;
  startDate?: string;
  endDate?: string;
  isRecurring?: boolean;
  sort?: string;
  order?: "asc" | "desc";
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
  data: Event;
};

export function useEvents(params: UseEventsParams = {}) {
  const {
    page = 1,
    limit = 10,
    name,
    startDate,
    endDate,
    isRecurring,
    sort,
    order,
  } = params;

  const query = EventQuerySchema.parse({
    page,
    limit,
    name,
    startDate,
    endDate,
    isRecurring,
    sort,
    order,
  });
  const searchParams = new URLSearchParams(
    Object.entries(query).reduce((acc, [key, value]) => {
      if (value !== undefined) {
        acc[key] = String(value);
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
      sort,
      order,
    ],
    queryFn: async () =>
      await fetcher<EventsResponse>(`/api/event?${searchParams}`),
  });
}

export function useEvent(id: string) {
  return useQuery<Event>({
    queryKey: ["event", id],
    queryFn: async () =>
      await fetcher<SingleEventResponse>(`/api/event/${id}`).then(
        (res) => res.data
      ),
    enabled: !!id,
  });
}
