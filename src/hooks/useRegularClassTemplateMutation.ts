import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import {
  regularClassTemplateCreateSchema,
  regularClassTemplateUpdateSchema,
} from "@/schemas/regular-class-template.schema";
import { createRegularClassTemplate } from "@/actions/regularClassTemplate/create";
import { deleteRegularClassTemplate } from "@/actions/regularClassTemplate/delete";
import { updateRegularClassTemplate } from "@/actions/regularClassTemplate/update";

const createSchema = regularClassTemplateCreateSchema;
type SingleCreateInput = z.infer<typeof createSchema>;
type CreateInput = SingleCreateInput | SingleCreateInput[];

const updateSchema = regularClassTemplateUpdateSchema;
type UpdateInput = z.infer<typeof updateSchema>;

export function useRegularClassTemplateCreate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateInput) => {
      if (Array.isArray(data)) {
        z.array(createSchema).parse(data);
      } else {
        createSchema.parse(data);
      }
      return createRegularClassTemplate(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["regularClassTemplates"] });
    },
  });
}

export function useRegularClassTemplateUpdate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateInput) => {
      updateSchema.parse(data);
      return updateRegularClassTemplate(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["regularClassTemplates"] });
    },
  });
}

export function useRegularClassTemplateDelete() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteRegularClassTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["regularClassTemplates"] });
    },
  });
}
