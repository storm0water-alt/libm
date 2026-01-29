-- CreateTable
CREATE TABLE "License" (
    "id" TEXT NOT NULL,
    "deviceCode" TEXT NOT NULL,
    "authCode" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "License_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "License_deviceCode_key" ON "License"("deviceCode");

-- CreateIndex
CREATE INDEX "License_deviceCode_idx" ON "License"("deviceCode");

-- CreateIndex
CREATE INDEX "License_expiresAt_idx" ON "License"("expiresAt");
