-- CreateTable
CREATE TABLE "Permission" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "module" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "isSystem" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "hospitalId" TEXT,
    "branchId" TEXT,
    "i18nKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Permission_code_key" ON "Permission"("code");

-- CreateIndex
CREATE INDEX "Permission_module_idx" ON "Permission"("module");

-- CreateIndex
CREATE INDEX "Permission_resource_idx" ON "Permission"("resource");

-- CreateIndex
CREATE INDEX "Permission_action_idx" ON "Permission"("action");

-- CreateIndex
CREATE INDEX "Permission_category_idx" ON "Permission"("category");

-- CreateIndex
CREATE INDEX "Permission_isSystem_idx" ON "Permission"("isSystem");

-- CreateIndex
CREATE INDEX "Permission_isActive_idx" ON "Permission"("isActive");

-- CreateIndex
CREATE INDEX "Permission_hospitalId_idx" ON "Permission"("hospitalId");

-- CreateIndex
CREATE INDEX "Permission_branchId_idx" ON "Permission"("branchId");

-- CreateIndex
CREATE INDEX "Permission_module_resource_idx" ON "Permission"("module", "resource");

-- AddForeignKey
ALTER TABLE "Permission" ADD CONSTRAINT "Permission_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Permission" ADD CONSTRAINT "Permission_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
