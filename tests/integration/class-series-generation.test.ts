import { describe, it, expect } from 'vitest';
import { applySeriesOverride, getEffectiveSchedulingConfig } from '@/lib/scheduling-config';
import { advanceGenerateForSeries } from '@/lib/series-advance';
import { toZonedTime, formatInTimeZone } from 'date-fns-tz';

// Simple stub of PrismaClient methods used by advanceGenerateForSeries
function makeMockPrisma() {
  const series = {
    seriesId: 'S1',
    branchId: 'B1',
    teacherId: 'T1',
    studentId: 'ST1',
    subjectId: null as string | null,
    classTypeId: null as string | null,
    boothId: null as string | null,
    startDate: new Date(Date.UTC(2025, 8, 24, 0, 0, 0, 0)), // 2025-09-24
    endDate: new Date(Date.UTC(2025, 8, 30, 0, 0, 0, 0)),
    startTime: new Date(Date.UTC(2000, 0, 1, 10, 0, 0, 0)),
    endTime: new Date(Date.UTC(2000, 0, 1, 10, 50, 0, 0)),
    duration: 50,
    daysOfWeek: [3, 5], // Wed, Fri
    status: 'ACTIVE',
    lastGeneratedThrough: null as Date | null,
    notes: null as string | null,
    schedulingOverride: { generationMonths: 2 },
  } as any;

  const sessions: Array<{ date: Date; startTime: Date; endTime: Date; classId: string; seriesId: string }>
    = [];

  const prisma: any = {
    classSeries: {
      findUnique: async ({ where: { seriesId } }: any) => seriesId === series.seriesId ? series : null,
      update: async ({ data }: any) => { series.lastGeneratedThrough = data.lastGeneratedThrough; return series; },
      delete: async () => { return {}; },
    },
    classSession: {
      findMany: async ({ where: { date } }: any) => sessions.filter(s => date.in.some((d: Date) => d.getTime() === s.date.getTime())),
      findFirst: async ({ where: { seriesId, date, startTime, endTime } }: any) =>
        sessions.find(s => s.seriesId === seriesId && s.date.getTime() === date.getTime() && s.startTime.getUTCHours() === startTime.getUTCHours() && s.startTime.getUTCMinutes() === startTime.getUTCMinutes() && s.endTime.getUTCHours() === endTime.getUTCHours() && s.endTime.getUTCMinutes() === endTime.getUTCMinutes()) || null,
      create: async ({ data }: any) => { const classId = `C${sessions.length+1}`; sessions.push({ classId, seriesId: data.seriesId, date: data.date, startTime: data.startTime, endTime: data.endTime }); return { classId }; },
    },
    vacation: { findMany: async () => [] },
    classType: { findUnique: async () => null },
    $queryRaw: async () => [{ pg_try_advisory_lock: true }],
  };
  return { prisma, series, sessions };
}

describe('config precedence and idempotency (integration-ish)', () => {
  it('applies per-series override over branch/global for generationMonths', async () => {
    const global = await getEffectiveSchedulingConfig(null);
    const withBranch = { ...global, generationMonths: 3 }; // pretend branch override
    const wSeries = applySeriesOverride(withBranch, { generationMonths: 2 });
    expect(wSeries.generationMonths).toBe(2);
  });

  it('advanceGenerateForSeries is idempotent when re-run', async () => {
    const { prisma, sessions } = makeMockPrisma();
    const res1 = await advanceGenerateForSeries(prisma as any, 'S1', { leadDays: 10 });
    expect(res1.attempted).toBeGreaterThan(0);
    const countAfterFirst = sessions.length;
    expect(countAfterFirst).toBe(res1.createdConfirmed + res1.createdConflicted);

    const res2 = await advanceGenerateForSeries(prisma as any, 'S1', { leadDays: 10 });
    expect(sessions.length).toBe(countAfterFirst); // no new sessions
    expect(res2.createdConfirmed + res2.createdConflicted).toBe(0);
  });
  
  it('generates DST-correct times when timezone is set (America/New_York)', async () => {
    // DST ends Nov 2, 2025 in New York; 10:00 local should remain 10:00 local across boundary
    const series = {
      seriesId: 'S_TZ',
      branchId: 'B1',
      teacherId: null,
      studentId: null,
      subjectId: null,
      classTypeId: null,
      boothId: null,
      startDate: new Date(Date.UTC(2025, 9, 31, 0, 0, 0, 0)), // 2025-10-31
      endDate: new Date(Date.UTC(2025, 10, 5, 0, 0, 0, 0)),   // 2025-11-05
      startTime: new Date(Date.UTC(2000,0,1,10,0,0,0)),
      endTime: new Date(Date.UTC(2000,0,1,10,50,0,0)),
      duration: 50,
      daysOfWeek: [0,3,5], // include Sun, Wed, Fri
      status: 'ACTIVE',
      lastGeneratedThrough: null as Date | null,
      notes: null as string | null,
      timezone: 'America/New_York',
    } as any;

    const sessions: any[] = [];
    const datesIn = (start: Date, end: Date) => {
      const arr: Date[] = [];
      for (let d = new Date(start); d <= end; d = new Date(d.getTime() + 86400000)) arr.push(new Date(d));
      return arr;
    };

    const prisma: any = {
      classSeries: { findUnique: async () => series, update: async ({ data }: any) => { series.lastGeneratedThrough = data.lastGeneratedThrough; }, delete: async () => {} },
      classSession: {
        findMany: async ({ where: { date } }: any) => sessions.filter(s => date.in.some((d: Date) => d.getTime() === s.date.getTime())),
        findFirst: async () => null,
        create: async ({ data }: any) => { sessions.push(data); return { classId: `X${sessions.length}` }; },
      },
      vacation: { findMany: async () => [] },
      classType: { findUnique: async () => null },
      $queryRaw: async () => [{ pg_try_advisory_lock: true }],
    };

    await advanceGenerateForSeries(prisma as any, 'S_TZ', { leadDays: 60 });
    // pick two dates across DST end: Nov 2 and Nov 5
    const sampleDates = sessions.filter(s => {
      const y = s.date.getUTCFullYear(); const m = s.date.getUTCMonth()+1; const d = s.date.getUTCDate();
      return (y===2025 && m===11 && (d===2 || d===5));
    });
    expect(sampleDates.length).toBeGreaterThan(0);
    for (const s of sampleDates) {
      const hhmm = formatInTimeZone(s.startTime, 'America/New_York', 'HH:mm');
      expect(hhmm).toBe('10:00');
    }
  });

  it('deletes blueprint once endDate boundary is reached, sessions remain', async () => {
    let deleted = false;
    const series = {
      seriesId: 'S_END',
      branchId: 'B1',
      teacherId: null,
      studentId: null,
      subjectId: null,
      classTypeId: null,
      boothId: null,
      startDate: new Date(Date.UTC(2025, 8, 24, 0, 0, 0, 0)),
      endDate: new Date(Date.UTC(2025, 8, 24, 0, 0, 0, 0)),
      startTime: new Date(Date.UTC(2000,0,1,10,0,0,0)),
      endTime: new Date(Date.UTC(2000,0,1,10,50,0,0)),
      duration: 50,
      daysOfWeek: [3],
      status: 'ACTIVE',
      lastGeneratedThrough: null as Date | null,
      notes: null as string | null,
    } as any;
    const sessions: any[] = [];
    const prisma: any = {
      classSeries: {
        findUnique: async () => series,
        update: async () => series,
        delete: async () => { deleted = true; },
      },
      classSession: {
        findMany: async () => [],
        findFirst: async () => null,
        create: async ({ data }: any) => { sessions.push(data); return { classId: 'Y1' }; },
      },
      vacation: { findMany: async () => [] },
      classType: { findUnique: async () => null },
      $queryRaw: async () => [{ pg_try_advisory_lock: true }],
    };
    const res = await advanceGenerateForSeries(prisma as any, 'S_END', { leadDays: 2 });
    expect(deleted).toBe(true);
    expect(sessions.length).toBe(1);
    expect(res.createdConfirmed + res.createdConflicted).toBe(1);
  });

  it('resumes after interruption by safely re-running', async () => {
    const series = {
      seriesId: 'S_RESUME',
      branchId: 'B1',
      teacherId: null,
      studentId: null,
      subjectId: null,
      classTypeId: null,
      boothId: null,
      startDate: new Date(Date.UTC(2025, 8, 24, 0, 0, 0, 0)),
      endDate: new Date(Date.UTC(2025, 8, 28, 0, 0, 0, 0)),
      startTime: new Date(Date.UTC(2000,0,1,10,0,0,0)),
      endTime: new Date(Date.UTC(2000,0,1,10,50,0,0)),
      duration: 50,
      daysOfWeek: [2,3,4,5,6],
      status: 'ACTIVE',
      lastGeneratedThrough: null as Date | null,
      notes: null as string | null,
    } as any;

    const sessions: any[] = [];
    let failPrefetchOnce = true;
    const prisma: any = {
      classSeries: { findUnique: async () => series, update: async ({ data }: any) => { series.lastGeneratedThrough = data.lastGeneratedThrough; } },
      classSession: {
        findMany: async ({ where: { date } }: any) => { if (failPrefetchOnce) { failPrefetchOnce = false; throw new Error('prefetch failed'); } return sessions.filter(s => date.in.some((d: Date) => d.getTime() === s.date.getTime())); },
        findFirst: async ({ where: { date, startTime, endTime } }: any) => sessions.find(s => s.date.getTime()===date.getTime() && s.startTime.getUTCHours()===startTime.getUTCHours() && s.startTime.getUTCMinutes()===startTime.getUTCMinutes() && s.endTime.getUTCHours()===endTime.getUTCHours() && s.endTime.getUTCMinutes()===endTime.getUTCMinutes()) || null,
        create: async ({ data }: any) => { sessions.push(data); return { classId: `R${sessions.length}` }; },
      },
      vacation: { findMany: async () => [] },
      classType: { findUnique: async () => null },
      $queryRaw: async () => [{ pg_try_advisory_lock: true }],
    };

    try { await advanceGenerateForSeries(prisma as any, 'S_RESUME', { leadDays: 5 }); } catch {}
    const firstCount = sessions.length;
    await advanceGenerateForSeries(prisma as any, 'S_RESUME', { leadDays: 5 });
    // After re-run, all candidate days should exist (idempotency fills gaps)
    expect(sessions.length).toBeGreaterThan(firstCount);
  });

  it('does nothing when advisory lock is not acquired (concurrency guard)', async () => {
    const series = {
      seriesId: 'S_LOCK',
      branchId: 'B1',
      teacherId: null,
      studentId: null,
      subjectId: null,
      classTypeId: null,
      boothId: null,
      startDate: new Date(Date.UTC(2025, 8, 24, 0, 0, 0, 0)),
      endDate: new Date(Date.UTC(2025, 8, 30, 0, 0, 0, 0)),
      startTime: new Date(Date.UTC(2000,0,1,10,0,0,0)),
      endTime: new Date(Date.UTC(2000,0,1,10,50,0,0)),
      duration: 50,
      daysOfWeek: [3,5],
      status: 'ACTIVE',
      lastGeneratedThrough: null as Date | null,
      notes: null as string | null,
    } as any;
    const prisma: any = {
      classSeries: { findUnique: async () => series },
      classSession: { findMany: async () => [], findFirst: async () => null, create: async () => ({ classId: 'Z1' }) },
      vacation: { findMany: async () => [] },
      classType: { findUnique: async () => null },
      $queryRaw: async () => [{ pg_try_advisory_lock: false }],
    };
    const res = await advanceGenerateForSeries(prisma as any, 'S_LOCK', { leadDays: 10 });
    expect(res.attempted).toBe(0);
    expect(res.createdConfirmed + res.createdConflicted + res.skipped).toBe(0);
  });
});
