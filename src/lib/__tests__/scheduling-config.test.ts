import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/prisma', () => {
  return {
    prisma: {
      schedulingConfig: { findFirst: vi.fn() },
      branchSchedulingConfig: { findUnique: vi.fn(), upsert: vi.fn() },
    },
  };
});

import { prisma } from '@/lib/prisma';
import {
  getEffectiveSchedulingConfig,
  toPolicyShape,
  upsertBranchPolicyFromSeriesPatch,
} from '@/lib/scheduling-config';

const m = (fn: any) => fn as any;

describe('scheduling-config', () => {
  beforeEach(() => {
    m(prisma.schedulingConfig.findFirst).mockReset?.();
    m(prisma.branchSchedulingConfig.findUnique).mockReset?.();
    m(prisma.branchSchedulingConfig.upsert).mockReset?.();
  });

  it('falls back to defaults when no rows exist', async () => {
    m(prisma.schedulingConfig.findFirst).mockResolvedValue(null);
    m(prisma.branchSchedulingConfig.findUnique).mockResolvedValue(null);

    const cfg = await getEffectiveSchedulingConfig(null);
    const policy = toPolicyShape(cfg);

    expect(policy.markAsConflicted.TEACHER_CONFLICT).toBe(true);
    expect(policy.markAsConflicted.STUDENT_CONFLICT).toBe(true);
    expect(policy.markAsConflicted.BOOTH_CONFLICT).toBe(true);
    expect(policy.markAsConflicted.TEACHER_UNAVAILABLE).toBe(false);
    expect(policy.markAsConflicted.STUDENT_UNAVAILABLE).toBe(false);
    expect(policy.allowOutsideAvailability.teacher).toBe(false);
    expect(policy.allowOutsideAvailability.student).toBe(false);
  });

  it('coalesces branch overrides over global', async () => {
    m(prisma.schedulingConfig.findFirst).mockResolvedValue({
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
    });
    m(prisma.branchSchedulingConfig.findUnique).mockResolvedValue({
      markTeacherUnavailable: true,
      allowOutsideAvailabilityTeacher: true,
    });

    const cfg = await getEffectiveSchedulingConfig('b1');
    const policy = toPolicyShape(cfg);
    expect(policy.markAsConflicted.TEACHER_UNAVAILABLE).toBe(true);
    expect(policy.allowOutsideAvailability.teacher).toBe(true);
    expect(policy.allowOutsideAvailability.student).toBe(false);
  });

  it('upserts branch overrides from series patch policy', async () => {
    m(prisma.branchSchedulingConfig.upsert).mockResolvedValue({});

    await upsertBranchPolicyFromSeriesPatch('b2', {
      markAsConflicted: { TEACHER_UNAVAILABLE: true, STUDENT_CONFLICT: false },
      allowOutsideAvailability: { teacher: true },
    });

    expect(prisma.branchSchedulingConfig.upsert).toHaveBeenCalledOnce();
    const args = m(prisma.branchSchedulingConfig.upsert).mock.calls[0][0];
    expect(args.where.branchId).toBe('b2');
    expect(args.update).toMatchObject({
      markTeacherUnavailable: true,
      markStudentConflict: false,
      allowOutsideAvailabilityTeacher: true,
    });
  });
});
