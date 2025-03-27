import type { NextAuthConfig } from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { prisma } from "./lib/prisma";
import bcrypt from "bcrypt-edge"

const protectedRoutes = [
    "/dashboard",
]

// Notice this is only an object, not a full Auth.js instance
export default {
    session: {
        strategy: "jwt",
    },
    providers: [
        Credentials({
            credentials: {
                email: { placeholder: "Email", name: "email", type: "email" },
                password: { placeholder: "Password", name: "password", type: "password" },
            },
            authorize: async (credentials) => {
                if (!credentials?.email || !credentials?.password) {
                    throw new Error("Missing email or password");
                }

                const user = await prisma.user.findFirst({
                    where: { email: credentials.email as string },
                })

                if (!user) {
                    throw new Error("Invalid credentials.")
                }

                const isValid = bcrypt.compareSync(credentials.password as string, user.password_hash as string);
                if (!isValid) {
                    throw new Error("Invalid credentials.")
                }

                return {
                    email: user.email,
                    id: user.id,
                    image: user.image,
                    name: user.name,
                }
            },
        }),
    ],
    callbacks: {
        authorized: ({ request, auth }) => {
            const { nextUrl } = request;

            const isLoggedIn = !!auth?.user;
            const isProtectedRoute = protectedRoutes.includes(nextUrl.pathname);
            const isAuthRoute = nextUrl.pathname.startsWith("/auth")

            if (isProtectedRoute && !isLoggedIn) {
                return Response.redirect(nextUrl.origin + "/login")
            }

            if (isAuthRoute && isLoggedIn) {
                return Response.redirect(nextUrl.origin + "/dashboard")
            }

            return true;
        },
        jwt({ token, user }) {
            if (user) {
                token.id = Number(user.id);
                token.image = user.image;
            }
            return token;
        },
        session({ session, token }) {
            if (session?.user) {
                session.user.id = String(token.id);
                session.user.image = token.image as string;
            }
            return session;
        },
    },
    pages: {
        signIn: "/auth/login",
    },
} satisfies NextAuthConfig