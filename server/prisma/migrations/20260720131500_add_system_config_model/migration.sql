-- CreateEnum
CREATE TYPE "ConfigScope" AS ENUM ('GLOBAL', 'HOSPITAL', 'BRANCH');

-- CreateEnum
CREATE TYPE "ConfigValueType" AS ENUM ('STRING', 'NUMBER', 'BOOLEAN', 'JSON', 'ENCRYPTED');

-- CreateEnum
CREATE TYPE "ConfigCategory" AS ENUM ('SYSTEM', 'SECURITY', 'CLINICAL', 'BILLING', 'PHARMACY', 'NOTIFICATION', 'INTEGRATION', 'AI');

-- CreateTable
CREATE TABLE "SystemConfig" (
    "id" TEXT NOT NULL,
    "scope" "ConfigScope" NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "valueType" "ConfigValueType" NOT NULL DEFAULT 'STRING',
    "category" "ConfigCategory" NOT NULL,
    "description" TEXT,
    "validationRules" JSONB,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "isEncrypted" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "hospitalId" TEXT,
    "branchId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "SystemConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SystemConfig_scope_hospitalId_branchId_key_key" ON "SystemConfig"("scope", "hospitalId", "branchId", "key");

-- CreateIndex
CREATE INDEX "SystemConfig_key_idx" ON "SystemConfig"("key");

-- CreateIndex
CREATE INDEX "SystemConfig_category_idx" ON "SystemConfig"("category");

-- CreateIndex
CREATE INDEX "SystemConfig_isSystem_idx" ON "SystemConfig"("isSystem");

-- CreateIndex
CREATE INDEX "SystemConfig_isActive_idx" ON "SystemConfig"("isActive");

-- CreateIndex
CREATE INDEX "SystemConfig_hospitalId_idx" ON "SystemConfig"("hospitalId");

-- CreateIndex
CREATE INDEX "SystemConfig_branchId_idx" ON "SystemConfig"("branchId");

-- CreateIndex
CREATE INDEX "SystemConfig_scope_key_isActive_idx" ON "SystemConfig"("scope", "key", "isActive");

-- CreateIndex
CREATE INDEX "SystemConfig_hospitalId_isActive_idx" ON "SystemConfig"("hospitalId", "isActive");

-- AddForeignKey
ALTER TABLE "SystemConfig" ADD CONSTRAINT "SystemConfig_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SystemConfig" ADD CONSTRAINT "SystemConfig_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
