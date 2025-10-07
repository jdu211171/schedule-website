import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { NextResponse } from 'next/server';

// Mock auth to allow ADMIN access
vi.mock('@/auth', () => ({
  auth: vi.fn().mockResolvedValue({ user: { id: 'u1', role: 'ADMIN' } }),
}));

// Capture prisma calls
const countMock = vi.fn();
const findManyMock = vi.fn();

vi.mock('@/lib/prisma', () => ({
  prisma: {
    classType: {
      count: (...args: any[]) => countMock(...args),
      findMany: (...args: any[]) => findManyMock(...args),
    },
  },
}));

// Import after mocks
import * as route from '@/app/api/class-types/route';

describe('GET /api/class-types (contract)', () => {
  beforeEach(() => {
    countMock.mockReset();
    findManyMock.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('returns ordered class types with pagination', async () => {
    countMock.mockResolvedValue(2);
    findManyMock.mockResolvedValue([
      { classTypeId: 'b', name: '特別授業', notes: null, parentId: null, order: 2, color: null, parent: null, children: [], createdAt: new Date(), updatedAt: new Date() },
      { classTypeId: 'a', name: '通常授業', notes: null, parentId: null, order: 1, color: null, parent: null, children: [], createdAt: new Date(), updatedAt: new Date() },
    ]);

    const url = 'http://localhost/api/class-types?page=1&limit=50';
    const req: any = { url, headers: new Headers() };
    const res = (await (route.GET as any)(req)) as NextResponse;
    const json: any = await (res as any).json();

    expect(json).toBeDefined();
    expect(json.pagination.total).toBe(2);
    expect(Array.isArray(json.data)).toBe(true);
    expect(json.data.length).toBe(2);
    // Ensure fields present
    expect(json.data[0]).toHaveProperty('classTypeId');
    expect(json.data[0]).toHaveProperty('name');
  });
});

