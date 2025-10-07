import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { NextResponse } from 'next/server';

// Mock auth to allow TEACHER access
vi.mock('@/auth', () => ({
  auth: vi.fn().mockResolvedValue({ user: { id: 'u-teacher', role: 'TEACHER' } }),
}));

const teacherFindFirstMock = vi.fn();
const classSessionCountMock = vi.fn();
const classSessionFindManyMock = vi.fn();

vi.mock('@/lib/prisma', () => ({
  prisma: {
    teacher: { findFirst: (...args: any[]) => teacherFindFirstMock(...args) },
    classSession: {
      count: (...args: any[]) => classSessionCountMock(...args),
      findMany: (...args: any[]) => classSessionFindManyMock(...args),
    },
  },
}));

import * as route from '@/app/api/teachers/me/class-sessions/route';

describe('GET /api/teachers/me/class-sessions (classTypeIds filter)', () => {
  beforeEach(() => {
    teacherFindFirstMock.mockReset();
    classSessionCountMock.mockReset();
    classSessionFindManyMock.mockReset();
  });

  afterEach(() => vi.clearAllMocks());

  it('applies exact-match IN filter when classTypeIds is provided', async () => {
    teacherFindFirstMock.mockResolvedValue({ teacherId: 't1' });
    classSessionCountMock.mockResolvedValue(1);
    classSessionFindManyMock.mockResolvedValue([
      {
        classId: 'c1', seriesId: null, teacherId: 't1', studentId: 's1', subjectId: null, classTypeId: 'a',
        boothId: null, branchId: null, date: new Date('2025-01-01T00:00:00Z'),
        startTime: new Date('2025-01-01T09:00:00Z'), endTime: new Date('2025-01-01T10:00:00Z'),
        duration: 60, notes: null, createdAt: new Date(), updatedAt: new Date(),
        teacher: { name: 'Teacher' }, student: { name: 'Student', gradeYear: null, studentType: { name: null } }, subject: { name: null }, classType: { name: '通常授業' }, booth: { name: null }, branch: { name: null }, status: null,
      },
    ]);

    const url = 'http://localhost/api/teachers/me/class-sessions?startDate=2025-01-01&endDate=2025-01-07&classTypeIds=a,b';
    const req: any = { url, headers: new Headers() };
    const res = (await (route.GET as any)(req)) as NextResponse;
    const json: any = await (res as any).json();

    expect(json).toBeDefined();
    expect(json.data.length).toBe(1);
    const callArgs = classSessionFindManyMock.mock.calls[0]?.[0] || {};
    expect(callArgs.where.teacherId).toBe('t1');
    expect(callArgs.where.classTypeId).toEqual({ in: ['a','b'] });
  });
});

