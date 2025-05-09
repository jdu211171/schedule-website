// useClassSessionMutation.ts
import { fetcher } from "@/lib/fetcher";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  UpdateStandaloneClassSessionInput,
  UpdateTemplateClassSessionInput,
  ClassSession
} from "@/schemas/class-session.schema";
import { toast } from "sonner";

type UpdateClassSessionResponse = {
  message: string;
  data: ClassSession;
};

export function useClassSessionUpdate<T extends boolean>(
    classSessionId: string,
    _isTemplateBased: T // intentionally unused
) {
  void _isTemplateBased; // suppress TS unused var error
  const queryClient = useQueryClient();

  return useMutation<
      UpdateClassSessionResponse,
      Error,
      T extends true ? UpdateTemplateClassSessionInput : UpdateStandaloneClassSessionInput
  >({
    mutationFn: (data) =>
        fetcher(`/api/class-session`, {
          method: "PUT",
          body: JSON.stringify(data),
        }),
    onSuccess: (data) => {
      const d = data as UpdateClassSessionResponse;
      queryClient.invalidateQueries({ queryKey: ["class-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["class-session", classSessionId] });
      toast.success("Занятие обновлено", {
        description: d.message,
      });
    },
    onError: (error) => {
      toast.error("Не удалось обновить занятие", {
        description: (error as Error).message,
      });
    },
  });
}

export function useClassSessionCreate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) =>
        fetcher("/api/class-session", {
          method: "POST",
          body: JSON.stringify(data),
        }),
    onSuccess: (data) => {
      const d = data as { message: string };
      queryClient.invalidateQueries({ queryKey: ["class-sessions"] });
      toast.success("Занятие добавлено", {
        description: d.message,
      });
    },
    onError: (error) => {
      toast.error("Не удалось добавить занятие", {
        description: (error as Error).message,
      });
    },
  });
}

export function useClassSessionDelete() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (classSessionId) =>
        fetcher(`/api/class-session/${classSessionId}`, {
          method: "DELETE",
        }),
    onSuccess: (data) => {
      const d = data as { message: string };
      queryClient.invalidateQueries({ queryKey: ["class-sessions"] });
      toast.success("Занятие удалено", {
        description: d.message,
      });
    },
    onError: (error) => {
      toast.error("Не удалось удалить занятие", {
        description: (error as Error).message,
      });
    },
  });
}
