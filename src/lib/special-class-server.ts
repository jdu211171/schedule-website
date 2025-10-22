import type { ClassType } from "@prisma/client";
import { prisma } from "./prisma";
import {
  SPECIAL_CLASS_COLOR_HEX,
  SPECIAL_CLASS_ROOT_NAME,
} from "./special-class-constants";

const specialClassTypeCache = new Map<string, boolean>();

export async function isSpecialClassType(
  classTypeId?: string | null
): Promise<boolean> {
  if (!classTypeId) return false;
  if (specialClassTypeCache.has(classTypeId)) {
    return specialClassTypeCache.get(classTypeId)!;
  }

  const visited: string[] = [];

  try {
    let currentId: string | null | undefined = classTypeId;
    for (let i = 0; i < 10 && currentId; i++) {
      visited.push(currentId);

      if (specialClassTypeCache.has(currentId)) {
        const cached = specialClassTypeCache.get(currentId)!;
        visited.forEach((id) => specialClassTypeCache.set(id, cached));
        return cached;
      }

      const ct: ClassType | null = await prisma.classType.findUnique({
        where: { classTypeId: currentId },
      });

      if (!ct) {
        visited.forEach((id) => specialClassTypeCache.set(id, false));
        return false;
      }

      if (ct.name === SPECIAL_CLASS_ROOT_NAME) {
        visited.forEach((id) => specialClassTypeCache.set(id, true));
        return true;
      }

      currentId = ct.parentId;
    }
  } catch {
    visited.forEach((id) => specialClassTypeCache.set(id, false));
    return false;
  }

  visited.forEach((id) => specialClassTypeCache.set(id, false));
  return false;
}

export async function applySpecialClassColor<
  T extends { classTypeId: string | null },
>(
  rawSessions: T[],
  formattedSessions: Array<{ classTypeColor?: string | null }>
): Promise<void> {
  if (!rawSessions.length) return;

  const ids = Array.from(
    new Set(
      rawSessions
        .map((session) => session.classTypeId)
        .filter((id): id is string => typeof id === "string" && id.length > 0)
    )
  );

  if (!ids.length) return;

  const specialIds = new Set<string>();
  for (const id of ids) {
    if (await isSpecialClassType(id)) {
      specialIds.add(id);
    }
  }

  formattedSessions.forEach((formatted, index) => {
    const classTypeId = rawSessions[index]?.classTypeId;
    if (classTypeId && specialIds.has(classTypeId)) {
      formatted.classTypeColor = SPECIAL_CLASS_COLOR_HEX;
    }
  });
}
