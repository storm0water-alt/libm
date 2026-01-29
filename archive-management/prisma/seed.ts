import { PrismaClient } from "@prisma/client";
import { hash } from "bcrypt";
import { configureIndexSettings, batchIndexArchives, getSearchStats } from "@/services/meilisearch.service";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Create test admin user
  const adminPassword = await hash("admin123", 10);
  const admin = await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      username: "admin",
      password: adminPassword,
      role: "admin",
    },
  });
  console.log("✅ Created admin user:", admin.username);

  // Create test regular user
  const userPassword = await hash("user123", 10);
  const user = await prisma.user.upsert({
    where: { username: "user" },
    update: {},
    create: {
      username: "user",
      password: userPassword,
      role: "user",
    },
  });
  console.log("✅ Created test user:", user.username);

  // Create sample license
  const license = await prisma.license.upsert({
    where: { deviceCode: "DEV-TEST-DEVICE" },
    update: {},
    create: {
      deviceCode: "DEV-TEST-DEVICE",
      authCode: "TEST-AUTH-123",
      expireTime: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
    },
  });
  console.log("✅ Created test license");

  // Create sample archives
  const sampleArchives = [
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
    {
      title: "员工培训计划",
      description: "2024年度员工技能培训和职业发展计划",
      category: "人力资源",
      tags: ["培训", "人力资源", "员工发展"],
      fileUrl: "/samples/training-plan.pdf",
      fileName: "员工培训计划.pdf",
      fileSize: 512000,
      archiveNo: "2024-RL-001",
      deptIssue: "人力资源部",
      responsible: "王五",
      docNo: "文号〔2024〕8号",
      remark: null,
      year: 2024,
    },
    {
      title: "安全生产管理规定",
      description: "生产安全操作规程、应急预案、安全责任制",
      category: "安全管理",
      tags: ["安全", "生产", "制度"],
      fileUrl: "/samples/safety-rules.pdf",
      fileName: "安全生产规定.pdf",
      fileSize: 768000,
      archiveNo: "2024-AQ-001",
      deptIssue: "安全生产部",
      responsible: "赵六",
      docNo: "文号〔2024〕20号",
      remark: "强制执行，所有员工必须学习",
      year: 2024,
    },
    {
      title: "项目验收报告",
      description: "XX项目验收报告，包含技术指标、测试结果等",
      category: "项目管理",
      tags: ["项目", "验收", "报告"],
      fileUrl: "/samples/project-acceptance.pdf",
      fileName: "项目验收报告.pdf",
      fileSize: 1280000,
      archiveNo: "2024-XM-001",
      deptIssue: "项目管理部",
      responsible: "孙七",
      docNo: "文号〔2024〕12号",
      remark: "已通过验收",
      year: 2024,
    },
  ];

  const createdArchives = [];
  for (const archiveData of sampleArchives) {
    const archive = await prisma.archive.upsert({
      where: { archiveNo: archiveData.archiveNo },
      update: {},
      create: archiveData,
    });
    createdArchives.push(archive);
    console.log(`✅ Created archive: ${archive.title}`);
  }

  console.log(`📦 Created ${createdArchives.length} sample archives`);

  // Configure and populate Meilisearch index (optional, don't fail if unavailable)
  console.log("🔍 Setting up Meilisearch index...");
  try {
    // Configure index settings
    const settingsResult = await configureIndexSettings();
    if (settingsResult.success) {
      console.log("✅ Meilisearch index configured");
    } else {
      console.log("⚠️  Failed to configure Meilisearch index:", settingsResult.error);
    }

    // Batch index all archives
    const indexResult = await batchIndexArchives(createdArchives);
    if (indexResult.success) {
      console.log(`✅ Indexed ${indexResult.indexed} archives in Meilisearch`);
    } else {
      console.log(`⚠️  Partial indexing: ${indexResult.indexed} succeeded, ${indexResult.failed} failed`);
      if (indexResult.errors.length > 0) {
        console.log("   Errors:", indexResult.errors);
      }
    }

    // Get and display search stats
    const stats = await getSearchStats();
    if (stats) {
      console.log(`📊 Meilisearch stats: ${stats.numberOfDocuments} documents indexed`);
    }
  } catch (error) {
    console.log("⚠️  Meilisearch not available, skipping index setup");
    console.log("   (This is OK if you haven't started Meilisearch yet)");
  }

  // Seed system reserved configurations
  console.log("⚙️  Seeding system configurations...");
  const systemConfigs = [
    {
      configKey: "log.retention.days",
      configValue: "365",
      configType: "number",
      description: "日志保留天数",
      group: "system",
      isSystem: true,
    },
    {
      configKey: "license.cache.enabled",
      configValue: "true",
      configType: "boolean",
      description: "许可证缓存启用状态",
      group: "license",
      isSystem: true,
    },
    {
      configKey: "system.name",
      configValue: "档案管理系统",
      configType: "string",
      description: "系统名称",
      group: "system",
      isSystem: true,
    },
    {
      configKey: "upload.max.size",
      configValue: "52428800",
      configType: "number",
      description: "最大上传文件大小（字节）",
      group: "upload",
      isSystem: true,
    },
    {
      configKey: "pagination.default.size",
      configValue: "20",
      configType: "number",
      description: "默认分页大小",
      group: "ui",
      isSystem: true,
    },
  ];

  for (const config of systemConfigs) {
    await prisma.systemConfig.upsert({
      where: { configKey: config.configKey },
      update: {
        configValue: config.configValue,
        configType: config.configType,
        description: config.description,
        group: config.group,
        isSystem: config.isSystem,
      },
      create: config,
    });
    console.log(`✅ Seeded config: ${config.configKey} = ${config.configValue}`);
  }

  console.log("🎉 Seeding completed!");
  console.log("\n📝 Test credentials:");
  console.log("   Admin: admin / admin123");
  console.log("   User:  user / user123");
  console.log("   License Device: DEV-TEST-DEVICE");
  console.log("   License Auth Code: TEST-AUTH-123");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
