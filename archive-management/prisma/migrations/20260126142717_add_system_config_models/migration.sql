-- CreateTable
CREATE TABLE "SystemConfig" (
    "id" TEXT NOT NULL,
    "configKey" TEXT NOT NULL,
    "configValue" TEXT NOT NULL,
    "configType" TEXT NOT NULL DEFAULT 'string',
    "description" TEXT,
    "group" TEXT NOT NULL DEFAULT 'default',
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConfigHistory" (
    "id" TEXT NOT NULL,
    "configKey" TEXT NOT NULL,
    "oldValue" TEXT NOT NULL,
    "newValue" TEXT NOT NULL,
    "operator" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "configId" TEXT NOT NULL,

    CONSTRAINT "ConfigHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SystemConfig_configKey_key" ON "SystemConfig"("configKey");

-- CreateIndex
CREATE INDEX "SystemConfig_group_idx" ON "SystemConfig"("group");

-- CreateIndex
CREATE INDEX "SystemConfig_configKey_idx" ON "SystemConfig"("configKey");

-- CreateIndex
CREATE INDEX "ConfigHistory_configKey_idx" ON "ConfigHistory"("configKey");

-- CreateIndex
CREATE INDEX "ConfigHistory_createdAt_idx" ON "ConfigHistory"("createdAt");

-- CreateIndex
CREATE INDEX "ConfigHistory_configId_idx" ON "ConfigHistory"("configId");

-- CreateIndex
CREATE INDEX "Archive_archiveNo_idx" ON "Archive"("archiveNo");

-- AddForeignKey
ALTER TABLE "ConfigHistory" ADD CONSTRAINT "ConfigHistory_configId_fkey" FOREIGN KEY ("configId") REFERENCES "SystemConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;
