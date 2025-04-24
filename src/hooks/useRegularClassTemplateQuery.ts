import { useQuery } from "@tanstack/react-query";
import {
  RegularClassTemplate,
  Booth,
  Subject,
  Teacher,
  Student,
  TemplateStudentAssignment,
} from "@prisma/client";
import { getRegularClassTemplates } from "@/actions/regularClassTemplate";
import { getRegularClassTemplate } from "@/actions/regularClassTemplate/read";

type TemplateWithRelations = RegularClassTemplate & {
  booth: Booth | null;
  subject: Subject | null;
  teacher: Teacher | null;
  templateStudentAssignments: (TemplateStudentAssignment & {
    student: Student | null;
  })[];
};

export function useRegularClassTemplates({
  page = 1,
  pageSize = 10,
  teacherId,
  studentId,
  subjectId,
  dayOfWeek,
}: {
  page?: number;
  pageSize?: number;
  teacherId?: string;
  studentId?: string;
  subjectId?: string;
  dayOfWeek?: string;
}) {
  return useQuery({
    queryKey: [
      "regularClassTemplates",
      page,
      pageSize,
      teacherId,
      studentId,
      subjectId,
      dayOfWeek,
    ],
    queryFn: () =>
      getRegularClassTemplates({
        page,
        pageSize,
        teacherId,
        studentId,
        subjectId,
        dayOfWeek,
      }) as Promise<TemplateWithRelations[]>,
  });
}

export function useRegularClassTemplate(templateId: string) {
  return useQuery({
    queryKey: ["regularClassTemplates", templateId],
    queryFn: () =>
      getRegularClassTemplate(templateId) as Promise<TemplateWithRelations>,
    enabled: !!templateId,
  });
}
