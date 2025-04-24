import { z } from "zod";
import { Booth, Subject, Teacher } from "@prisma/client";

export const regularClassTemplateCreateSchema = z.object({
  dayOfWeek: z.string().max(20), // 必須
  subjectId: z.string().max(50).nullable(),
  boothId: z.string().max(50).nullable(),
  teacherId: z.string().max(50).nullable(),
  startTime: z.date(), // Date オブジェクト（時刻部分のみ使用）
  endTime: z.date(),
  startDate: z.date().nullable(),
  endDate: z.date().nullable(),
  notes: z.string().nullable(),
});

export const regularClassTemplateUpdateSchema = regularClassTemplateCreateSchema
  .partial()
  .extend({
    templateId: z.string().cuid({ message: "Invalid ID" }),
  });

export const regularClassTemplateSchema = z.object({
  templateId: z.string().cuid(),
  dayOfWeek: z.string(),
  subjectId: z.string().nullable(),
  boothId: z.string().nullable(),
  teacherId: z.string().nullable(),
  startTime: z.date(),
  endTime: z.date(),
  startDate: z.date().nullable(),
  endDate: z.date().nullable(),
  notes: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type RegularClassTemplateCreateInput = z.infer<
  typeof regularClassTemplateCreateSchema
>;
export type RegularClassTemplateUpdateInput = z.infer<
  typeof regularClassTemplateUpdateSchema
>;
export type RegularClassTemplateWithRelations = z.infer<
  typeof regularClassTemplateSchema
> & {
  booth: Booth | null;
  subject: Subject | null;
  teacher: Teacher | null;
};
