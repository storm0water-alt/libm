import NextAuth from "next-auth";
import { skipCSRFCheck } from "@auth/core";
import CredentialsProvider from "next-auth/providers/credentials";
import { authenticateUser } from "@/services/auth.service";
import { updateLastLoginTime } from "@/services/user.service";

// 日志前缀
const LOG_PREFIX = "[Auth.js]";

function log(step: string, message: string, data?: any) {
  const timestamp = new Date().toISOString();
  const logMessage = `${LOG_PREFIX}[${timestamp}] ${step}: ${message}`;
  if (data !== undefined) {
    console.log(logMessage, typeof data === 'object' ? JSON.stringify(data, null, 2) : data);
  } else {
    console.log(logMessage);
  }
}

function logError(step: string, message: string, error?: any) {
  const timestamp = new Date().toISOString();
  console.error(`${LOG_PREFIX}[${timestamp}] ${step}: ${message}`, error || '');
}

const providers = [
  CredentialsProvider({
    name: "Credentials",
    credentials: {
      username: { label: "用户名", type: "text" },
      password: { label: "密码", type: "password" }
    },
    async authorize(credentials) {
      log("AUTHORIZE", "开始 authorize 回调", {
        hasUsername: !!credentials?.username,
        hasPassword: !!credentials?.password
      });

      if (!credentials?.username || !credentials?.password) {
        logError("AUTHORIZE", "缺少凭证");
        return null;
      }

      const startTime = Date.now();
      const authResult = await authenticateUser(
        credentials.username as string,
        credentials.password as string
      );

      const authDuration = Date.now() - startTime;
      log("AUTHORIZE", `认证结果 (耗时: ${authDuration}ms)`, {
        success: authResult.success,
        userId: authResult.user?.id,
        username: authResult.user?.username,
        role: authResult.user?.role
      });

      if (!authResult.success || !authResult.user) {
        logError("AUTHORIZE", "认证失败", authResult.error);
        return null;
      }

      // Update last login time
      log("AUTHORIZE", "更新最后登录时间");
      await updateLastLoginTime(authResult.user.id).catch((error) => {
        logError("AUTHORIZE", "更新最后登录时间失败", error);
      });

      const user = {
        id: authResult.user.id,
        username: authResult.user.username,
        role: authResult.user.role,
        status: authResult.user.status,
      };

      log("AUTHORIZE", "authorize 成功，返回用户信息", user);
      return user;
    }
  })
];

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  skipCSRFCheck,
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

