-- ============================================================ --
-- Archive Management System - Database Schema (Offline)      --
-- Generated: 2026-03-02                                       --
-- Note: This file creates the complete database schema        --
-- ============================================================ --

-- ============================================================================
-- Step 1: Create base tables
-- ============================================================================

-- Users table
CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'user',
    "status" TEXT NOT NULL DEFAULT 'enabled',
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "User_username_key" ON "User"("username");

-- Archives table
CREATE TABLE IF NOT EXISTS "Archive" (
    "archiveID" TEXT NOT NULL,
    "archiveNo" TEXT NOT NULL,
    "fondsNo" TEXT NOT NULL,
    "retentionPeriod" TEXT NOT NULL,
    "retentionCode" TEXT NOT NULL,
    "year" TEXT NOT NULL,
    "deptCode" TEXT NOT NULL,
    "boxNo" TEXT NOT NULL,
    "pieceNo" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "deptIssue" TEXT NOT NULL,
    "responsible" TEXT NOT NULL,
    "docNo" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "pageNo" TEXT NOT NULL,
    "remark" TEXT,
    "fileUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "importRecordId" TEXT,

    CONSTRAINT "Archive_pkey" PRIMARY KEY ("archiveID")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Archive_archiveNo_key" ON "Archive"("archiveNo");
CREATE INDEX IF NOT EXISTS "Archive_archiveNo_idx" ON "Archive"("archiveNo");
CREATE INDEX IF NOT EXISTS "Archive_fondsNo_idx" ON "Archive"("fondsNo");
CREATE INDEX IF NOT EXISTS "Archive_year_idx" ON "Archive"("year");
CREATE INDEX IF NOT EXISTS "Archive_title_idx" ON "Archive"("title");
CREATE INDEX IF NOT EXISTS "Archive_createdAt_idx" ON "Archive"("createdAt");

-- Import Records table
CREATE TABLE IF NOT EXISTS "ImportRecord" (
    "id" TEXT NOT NULL,
    "fileName" TEXT,
    "type" TEXT NOT NULL DEFAULT 'pdf',
    "total" INTEGER NOT NULL,
    "processed" INTEGER NOT NULL DEFAULT 0,
    "failed" INTEGER NOT NULL DEFAULT 0,
    "skipped" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'processing',
    "errors" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,

    CONSTRAINT "ImportRecord_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ImportRecord_userId_idx" ON "ImportRecord"("userId");
CREATE INDEX IF NOT EXISTS "ImportRecord_status_idx" ON "ImportRecord"("status");
CREATE INDEX IF NOT EXISTS "ImportRecord_type_idx" ON "ImportRecord"("type");

-- Operation Logs table
CREATE TABLE IF NOT EXISTS "OperationLog" (
    "id" TEXT NOT NULL,
    "operator" TEXT NOT NULL DEFAULT 'system',
    "operation" TEXT NOT NULL DEFAULT 'unknown',
    "target" TEXT NOT NULL DEFAULT '',
    "ip" TEXT NOT NULL DEFAULT '',
    "time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "archiveId" TEXT,
    "action" TEXT,
    "entityType" TEXT,
    "entityId" TEXT,
    "description" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT,

    CONSTRAINT "OperationLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "OperationLog_userId_idx" ON "OperationLog"("userId");
CREATE INDEX IF NOT EXISTS "OperationLog_operation_idx" ON "OperationLog"("operation");
CREATE INDEX IF NOT EXISTS "OperationLog_time_idx" ON "OperationLog"("time");
CREATE INDEX IF NOT EXISTS "OperationLog_archiveId_idx" ON "OperationLog"("archiveId");

-- License table
CREATE TABLE IF NOT EXISTS "License" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT '未命名授权',
    "deviceCode" TEXT NOT NULL,
    "authCode" TEXT NOT NULL,
    "expireTime" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "License_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "License_deviceCode_key" ON "License"("deviceCode");
CREATE UNIQUE INDEX IF NOT EXISTS "License_authCode_key" ON "License"("authCode");
CREATE INDEX IF NOT EXISTS "License_deviceCode_idx" ON "License"("deviceCode");
CREATE INDEX IF NOT EXISTS "License_expireTime_idx" ON "License"("expireTime");

-- System Config table
CREATE TABLE IF NOT EXISTS "SystemConfig" (
    "id" TEXT NOT NULL,
    "configKey" TEXT NOT NULL,
    "configValue" TEXT NOT NULL,
    "configType" TEXT NOT NULL DEFAULT 'string',
    "description" TEXT,
    "group" TEXT NOT NULL DEFAULT 'default',
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SystemConfig_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "SystemConfig_configKey_key" ON "SystemConfig"("configKey");
CREATE INDEX IF NOT EXISTS "SystemConfig_group_idx" ON "SystemConfig"("group");
CREATE INDEX IF NOT EXISTS "SystemConfig_configKey_idx" ON "SystemConfig"("configKey");

-- Config History table
CREATE TABLE IF NOT EXISTS "ConfigHistory" (
    "id" TEXT NOT NULL,
    "configKey" TEXT NOT NULL,
    "oldValue" TEXT NOT NULL,
    "newValue" TEXT NOT NULL,
    "operator" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "configId" TEXT NOT NULL,

    CONSTRAINT "ConfigHistory_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ConfigHistory_configKey_idx" ON "ConfigHistory"("configKey");
CREATE INDEX IF NOT EXISTS "ConfigHistory_createdAt_idx" ON "ConfigHistory"("createdAt");
CREATE INDEX IF NOT EXISTS "ConfigHistory_configId_idx" ON "ConfigHistory"("configId");

-- ============================================================================
-- Step 2: Add foreign key constraints (idempotent)
-- ============================================================================

DO $$
BEGIN
    -- Archive -> ImportRecord
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Archive_importRecordId_fkey') THEN
        ALTER TABLE "Archive" ADD CONSTRAINT "Archive_importRecordId_fkey"
            FOREIGN KEY ("importRecordId") REFERENCES "ImportRecord"("id")
            ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;

    -- ImportRecord -> User
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ImportRecord_userId_fkey') THEN
        ALTER TABLE "ImportRecord" ADD CONSTRAINT "ImportRecord_userId_fkey"
            FOREIGN KEY ("userId") REFERENCES "User"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    -- OperationLog -> User
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'OperationLog_userId_fkey') THEN
        ALTER TABLE "OperationLog" ADD CONSTRAINT "OperationLog_userId_fkey"
            FOREIGN KEY ("userId") REFERENCES "User"("id")
            ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;

    -- OperationLog -> Archive
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'OperationLog_archiveId_fkey') THEN
        ALTER TABLE "OperationLog" ADD CONSTRAINT "OperationLog_archiveId_fkey"
            FOREIGN KEY ("archiveId") REFERENCES "Archive"("archiveID")
            ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;

    -- ConfigHistory -> SystemConfig
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ConfigHistory_configId_fkey') THEN
        ALTER TABLE "ConfigHistory" ADD CONSTRAINT "ConfigHistory_configId_fkey"
            FOREIGN KEY ("configId") REFERENCES "SystemConfig"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END
$$;

-- ============================================================================
-- Schema creation complete
-- ============================================================================
