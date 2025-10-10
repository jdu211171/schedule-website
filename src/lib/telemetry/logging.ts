import { createHash, randomUUID } from 'crypto';

export const newFlowId = (): string => `flow_${randomUUID()}`;
export const newRunId = (): string => `run_${randomUUID()}`;

export const hashRecipientId = (id: string | null | undefined): string => {
  if (!id) return 'anon';
  const h = createHash('sha256').update(id).digest('hex');
  return `u_${h.slice(0, 16)}`;
};

type LogPayload = Record<string, unknown>;

export const logEvent = (type: string, payload: LogPayload): void => {
  try {
    const entry = {
      type,
      ts: new Date().toISOString(),
      ...payload,
    };
    // Structured JSON line for easy ingestion
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(entry));
  } catch (e) {
    // eslint-disable-next-line no-console
    console.log(`[logEvent-fallback] ${type}`, payload);
  }
};

export default {
  newFlowId,
  newRunId,
  hashRecipientId,
  logEvent,
};

export const consoleDev = {
  log: (...args: unknown[]) => {
    if (process.env.NODE_ENV !== 'production') console.log(...args as []);
  },
  warn: (...args: unknown[]) => {
    if (process.env.NODE_ENV !== 'production') console.warn(...args as []);
  },
  error: (...args: unknown[]) => {
    // Always print errors
    console.error(...args as []);
  },
};
