// auth.ts
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

function decodeJwtPayload(token: string): { userId?: string; role?: string; exp?: number } {
  const payload = token.split(".")[1];
  return JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
}

export const { auth, handlers, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      async authorize(credentials) {
        try {
          const res = await fetch(`${process.env.API_URL}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              identifier: credentials?.identifier,
              password: credentials?.password,
            }),
          });
          if (!res.ok) return null;

          const data = (await res.json()) as { accessToken?: string };
          if (!data.accessToken) return null;

          const payload = decodeJwtPayload(data.accessToken);

          // فقط ادمین اجازه‌ی ورود به پنل داره
          if (payload.role !== "ADMIN") return null;

          return {
            id: payload.userId ?? "unknown",
            name: "ادمین",
            accessToken: data.accessToken,
          };
        } catch {
          return null;
        }
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) token.accessToken = user.accessToken;
      return token;
    },
    session({ session, token }) {
      session.accessToken = token.accessToken;
      return session;
    },
  },
});
