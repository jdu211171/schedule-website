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

  const anyPrisma = prisma as unknown as PrismaClient & Record<string, any>;
  const delegate = anyPrisma.userClassTypeVisibilityPreference as { upsert?: Function } | undefined;
  if (delegate?.upsert) {
    await (delegate as any).upsert({
      where: { userId },
      create: { userId, hiddenClassTypeIds: pruned },
      update: { hiddenClassTypeIds: pruned },
    });
  } else {
    // Fallback: raw SQL upsert in case the generated delegate isn't available in this runtime
    await anyPrisma.$executeRawUnsafe(
      `INSERT INTO public.user_class_type_visibility_preferences (user_id, hidden_class_type_ids)
       VALUES ($1, $2::text[])
       ON CONFLICT (user_id) DO UPDATE SET hidden_class_type_ids = EXCLUDED.hidden_class_type_ids, updated_at = CURRENT_TIMESTAMP`,
      userId,
      pruned
    );
  }
  return pruned;
}
