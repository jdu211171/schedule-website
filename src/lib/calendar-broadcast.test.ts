import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { broadcastClassSessionsChanged } from './calendar-broadcast';

describe('broadcastClassSessionsChanged', () => {
  const originalBC = (globalThis as any).BroadcastChannel;
  const originalWindow = (globalThis as any).window;

  beforeEach(() => {
    // Ensure window exists to satisfy the function guard
    (globalThis as any).window = (globalThis as any).window || {};
    (globalThis as any).BroadcastChannel = vi.fn().mockImplementation((name: string) => {
      return {
        name,
        postMessage: vi.fn(),
        close: vi.fn(),
      };
    });
  });

  afterEach(() => {
    (globalThis as any).BroadcastChannel = originalBC;
    (globalThis as any).window = originalWindow;
    vi.restoreAllMocks();
  });

  it('sends payload with type and dates on the calendar-events channel', () => {
    broadcastClassSessionsChanged(['2025-10-07']);

    expect(globalThis.BroadcastChannel).toHaveBeenCalledWith('calendar-events');
    const instance = (globalThis.BroadcastChannel as any).mock.results[0].value;
    expect(instance.postMessage).toHaveBeenCalledWith({ type: 'classSessionsChanged', dates: ['2025-10-07'] });
    expect(instance.close).toHaveBeenCalled();
  });

  it('no-ops when BroadcastChannel is missing', () => {
    // Remove BroadcastChannel to simulate unsupported environment
    (globalThis as any).window = (globalThis as any).window || {};
    (globalThis as any).BroadcastChannel = undefined;
    expect(() => broadcastClassSessionsChanged(['2025-10-07'])).not.toThrow();
  });
});
