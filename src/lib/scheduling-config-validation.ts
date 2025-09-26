import { prisma } from '@/lib/prisma';

export type ValidationWarning = {
  code: string;
  message: string;
};

export type EffectiveCfg = {
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

export function validateEffectiveConfig(cfg: EffectiveCfg): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];

  if (!Number.isFinite(cfg.generationMonths) || cfg.generationMonths < 1) {
    warnings.push({ code: 'GEN_MONTHS_MIN', message: `generationMonths must be >= 1 (got ${cfg.generationMonths})` });
  }
  if (cfg.generationMonths > 12) {
    warnings.push({ code: 'GEN_MONTHS_MAX', message: `generationMonths is large (${cfg.generationMonths}); consider <= 12` });
  }
  const tri = [cfg.markTeacherConflict, cfg.markStudentConflict, cfg.markBoothConflict];
  if (!tri.some(Boolean)) {
    warnings.push({ code: 'ALL_CONFLICT_FLAGS_OFF', message: 'All conflict flags are disabled; conflicts will never be marked.' });
  }
  return warnings;
}

export async function maybeReportSchedulingWarnings(
  ctx: { branchId?: string | null; seriesId?: string | null },
  warnings: ValidationWarning[]
): Promise<void> {
  if (!warnings.length) return;
  const recipientType = 'SYSTEM';
  const recipientId = process.env.ADMIN_NOTIFY_RECIPIENT || 'ADMIN';
  const notificationType = 'SCHEDULING_CONFIG_WARNING';
  const today = new Date(); today.setUTCHours(0,0,0,0);
  const msgPrefix = ctx.seriesId ? `[series=${ctx.seriesId}]` : `[branch=${ctx.branchId ?? 'GLOBAL'}]`;
  const message = `${msgPrefix} ${warnings.map(w => `${w.code}:${w.message}`).join('; ')}`.slice(0, 1800);
  try {
    await prisma.notification.create({
      data: {
        recipientType,
        recipientId,
        notificationType,
        message,
        branchId: ctx.branchId ?? null,
        targetDate: today,
        status: 'PENDING' as any,
      },
    });
  } catch (e) {
    // best-effort; avoid throwing in hot path
    console.warn('scheduling-config warning could not be recorded:', (e as Error)?.message);
  }
}

