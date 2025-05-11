import { fetcher } from "@/lib/fetcher";
import { useQuery } from "@tanstack/react-query";
import { Prisma } from "@prisma/client";

type UseRegularClassTemplatesParams = {
  page?: number;
  limit?: number;
  teacherId?: string;
  studentId?: string;
  subjectId?: string;
  dayOfWeek?: string;
  sort?: string;
  order?: "asc" | "desc";
};

export type RegularClassTemplateWithRelations = Prisma.RegularClassTemplateGetPayload<{
  include: {
    booth: true;
    teacher: true;
    subject: true;
    templateStudentAssignments: {
      include: {
        student: true;
      };
    };
  };
}>;

type RegularClassTemplatesResponse = {
  data: RegularClassTemplateWithRelations[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
};

type SingleRegularClassTemplateResponse = {
  data: RegularClassTemplateWithRelations;
};

export function useRegularClassTemplates(params: UseRegularClassTemplatesParams = {}) {
  const { page = 1, limit = 10, teacherId, studentId, subjectId, dayOfWeek, sort, order } = params;

  const searchParams = new URLSearchParams(
    Object.entries({ page, limit, teacherId, studentId, subjectId, dayOfWeek, sort, order }).reduce(
      (acc, [key, value]) => {
        if (value !== undefined) {
          acc[key] = String(value);
        }
        return acc;
      },
      {} as Record<string, string>
    )
  ).toString();

  return useQuery<RegularClassTemplatesResponse>({
    queryKey: ["regularClassTemplates", page, limit, teacherId, studentId, subjectId, dayOfWeek, sort, order],
    queryFn: async () => await fetcher<RegularClassTemplatesResponse>(`/api/regular-class-templates?${searchParams}`),
  });
}

export function useRegularClassTemplate(templateId: string) {
  return useQuery<RegularClassTemplateWithRelations>({
    queryKey: ["regularClassTemplate", templateId],
    queryFn: async () => await fetcher<SingleRegularClassTemplateResponse>(`/api/regular-class-templates/${templateId}`).then((res) => res.data),
    enabled: !!templateId,
  });
}
