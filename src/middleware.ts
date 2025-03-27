// src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { rateLimiter } from './lib/rate-limiter';
import { auth } from './auth';

/**
 * Middleware for API routes
 */
export async function middleware(request: NextRequest) {
    // Check if path is for an API route
    if (request.nextUrl.pathname.startsWith('/api')) {
        // Apply rate limiting
        const rateLimitResponse = rateLimiter(request);
        if (rateLimitResponse) {
            return rateLimitResponse;
        }

        // Add security headers
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

        // Log API requests
        console.log(`API Request: ${request.method} ${request.nextUrl.pathname}`);

        return response;
    }

    // Use the default auth middleware for non-API routes
    return auth();
}

// Configure the middleware
export const config = {
    // Apply middleware to all API routes and protect our API routes
    matcher: [
        '/api/:path*',
        '/((?!api|_next/static|_next/image|favicon.ico).*)',
    ],
};