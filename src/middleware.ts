import { auth } from './auth';

export async function middleware() {
    return auth();
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};