import { z } from "zod";
import { Booth, Subject, Teacher } from "@prisma/client";

export const regularClassTemplateCreateSchema = z.object({
  dayOfWeek: z.enum([
    "MONDAY",
    "TUESDAY",
    "WEDNESDAY",
    "THURSDAY",
    "FRIDAY",
    "SATURDAY",
    "SUNDAY",
  ]),
  subjectId: z.string().max(50),
  boothId: z.string().max(50),
  teacherId: z.string().max(50),
  startTime: z.date(),
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
  dayOfWeek: z.enum([
    "MONDAY",
    "TUESDAY",
    "WEDNESDAY",
    "THURSDAY",
    "FRIDAY",
    "SATURDAY",
    "SUNDAY",
  ]),
  subjectId: z.string(),
  boothId: z.string(),
  teacherId: z.string(),
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
