const globalForLocks = global as unknown as { __importLocks?: Map<string, number> };

function getLockMap() {
  if (!globalForLocks.__importLocks) {
    globalForLocks.__importLocks = new Map<string, number>();
  }
  return globalForLocks.__importLocks;
}

export function acquireUserImportLock(userId: string): boolean {
  const locks = getLockMap();
  if (locks.has(userId)) return false;
  locks.set(userId, Date.now());
  return true;
}

export function releaseUserImportLock(userId: string) {
  const locks = getLockMap();
  locks.delete(userId);
}

