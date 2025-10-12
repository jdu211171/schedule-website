// src/schemas/user-preferences.schema.ts
import { z } from "zod";

export const userHiddenClassTypesSchema = z.object({
  hiddenClassTypeIds: z.array(z.string()).max(100).default([]),
});

export type UserHiddenClassTypes = z.infer<typeof userHiddenClassTypesSchema>;

