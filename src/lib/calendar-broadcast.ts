// Lightweight intra-tab/cross-tab broadcast for calendar cache updates
// No-ops on server.

export type CalendarEvent = {
  type: 'classSessionsChanged';
  dates?: string[]; // YYYY-MM-DD list; empty/omitted means unspecified dates
};

const CHANNEL_NAME = 'calendar-events';

export function broadcastClassSessionsChanged(dates?: string[]) {
  if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') return;
  try {
    const channel = new BroadcastChannel(CHANNEL_NAME);
    const payload: CalendarEvent = { type: 'classSessionsChanged', dates };
    channel.postMessage(payload);
    channel.close();
  } catch {
    // ignore
  }
}

