/* @vitest-environment jsdom */
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';
import { DayCalendar } from '@/components/admin-schedule/DayCalendar/day-calendar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mkTimeSlots = () => [
  { index: 0, start: '08:00', end: '08:30', display: '', shortDisplay: '' },
  { index: 1, start: '08:30', end: '09:00', display: '', shortDisplay: '' },
  { index: 2, start: '09:00', end: '09:30', display: '', shortDisplay: '' },
  { index: 3, start: '09:30', end: '10:00', display: '', shortDisplay: '' },
];

describe('DayCalendar overlap predicates ignore cancelled sessions', () => {
  if (typeof (globalThis as any).ResizeObserver === 'undefined') {
    (globalThis as any).ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as any;
  }
  it('teacher overlap is ignored when the neighbor is cancelled', async () => {
    const date = new Date('2025-01-02T00:00:00Z');
    const booths = [{ boothId: 'B1', name: 'Booth 1' }, { boothId: 'B2', name: 'Booth 2' }];
    const timeSlots = mkTimeSlots();
    const sessions: any[] = [
      // Active session in B1, teacher T1
      { classId: 'A1', date: '2025-01-02', startTime: '09:00', endTime: '09:30', boothId: 'B1', teacherId: 'T1', studentId: 'S1', isCancelled: false },
      // Cancelled neighbor in B2 with the same teacher T1 (overlap window)
      { classId: 'C1', date: '2025-01-02', startTime: '09:00', endTime: '09:30', boothId: 'B2', teacherId: 'T1', studentId: 'S2', isCancelled: true },
    ];

    const qc = new QueryClient();
    const { container } = render(
      <QueryClientProvider client={qc}>
        <DayCalendar
          date={date}
          booths={booths as any}
          timeSlots={timeSlots}
          classSessions={sessions as any}
          onLessonClick={() => {}}
          onCreateLesson={() => {}}
          noContainer
          hideHeader
          isFetching={false}
          preserveScrollOnFetch={false}
        />
      </QueryClientProvider>
    );

    const cards = Array.from(container.querySelectorAll('[data-conflict]'));
    expect(cards.length).toBe(2);
    // No conflict should be shown due to cancelled neighbor, even with same teacher
    expect(cards.every((el) => el.getAttribute('data-conflict') === 'false')).toBe(true);
  });
});
