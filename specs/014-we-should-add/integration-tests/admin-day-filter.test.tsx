// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, waitFor } from '@testing-library/react';

vi.mock('next-auth/react', () => ({ useSession: () => ({ data: { user: { role: 'ADMIN' } } }) }));
vi.mock('@/lib/class-type-options', () => ({ fetchClassTypeOptions: vi.fn().mockResolvedValue([]) }));

import { setClassTypeSelection } from '@/lib/class-type-filter-persistence';
import { DayCalendarFilters } from '@/components/admin-schedule/DayCalendar/day-calendar-filters';

describe('Admin DayCalendarFilters integration', () => {
  it('initializes classTypeIds from persistence and calls onFiltersChange', async () => {
    setClassTypeSelection('ADMIN', ['ct-regular']);
    const onFiltersChange = vi.fn();

    render(
      <DayCalendarFilters
        filters={{}}
        onFiltersChange={onFiltersChange}
        dateKey={'2025-01-01'}
      />
    );

    await waitFor(() => {
      expect(onFiltersChange).toHaveBeenCalled();
    });
    const last = onFiltersChange.mock.calls.pop()?.[0] ?? {};
    expect(last.classTypeIds).toEqual(['ct-regular']);
  });
});

