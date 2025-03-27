import {NextResponse} from 'next/server';
import type {NextRequest} from 'next/server';

/**
 * API middleware for logging, error handling, and security
 */
export function apiMiddleware(request: NextRequest) {
    if (!request.nextUrl.pathname.startsWith('/api')) {
        return;
    }

    console.log(`API Request: ${request.method} ${request.nextUrl.pathname}`);

    const response = NextResponse.next();

    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-XSS-Protection', '1; mode=block');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

    // Enable CORS for API routes
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // Handle OPTIONS requests for CORS preflight
    if (request.method === 'OPTIONS') {
        return new NextResponse(null, {
            status: 200,
            headers: response.headers
        });
    }

    return response;
}

// Apply middleware to all routes
export const config = {
    matcher: '/((?!_next/static|_next/image|favicon.ico).*)',
};