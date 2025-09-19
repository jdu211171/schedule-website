import { describe, it, expect } from 'vitest';
import { classSeriesUpdateSchema } from './src/schemas/class-series.schema';

describe('classSeriesUpdateSchema', () => {
  it('accepts a minimal valid payload', () => {
    const result = classSeriesUpdateSchema.safeParse({
      teacherId: 't1',
      startDate: '2025-01-01',
      endDate: '2025-03-31',
      startTime: '16:00',
      endTime: '17:30',
      daysOfWeek: [1,3,5],
      notes: 'ok',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid time format', () => {
    const result = classSeriesUpdateSchema.safeParse({ startTime: '1600' });
    expect(result.success).toBe(false);
  });
});

