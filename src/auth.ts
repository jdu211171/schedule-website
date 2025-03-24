import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      // You can specify which fields should be submitted, by adding keys to the `credentials` object.
      // e.g. domain, username, password, 2FA token, etc.
      credentials: {
        email: {},
        password: {},
      },
      authorize: async (credentials) => {
        if (credentials.email === "admin@gmail.com" && credentials.password === "admin") {
          return await Promise.resolve({ email: credentials.email, name: "admin", image: "" })
        } else {
          return await Promise.resolve(null)
        }
      },
    }),
  ],
  callbacks: {
    redirect(params) {
      console.log("redirect", params)
      return "/"
    },
  }
})