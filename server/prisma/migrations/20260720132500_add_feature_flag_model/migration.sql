-- CreateEnum
CREATE TYPE "FeatureFlagScope" AS ENUM ('GLOBAL', 'HOSPITAL', 'BRANCH');

-- CreateTable
CREATE TABLE "FeatureFlag" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "scope" "FeatureFlagScope" NOT NULL,
    "rolloutPercentage" INTEGER DEFAULT 100,
    "metadata" JSONB,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "hospitalId" TEXT,
    "branchId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "FeatureFlag_pkey" PRIMARY KEY ("id")
);

-- CreateCheckConstraint
ALTER TABLE "FeatureFlag" ADD CONSTRAINT "FeatureFlag_rolloutPercentage_check"
CHECK ("rolloutPercentage" IS NULL OR ("rolloutPercentage" >= 0 AND "rolloutPercentage" <= 100));

-- CreateIndex
CREATE UNIQUE INDEX "FeatureFlag_scope_hospitalId_branchId_key_key" ON "FeatureFlag"("scope", "hospitalId", "branchId", "key");

-- CreateIndex
CREATE INDEX "FeatureFlag_key_idx" ON "FeatureFlag"("key");

-- CreateIndex
CREATE INDEX "FeatureFlag_enabled_idx" ON "FeatureFlag"("enabled");

-- CreateIndex
CREATE INDEX "FeatureFlag_isSystem_idx" ON "FeatureFlag"("isSystem");

-- CreateIndex
CREATE INDEX "FeatureFlag_hospitalId_idx" ON "FeatureFlag"("hospitalId");

-- CreateIndex
CREATE INDEX "FeatureFlag_branchId_idx" ON "FeatureFlag"("branchId");

-- CreateIndex
CREATE INDEX "FeatureFlag_scope_key_enabled_idx" ON "FeatureFlag"("scope", "key", "enabled");

-- AddForeignKey
ALTER TABLE "FeatureFlag" ADD CONSTRAINT "FeatureFlag_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeatureFlag" ADD CONSTRAINT "FeatureFlag_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
