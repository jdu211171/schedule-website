// useClassSessionMutation.ts
import { fetcher } from "@/lib/fetcher";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CreateClassSessionInput,
  UpdateStandaloneClassSessionInput,
  UpdateTemplateClassSessionInput,
  ClassSession
} from "@/schemas/class-session.schema";
import { toast } from "sonner";

type CreateClassSessionResponse = {
  message: string;
  data: ClassSession;
};

type UpdateClassSessionResponse = {
  message: string;
  data: ClassSession;
};

type DeleteClassSessionResponse = {
  message: string;
};

export function useClassSessionCreate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) =>
        fetcher("/api/class-session", {
          method: "POST",
          body: JSON.stringify(data),
        }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["class-sessions"] });
      toast.success("Занятие добавлено", {
        description: data.message,
      });
    },
    onError: (error) => {
      toast.error("Не удалось добавить занятие", {
        description: error.message,
      });
    },
  });
}

// Исправленная функция с дженериками и исправленным URL
export function useClassSessionUpdate<T extends boolean>(
    classSessionId: string,
    isTemplateBased: T
) {
  const queryClient = useQueryClient();

  return useMutation<
      UpdateClassSessionResponse,
      Error,
      T extends true ? UpdateTemplateClassSessionInput : UpdateStandaloneClassSessionInput
  >({
    mutationFn: (data) =>
        // Исправленный URL - используем корневой путь вместо /{id}
        fetcher(`/api/class-session`, {
          method: "PUT",
          body: JSON.stringify(data),
        }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["class-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["class-session", classSessionId] });
      toast.success("Занятие обновлено", {
        description: data.message,
      });
    },
    onError: (error) => {
      toast.error("Не удалось обновить занятие", {
        description: error.message,
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
      queryClient.invalidateQueries({ queryKey: ["class-sessions"] });
      toast.success("Занятие удалено", {
        description: data.message,
      });
    },
    onError: (error) => {
      toast.error("Не удалось удалить занятие", {
        description: error.message,
      });
    },
  });
}
