import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function initAdmin() {
  console.log("🔑 初始化 admin 账号...");

  // 检查 admin 是否已存在
  const existing = await prisma.user.findUnique({
    where: { username: "admin" },
  });

  if (existing) {
    console.log("✅ admin 账号已存在");
    console.log("   用户名: admin");
    console.log("   密码: admin123");
    return;
  }

  // 创建 admin 用户
  const hashedPassword = await hash("admin123", 10);
  const admin = await prisma.user.create({
    data: {
      username: "admin",
      password: hashedPassword,
      role: "admin",
    },
  });

  console.log("✅ admin 账号创建成功");
  console.log("   用户名: admin");
  console.log("   密码: admin123");
  console.log("   角色: admin");

  // 创建测试用户
  const userPassword = await hash("user123", 10);
  const user = await prisma.user.create({
    data: {
      username: "user",
      password: userPassword,
      role: "user",
    },
  });

  console.log("✅ 测试用户创建成功");
  console.log("   用户名: user");
  console.log("   密码: user123");
  console.log("   角色: user");

  // 创建测试许可证
  const license = await prisma.license.create({
    data: {
      deviceCode: "DEV-TEST-DEVICE",
      authCode: "TEST-AUTH-123",
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1年后过期
    },
  });

  console.log("✅ 测试许可证创建成功");
  console.log("   设备码: DEV-TEST-DEVICE");
  console.log("   授权码: TEST-AUTH-123");

  // 创建示例档案
  const archives = [
    {
      title: "2024年度工作总结报告",
      description: "包含各部门年度工作总结和下年度工作计划",
      category: "工作总结",
      tags: ["2024", "年度", "总结"],
      fileUrl: "/samples/summary-2024.pdf",
      fileName: "2024年度工作总结.pdf",
      fileSize: 1024000,
      archiveNo: "2024-GZ-001",
      deptIssue: "办公室",
      responsible: "张三",
      docNo: "文号〔2024〕1号",
      remark: "重要文档，需归档保存",
      year: 2024,
    },
    {
      title: "财务管理制度汇编",
      description: "公司财务管理制度、报销流程、审批权限等",
      category: "财务制度",
      tags: ["财务", "制度", "管理"],
      fileUrl: "/samples/finance-rules.pdf",
      fileName: "财务管理制度.pdf",
      fileSize: 2048000,
      archiveNo: "2024-CW-001",
      deptIssue: "财务部",
      responsible: "李四",
      docNo: "文号〔2024〕15号",
      remark: "最新版本，已更新",
      year: 2024,
    },
  ];

  for (const archiveData of archives) {
    await prisma.archive.create({ data: archiveData });
  }

  console.log(`✅ 创建了 ${archives.length} 个示例档案`);

  console.log("\n🎉 初始化完成！");
}

initAdmin()
  .catch((e) => {
    console.error("❌ 初始化失败:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
