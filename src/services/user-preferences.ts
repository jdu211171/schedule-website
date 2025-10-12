// src/services/user-preferences.ts
import { prisma } from "@/lib/prisma";
import type { PrismaClient } from "@prisma/client";

export async function getUserHiddenClassTypeIds(userId: string): Promise<string[]> {
  const pref = await prisma.userClassTypeVisibilityPreference.findUnique({
    where: { userId },
    select: { hiddenClassTypeIds: true },
  });
  return pref?.hiddenClassTypeIds ?? [];
}

export async function setUserHiddenClassTypeIds(userId: string, ids: string[]): Promise<string[]> {
  const uniqueIds = Array.from(new Set(ids.filter(Boolean)));

  // Validate against existing class types; prune unknown IDs
  const existing = await prisma.classType.findMany({
    where: { classTypeId: { in: uniqueIds } },
    select: { classTypeId: true },
  });
  const validIds = new Set(existing.map((e) => e.classTypeId));
  const pruned = uniqueIds.filter((id) => validIds.has(id));

  await prisma.userClassTypeVisibilityPreference.upsert({
    where: { userId },
    create: { userId, hiddenClassTypeIds: pruned },
    update: { hiddenClassTypeIds: pruned },
  });
  return pruned;
}
