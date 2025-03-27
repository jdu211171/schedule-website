import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

interface RateLimitClient {
    ip: string;
    timestamp: number;
    count: number;
}

// In-memory store for rate limiting (for production, use Redis or similar)
const rateLimitStore = new Map<string, RateLimitClient>();

/**
 * Clean up old rate limit entries (called periodically)
 */
function cleanupRateLimitStore() {
    const now = Date.now();

    for (const [key, client] of rateLimitStore.entries()) {
        if (now - client.timestamp > 60000) { // 1 minute
            rateLimitStore.delete(key);
        }
    }
}

// Clean up every 5 minutes
setInterval(cleanupRateLimitStore, 300000);

/**
 * Rate limiter middleware
 * @param request The Next.js request
 * @param limit Maximum number of requests allowed per minute
 * @returns Response if rate limit is exceeded, otherwise undefined
 */
export function rateLimiter(request: NextRequest, limit = 100): NextResponse | undefined {
    // Only apply to API routes
    if (!request.nextUrl.pathname.startsWith('/api')) {
        return;
    }

    // Get client IP
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const now = Date.now();

    // Get existing rate limit data for this client
    let client = rateLimitStore.get(ip);

    if (!client) {
        // First request from this client
        client = { ip, timestamp: now, count: 1 };
        rateLimitStore.set(ip, client);
        return;
    }

    // Reset count if more than a minute has passed
    if (now - client.timestamp > 60000) {
        client.count = 1;
        client.timestamp = now;
        return;
    }

    // Increment count
    client.count++;

    // Check if rate limit exceeded
    if (client.count > limit) {
        // Rate limit exceeded
        return new NextResponse(
            JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
            {
                status: 429,
                headers: {
                    'Content-Type': 'application/json',
                    'X-RateLimit-Limit': limit.toString(),
                    'X-RateLimit-Remaining': '0',
                    'X-RateLimit-Reset': Math.ceil((client.timestamp + 60000) / 1000).toString()
                }
            }
        );
    }

    // Update client data
    rateLimitStore.set(ip, client);

    // Add rate limit headers
    const response = NextResponse.next();
    response.headers.set('X-RateLimit-Limit', limit.toString());
    response.headers.set('X-RateLimit-Remaining', (limit - client.count).toString());
    response.headers.set('X-RateLimit-Reset', Math.ceil((client.timestamp + 60000) / 1000).toString());

    return response;
}
