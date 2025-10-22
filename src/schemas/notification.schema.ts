// src/schemas/notification.schema.ts
import { z } from "zod";
import { NotificationStatus } from "@prisma/client";

// Schema for bulk deleting notifications
export const notificationBulkDeleteSchema = z.object({
  notificationIds: z
    .array(z.string())
    .min(1, "At least one notification ID is required"),
});

// Filters for querying notifications
export const notificationFilterSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().default(15),
  status: z.nativeEnum(NotificationStatus).optional(),
  recipientType: z.string().optional(),
  notificationType: z.string().optional(),
  startDate: z.string().optional(), // "YYYY-MM-DD"
  endDate: z.string().optional(), // "YYYY-MM-DD"
  search: z.string().optional(),
});

export type NotificationBulkDelete = z.infer<
  typeof notificationBulkDeleteSchema
>;
export type NotificationFilter = z.infer<typeof notificationFilterSchema>;
