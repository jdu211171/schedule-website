type Bucket = {
  tokens: number;
  last: number; // epoch ms
  capacity: number;
  refillPerSec: number;
};

const globalForBuckets = global as unknown as {
  __rateBuckets?: Map<string, Bucket>;
};

function getMap() {
  if (!globalForBuckets.__rateBuckets) {
    globalForBuckets.__rateBuckets = new Map<string, Bucket>();
  }
  return globalForBuckets.__rateBuckets;
}

export function allowRate(
  key: string,
  capacity = 2,
  refillPerSec = 0.1
): boolean {
  // Default: capacity 2, refill 0.1 tokens/sec (~1 every 10s)
  const now = Date.now();
  const map = getMap();
  let b = map.get(key);
  if (!b) {
    b = { tokens: capacity, last: now, capacity, refillPerSec };
    map.set(key, b);
  }
  // Refill
  const elapsedSec = (now - b.last) / 1000;
  b.tokens = Math.min(b.capacity, b.tokens + elapsedSec * b.refillPerSec);
  b.last = now;
  if (b.tokens >= 1) {
    b.tokens -= 1;
    return true;
  }
  return false;
}
