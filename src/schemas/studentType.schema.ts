import { z } from "zod";

export const studentTypeCreateSchema = z.object({
    name: z.string().min(1, { message: "学生タイプ名は必須です" }),
    description: z.string().optional(),
});

export type StudentTypeCreateInput = z.infer<typeof studentTypeCreateSchema>;

export const studentTypeUpdateSchema = z.object({
    studentTypeId: z.string(),
    name: z.string().min(1, { message: "学生タイプ名は必須です" }),
    description: z.string().optional(),
});

export type StudentTypeUpdateInput = z.infer<typeof studentTypeUpdateSchema>;