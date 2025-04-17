import type { NextAuthConfig } from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { prisma } from "./lib/prisma";
import bcrypt from "bcryptjs"
import { NextResponse } from "next/server";

const protectedRoutes = [
    "/dashboard",
    "/student",
    "/teacher",
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

                const isValid = bcrypt.compareSync(credentials.password as string, user.passwordHash as string);
                console.log("isValid", isValid)
                console.log("user", user)
                console.log("credentials", credentials)
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
            const isProtectedRoute = protectedRoutes.some((route) => nextUrl.pathname.startsWith(route));
            const isAuthRoute = nextUrl.pathname.startsWith("/auth")

            if (isProtectedRoute && !isLoggedIn) {
                return NextResponse.redirect(nextUrl.origin + "/auth/login")
            }

            if (isAuthRoute && isLoggedIn) {
                return NextResponse.redirect(nextUrl.origin + "/")
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