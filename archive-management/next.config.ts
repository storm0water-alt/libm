import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',

  /* config options here */

  // 图片优化配置（本地文件系统）
  images: {
    unoptimized: true,
  },

  // 环境变量（可在运行时覆盖）
  env: {
    NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'http://localhost:3000',
  },

  // Disable ESLint during builds
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Disable TypeScript type checking during builds
  typescript: {
    ignoreBuildErrors: true,
  },

  // 外部服务端依赖（Next.js 15+ 使用顶层配置）
  // 这些模块在运行时被动态引用，需要保持外部引用
  serverExternalPackages: ['bcryptjs'],
};

export default nextConfig;
