import { PrismaClient } from '@prisma/client';
// Disabled: logMiddleware was causing "system" operator logs
// Manual logging is used instead via createLog()
// import { logMiddleware } from './prisma-middleware';

// PrismaClient 单例模式
// 防止开发环境下热重载导致多个实例
const prismaClientSingleton = () => {
  const client = new PrismaClient();

  // Middleware disabled - using manual logging instead
  // client.$use(logMiddleware);

  return client;
};

declare global {
  var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>;
}

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

// 同时导出默认导出和命名导出
export default prisma;
export { prisma };

if (process.env.NODE_ENV !== 'production') globalThis.prismaGlobal = prisma;
