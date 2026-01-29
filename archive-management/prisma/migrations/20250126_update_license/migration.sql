-- Alter License table
-- Step 1: Add expireTime column (temporary default)
ALTER TABLE "License" ADD COLUMN IF NOT EXISTS "expireTime" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;

-- Step 2: Copy data from expiresAt to expireTime (if exists)
UPDATE "License" SET "expireTime" = "expiresAt" WHERE "expiresAt" IS NOT NULL;

-- Step 3: Add updatedAt column with default
ALTER TABLE "License" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;

-- Step 4: Add unique constraint on authCode
DROP INDEX IF EXISTS "License_authCode_key";
CREATE UNIQUE INDEX "License_authCode_key" ON "License"("authCode");

-- Step 5: Drop old expiresAt column
ALTER TABLE "License" DROP COLUMN IF EXISTS "expiresAt";
