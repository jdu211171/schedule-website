import { fetcher } from "@/lib/fetcher";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { RegularClassTemplate } from "@prisma/client";
import { toast } from "sonner";

type CreateRegularClassTemplateInput = {
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  teacherId: string;
  subjectId: string;
  boothId?: string;
  studentIds?: string[];
  notes?: string;
};

type UpdateRegularClassTemplateInput = {
  templateId: string;
  dayOfWeek?: string;
  startTime?: string;
  endTime?: string;
  teacherId?: string;
  subjectId?: string;
  boothId?: string;
  studentIds?: string[];
  notes?: string;
};

type CreateRegularClassTemplateResponse = {
  message: string;
  data: RegularClassTemplate;
};

type UpdateRegularClassTemplateResponse = {
  message: string;
  data: RegularClassTemplate;
};

type DeleteRegularClassTemplateResponse = {
  message: string;
};

export function useRegularClassTemplateCreate() {
  const queryClient = useQueryClient();
  return useMutation<CreateRegularClassTemplateResponse, Error, CreateRegularClassTemplateInput>({
    mutationFn: (data) =>
      fetcher("/api/regular-class-templates", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["regularClassTemplates"] });

      toast.success("通常クラスのテンプレートが正常に作成されました", {
        description: data.message,
      });
    },
    onError: (error) => {
      toast.error("通常クラスのテンプレートの作成に失敗しました", {
        description: error.message,
      });
    },
  });
}

export function useRegularClassTemplateUpdate() {
  const queryClient = useQueryClient();
  return useMutation<UpdateRegularClassTemplateResponse, Error, UpdateRegularClassTemplateInput>({
    mutationFn: (data) =>
      fetcher(`/api/regular-class-templates`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["regularClassTemplates"] });

      toast.success("通常クラスのテンプレートが正常に更新されました", {
        description: data.message,
      });
    },
    onError: (error) => {
      toast.error("通常クラスのテンプレートの更新に失敗しました", {
        description: error.message,
      });
    },
  });
}

export function useRegularClassTemplateDelete() {
  const queryClient = useQueryClient();
  return useMutation<DeleteRegularClassTemplateResponse, Error, string>({
    mutationFn: (templateId) =>
      fetcher(`/api/regular-class-templates?templateId=${templateId}`, {
        method: "DELETE",
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["regularClassTemplates"] });

      toast.success("通常クラスのテンプレートが正常に削除されました", {
        description: data.message,
      });
    },
    onError: (error) => {
      toast.error("通常クラスのテンプレートの削除に失敗しました", {
        description: error.message,
      });
    },
  });
}
