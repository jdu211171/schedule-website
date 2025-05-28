// src/schemas/user-subject-preference.schema.ts
import { z } from "zod";

// Filters for querying user subject preferences
export const userSubjectPreferenceFilterSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
  userId: z.string().optional(),
  subjectId: z.string().optional(),
  subjectTypeId: z.string().optional(),
});

// For creating a new user subject preference
export const userSubjectPreferenceCreateSchema = z.object({
  userId: z.string().min(1),
  subjectId: z.string().min(1),
  subjectTypeId: z.string().min(1),
});

// For updating an existing user subject preference
export const userSubjectPreferenceUpdateSchema = z.object({
  id: z.string(),
  userId: z.string().min(1).optional(),
  subjectId: z.string().min(1).optional(),
  subjectTypeId: z.string().min(1).optional(),
});

export type UserSubjectPreferenceCreate = z.infer<
  typeof userSubjectPreferenceCreateSchema
>;
export type UserSubjectPreferenceUpdate = z.infer<
  typeof userSubjectPreferenceUpdateSchema
>;
export type UserSubjectPreferenceFilter = z.infer<
  typeof userSubjectPreferenceFilterSchema
>;
