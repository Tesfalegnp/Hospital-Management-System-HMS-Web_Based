-- CreateEnum
CREATE TYPE "ApiKeyScope" AS ENUM ('GLOBAL', 'HOSPITAL', 'BRANCH');

-- CreateEnum
CREATE TYPE "ApiKeyType" AS ENUM ('SYSTEM_INTEGRATION', 'PARTNER_API', 'IOT_DEVICE', 'DEVELOPER');

-- CreateEnum
CREATE TYPE "ApiKeyStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'REVOKED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ApiKeyEnvironment" AS ENUM ('DEVELOPMENT', 'TESTING', 'STAGING', 'PRODUCTION');

-- CreateTable
CREATE TABLE "ApiKey" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "keyPrefix" TEXT NOT NULL,
    "hashedKey" TEXT NOT NULL,
    "description" TEXT,
    "type" "ApiKeyType" NOT NULL DEFAULT 'SYSTEM_INTEGRATION',
    "status" "ApiKeyStatus" NOT NULL DEFAULT 'ACTIVE',
    "scope" "ApiKeyScope" NOT NULL DEFAULT 'GLOBAL',
    "environment" "ApiKeyEnvironment" NOT NULL DEFAULT 'PRODUCTION',
    "expiresAt" TIMESTAMP(3),
    "lastUsedAt" TIMESTAMP(3),
    "lastUsedIp" TEXT,
    "failedAttempts" INTEGER NOT NULL DEFAULT 0,
    "lastFailedAt" TIMESTAMP(3),
    "rotatedFromId" TEXT,
    "roleId" TEXT,
    "hospitalId" TEXT,
    "branchId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ApiKey_keyPrefix_key" ON "ApiKey"("keyPrefix");

-- CreateIndex
CREATE UNIQUE INDEX "ApiKey_hashedKey_key" ON "ApiKey"("hashedKey");

-- CreateIndex
CREATE INDEX "ApiKey_type_idx" ON "ApiKey"("type");

-- CreateIndex
CREATE INDEX "ApiKey_status_idx" ON "ApiKey"("status");

-- CreateIndex
CREATE INDEX "ApiKey_environment_idx" ON "ApiKey"("environment");

-- CreateIndex
CREATE INDEX "ApiKey_roleId_idx" ON "ApiKey"("roleId");

-- CreateIndex
CREATE INDEX "ApiKey_hospitalId_idx" ON "ApiKey"("hospitalId");

-- CreateIndex
CREATE INDEX "ApiKey_branchId_idx" ON "ApiKey"("branchId");

-- CreateIndex
CREATE INDEX "ApiKey_rotatedFromId_idx" ON "ApiKey"("rotatedFromId");

-- CreateIndex
CREATE INDEX "ApiKey_keyPrefix_status_deletedAt_idx" ON "ApiKey"("keyPrefix", "status", "deletedAt");

-- AddForeignKey
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_rotatedFromId_fkey" FOREIGN KEY ("rotatedFromId") REFERENCES "ApiKey"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "RoleDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
