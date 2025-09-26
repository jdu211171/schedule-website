import { prisma } from "@/lib/prisma";
import { DEFAULT_MARK_AS_CONFLICTED } from "@/lib/conflict-types";

export type EffectiveSchedulingConfig = {
  markTeacherConflict: boolean;
  markStudentConflict: boolean;
  markBoothConflict: boolean;
  markTeacherUnavailable: boolean;
  markStudentUnavailable: boolean;
  markTeacherWrongTime: boolean;
  markStudentWrongTime: boolean;
  markNoSharedAvailability: boolean;
  allowOutsideAvailabilityTeacher: boolean;
  allowOutsideAvailabilityStudent: boolean;
  generationMonths: number;
};

const DEFAULTS: EffectiveSchedulingConfig = {
  markTeacherConflict: true,
  markStudentConflict: true,
  markBoothConflict: true,
  markTeacherUnavailable: false,
  markStudentUnavailable: false,
  markTeacherWrongTime: false,
  markStudentWrongTime: false,
  markNoSharedAvailability: false,
  allowOutsideAvailabilityTeacher: false,
  allowOutsideAvailabilityStudent: false,
  generationMonths: 1,
};

export type ConflictPolicyShape = {
  markAsConflicted: Record<keyof typeof DEFAULT_MARK_AS_CONFLICTED, boolean>;
  allowOutsideAvailability: { teacher: boolean; student: boolean };
};

/**
 * Compute the effective scheduling configuration, coalescing
 * branch overrides with global defaults.
 */
export async function getEffectiveSchedulingConfig(
  branchId?: string | null
): Promise<EffectiveSchedulingConfig> {
  const global = await prisma.schedulingConfig.findFirst().catch(() => null);
  const base: EffectiveSchedulingConfig = global
    ? {
        markTeacherConflict: global.markTeacherConflict,
        markStudentConflict: global.markStudentConflict,
        markBoothConflict: global.markBoothConflict,
        markTeacherUnavailable: global.markTeacherUnavailable,
        markStudentUnavailable: global.markStudentUnavailable,
        markTeacherWrongTime: global.markTeacherWrongTime,
        markStudentWrongTime: global.markStudentWrongTime,
        markNoSharedAvailability: global.markNoSharedAvailability,
        allowOutsideAvailabilityTeacher: global.allowOutsideAvailabilityTeacher,
        allowOutsideAvailabilityStudent: global.allowOutsideAvailabilityStudent,
        generationMonths: Math.max(1, Number((global as any).generationMonths ?? 1)),
      }
    : { ...DEFAULTS };

  if (!branchId) return base;

  const override = await prisma.branchSchedulingConfig
    .findUnique({ where: { branchId } })
    .catch(() => null);
  if (!override) return base;

  return {
    markTeacherConflict:
      override.markTeacherConflict ?? base.markTeacherConflict,
    markStudentConflict:
      override.markStudentConflict ?? base.markStudentConflict,
    markBoothConflict: override.markBoothConflict ?? base.markBoothConflict,
    markTeacherUnavailable:
      override.markTeacherUnavailable ?? base.markTeacherUnavailable,
    markStudentUnavailable:
      override.markStudentUnavailable ?? base.markStudentUnavailable,
    markTeacherWrongTime:
      override.markTeacherWrongTime ?? base.markTeacherWrongTime,
    markStudentWrongTime:
      override.markStudentWrongTime ?? base.markStudentWrongTime,
    markNoSharedAvailability:
      override.markNoSharedAvailability ?? base.markNoSharedAvailability,
    allowOutsideAvailabilityTeacher:
      override.allowOutsideAvailabilityTeacher ??
      base.allowOutsideAvailabilityTeacher,
    allowOutsideAvailabilityStudent:
      override.allowOutsideAvailabilityStudent ??
      base.allowOutsideAvailabilityStudent,
    generationMonths:
      (override.generationMonths ?? base.generationMonths) as number,
  };
}

/**
 * Apply a per-series JSON override on top of an existing effective config.
 * Only properties present in the override are applied.
 */
export function applySeriesOverride(
  base: EffectiveSchedulingConfig,
  override: Partial<EffectiveSchedulingConfig> | null | undefined
): EffectiveSchedulingConfig {
  if (!override || typeof override !== 'object') return base;
  return {
    markTeacherConflict: override.markTeacherConflict ?? base.markTeacherConflict,
    markStudentConflict: override.markStudentConflict ?? base.markStudentConflict,
    markBoothConflict: override.markBoothConflict ?? base.markBoothConflict,
    markTeacherUnavailable:
      override.markTeacherUnavailable ?? base.markTeacherUnavailable,
    markStudentUnavailable:
      override.markStudentUnavailable ?? base.markStudentUnavailable,
    markTeacherWrongTime:
      override.markTeacherWrongTime ?? base.markTeacherWrongTime,
    markStudentWrongTime:
      override.markStudentWrongTime ?? base.markStudentWrongTime,
    markNoSharedAvailability:
      override.markNoSharedAvailability ?? base.markNoSharedAvailability,
    allowOutsideAvailabilityTeacher:
      override.allowOutsideAvailabilityTeacher ?? base.allowOutsideAvailabilityTeacher,
    allowOutsideAvailabilityStudent:
      override.allowOutsideAvailabilityStudent ?? base.allowOutsideAvailabilityStudent,
    generationMonths: Math.max(
      1,
      Number(override.generationMonths ?? base.generationMonths)
    ),
  };
}

/**
 * Convert effective config into the existing `conflictPolicy` response shape
 * expected by the frontend.
 */
export function toPolicyShape(cfg: EffectiveSchedulingConfig): ConflictPolicyShape {
  return {
    markAsConflicted: {
      TEACHER_CONFLICT: cfg.markTeacherConflict,
      STUDENT_CONFLICT: cfg.markStudentConflict,
      BOOTH_CONFLICT: cfg.markBoothConflict,
      TEACHER_UNAVAILABLE: cfg.markTeacherUnavailable,
      STUDENT_UNAVAILABLE: cfg.markStudentUnavailable,
      TEACHER_WRONG_TIME: cfg.markTeacherWrongTime,
      STUDENT_WRONG_TIME: cfg.markStudentWrongTime,
      NO_SHARED_AVAILABILITY: cfg.markNoSharedAvailability,
    },
    allowOutsideAvailability: {
      teacher: cfg.allowOutsideAvailabilityTeacher,
      student: cfg.allowOutsideAvailabilityStudent,
    },
  } as ConflictPolicyShape;
}

/** Accepts a partial policy (as sent by the UI) and persists it as per-branch overrides. */
export async function upsertBranchPolicyFromSeriesPatch(
  branchId: string,
  policy: Partial<{
    markAsConflicted: Partial<Record<keyof typeof DEFAULT_MARK_AS_CONFLICTED, boolean>>;
    allowOutsideAvailability: Partial<{ teacher: boolean; student: boolean }>;
  }>
): Promise<void> {
  const data: any = {};
  if (policy.markAsConflicted) {
    const m = policy.markAsConflicted;
    if (m.TEACHER_CONFLICT !== undefined) data.markTeacherConflict = m.TEACHER_CONFLICT;
    if (m.STUDENT_CONFLICT !== undefined) data.markStudentConflict = m.STUDENT_CONFLICT;
    if (m.BOOTH_CONFLICT !== undefined) data.markBoothConflict = m.BOOTH_CONFLICT;
    if (m.TEACHER_UNAVAILABLE !== undefined)
      data.markTeacherUnavailable = m.TEACHER_UNAVAILABLE;
    if (m.STUDENT_UNAVAILABLE !== undefined)
      data.markStudentUnavailable = m.STUDENT_UNAVAILABLE;
    if (m.TEACHER_WRONG_TIME !== undefined)
      data.markTeacherWrongTime = m.TEACHER_WRONG_TIME;
    if (m.STUDENT_WRONG_TIME !== undefined)
      data.markStudentWrongTime = m.STUDENT_WRONG_TIME;
    if (m.NO_SHARED_AVAILABILITY !== undefined)
      data.markNoSharedAvailability = m.NO_SHARED_AVAILABILITY;
  }
  if (policy.allowOutsideAvailability) {
    const a = policy.allowOutsideAvailability;
    if (a.teacher !== undefined)
      data.allowOutsideAvailabilityTeacher = a.teacher;
    if (a.student !== undefined)
      data.allowOutsideAvailabilityStudent = a.student;
  }

  // No-ops: do nothing if empty object
  if (Object.keys(data).length === 0) return;

  await prisma.branchSchedulingConfig.upsert({
    where: { branchId },
    update: data,
    create: { branchId, ...data },
  });
}
