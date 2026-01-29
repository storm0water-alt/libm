import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { authenticateUser } from "@/services/auth.service";
import { updateLastLoginTime } from "@/services/user.service";

const providers = [
  CredentialsProvider({
    name: "Credentials",
    credentials: {
      username: { label: "用户名", type: "text" },
      password: { label: "密码", type: "password" }
    },
    async authorize(credentials) {
      if (!credentials?.username || !credentials?.password) {
        return null;
      }

      const authResult = await authenticateUser(
        credentials.username as string,
        credentials.password as string
      );

      if (!authResult.success || !authResult.user) {
        return null;
      }

      // Update last login time
      await updateLastLoginTime(authResult.user.id).catch((error) => {
        console.error("Failed to update last login time:", error);
      });

      return {
        id: authResult.user.id,
        username: authResult.user.username,
        role: authResult.user.role,
        status: authResult.user.status,
      };
    }
  })
];

export const { handlers, auth, signIn, signOut } = NextAuth({
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.username = user.username;
        token.role = user.role;
        token.status = user.status;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.username = token.username as string;
        session.user.role = token.role as string;
        session.user.status = token.status as string;
      }
      return session;
    },
  },
  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60,
  },
  providers,
});

