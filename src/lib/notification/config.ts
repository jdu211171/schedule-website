export type NotificationConfig = {
  batchSize: number;
  maxConcurrency: number;
  maxExecutionTimeMs: number;
  delayBetweenBatchesMs: number;
  groupMaxRecipients: number;
  requestTimeoutMs: number;
  circuitEnabled: boolean;
  circuitCooldownMs: number;
  circuitOpenThreshold: number;
};

const num = (val: string | undefined, fallback: number): number => {
  const n = Number(val);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

const bool = (val: string | undefined, fallback: boolean): boolean => {
  if (val === undefined) return fallback;
  const v = val.toLowerCase();
  return v === '1' || v === 'true' || v === 'yes' || v === 'on';
};

export const getNotificationConfig = (): NotificationConfig => ({
  batchSize: num(process.env.NOTIFICATION_WORKER_BATCH_SIZE, 20),
  maxConcurrency: num(process.env.NOTIFICATION_WORKER_CONCURRENCY, 3),
  maxExecutionTimeMs: num(process.env.NOTIFICATION_WORKER_MAX_TIME, 300000),
  delayBetweenBatchesMs: num(process.env.NOTIFICATION_WORKER_DELAY, 1000),
  groupMaxRecipients: num(process.env.NOTIFICATION_GROUP_MAX_RECIPIENTS, 200),
  requestTimeoutMs: num(process.env.NOTIFICATION_REQUEST_TIMEOUT_MS, 5000),
  circuitEnabled: bool(process.env.NOTIFICATION_CIRCUIT_ENABLED, false),
  circuitCooldownMs: num(process.env.NOTIFICATION_CIRCUIT_COOLDOWN_MS, 60000),
  circuitOpenThreshold: num(process.env.NOTIFICATION_CIRCUIT_THRESHOLD, 3),
});

export const buildQueueIdempotencyKey = (p: {
  recipientId: string;
  recipientType: string;
  notificationType: string;
  targetDate: Date | string | null | undefined;
  branchId?: string | null;
}): string => {
  const date = p.targetDate ? new Date(p.targetDate).toISOString().slice(0, 10) : 'null';
  const branch = p.branchId ?? 'null';
  return [p.recipientId, p.recipientType, p.notificationType, date, branch].join('|');
};

export const buildGroupId = (p: { channelId: string; message: string }): string => {
  const crypto = require('crypto');
  const text = `${p.channelId}|${p.message}`;
  const hash = crypto.createHash('sha256').update(text).digest('hex');
  return `g:${p.channelId}:${hash}`;
};

export default getNotificationConfig;
