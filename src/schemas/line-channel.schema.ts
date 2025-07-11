// src/schemas/line-channel.schema.ts
import { z } from "zod";

// Valid sort fields
export const LINE_CHANNEL_SORT_FIELDS = [
  "name",
  "isActive",
  "isDefault",
  "createdAt",
  "updatedAt",
] as const;
export type LineChannelSortField = (typeof LINE_CHANNEL_SORT_FIELDS)[number];

// Filters for querying LINE channels
export const lineChannelFilterSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
  name: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
  branchId: z.string().optional(),
  sortBy: z.enum(LINE_CHANNEL_SORT_FIELDS).default("name"),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
});

// For creating a new LINE channel
export const lineChannelCreateSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(255).optional().nullable(),
  channelAccessToken: z.string().min(1),
  channelSecret: z.string().min(1),
  isActive: z.boolean().default(true),
  branchIds: z.array(z.string()).optional(),
});

// For updating an existing LINE channel
export const lineChannelUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(255).optional().nullable(),
  channelAccessToken: z.string().min(1).optional(),
  channelSecret: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
  isDefault: z.boolean().optional(),
});

// For assigning branches to a LINE channel
export const lineChannelAssignBranchesSchema = z.object({
  branchIds: z.array(z.string()),
});

// For testing LINE channel credentials
export const lineChannelTestSchema = z.object({
  channelAccessToken: z.string().min(1),
  channelSecret: z.string().min(1),
});

// For setting a channel as primary for a branch
export const lineChannelSetPrimarySchema = z.object({
  branchId: z.string(),
  channelId: z.string(),
});

export type LineChannelFilter = z.infer<typeof lineChannelFilterSchema>;
export type LineChannelCreate = z.infer<typeof lineChannelCreateSchema>;
export type LineChannelUpdate = z.infer<typeof lineChannelUpdateSchema>;
export type LineChannelAssignBranches = z.infer<typeof lineChannelAssignBranchesSchema>;
export type LineChannelTest = z.infer<typeof lineChannelTestSchema>;
export type LineChannelSetPrimary = z.infer<typeof lineChannelSetPrimarySchema>;