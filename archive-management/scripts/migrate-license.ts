import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function migrateLicense() {
  console.log("Starting license migration...");

  try {
    // Check if expireTime column exists
    const checkExpireTime = await prisma.$queryRaw`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'License'
      AND column_name = 'expireTime'
    `;

    if (!checkExpireTime || (Array.isArray(checkExpireTime) && checkExpireTime.length === 0)) {
      console.log("Adding expireTime column...");
      await prisma.$executeRaw`
        ALTER TABLE "License" ADD COLUMN "expireTime" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP
      `;
    }

    // Copy data from expiresAt to expireTime if exists
    console.log("Copying data from expiresAt to expireTime...");
    await prisma.$executeRaw`
      UPDATE "License" SET "expireTime" = "expiresAt" WHERE "expiresAt" IS NOT NULL
    `;

    // Check if updatedAt column exists
    const checkUpdatedAt = await prisma.$queryRaw`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'License'
      AND column_name = 'updatedAt'
    `;

    if (!checkUpdatedAt || (Array.isArray(checkUpdatedAt) && checkUpdatedAt.length === 0)) {
      console.log("Adding updatedAt column...");
      await prisma.$executeRaw`
        ALTER TABLE "License" ADD COLUMN "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP
      `;
    }

    // Add unique constraint on authCode
    console.log("Adding unique constraint on authCode...");
    try {
      await prisma.$executeRaw`
        CREATE UNIQUE INDEX IF NOT EXISTS "License_authCode_key" ON "License"("authCode")
      `;
    } catch (e: any) {
      if (!e.message.includes("already exists")) {
        console.error("Error creating unique constraint:", e);
      }
    }

    // Drop old expiresAt column
    console.log("Dropping expiresAt column...");
    await prisma.$executeRaw`
      ALTER TABLE "License" DROP COLUMN IF EXISTS "expiresAt"
    `;

    console.log("License migration completed successfully!");
  } catch (error) {
    console.error("Migration failed:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

migrateLicense()
  .catch(console.error);
