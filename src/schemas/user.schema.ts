import { z } from "zod";

export const UserSchema = z
  .object({
    id: z.string(),
    email: z.string().email().optional(),
    emailVerified: z.date().optional(),
    image: z.string().url().optional(),
    // role: UserRoleEnum.optional(),
  })
  .strict();
