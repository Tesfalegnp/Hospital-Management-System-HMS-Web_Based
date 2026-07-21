-- CreateTable
CREATE TABLE "RoleDefinition" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "level" INTEGER DEFAULT 0,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "isBuiltIn" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isTemplate" BOOLEAN NOT NULL DEFAULT false,
    "hospitalId" TEXT,
    "branchId" TEXT,
    "parentId" TEXT,
    "i18nKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "RoleDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RoleDefinition_code_key" ON "RoleDefinition"("code");

-- CreateIndex
CREATE UNIQUE INDEX "RoleDefinition_hospitalId_name_key" ON "RoleDefinition"("hospitalId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "RoleDefinition_branchId_name_key" ON "RoleDefinition"("branchId", "name");

-- CreateIndex
CREATE INDEX "RoleDefinition_isSystem_idx" ON "RoleDefinition"("isSystem");

-- CreateIndex
CREATE INDEX "RoleDefinition_isBuiltIn_idx" ON "RoleDefinition"("isBuiltIn");

-- CreateIndex
CREATE INDEX "RoleDefinition_isActive_idx" ON "RoleDefinition"("isActive");

-- CreateIndex
CREATE INDEX "RoleDefinition_isTemplate_idx" ON "RoleDefinition"("isTemplate");

-- CreateIndex
CREATE INDEX "RoleDefinition_hospitalId_idx" ON "RoleDefinition"("hospitalId");

-- CreateIndex
CREATE INDEX "RoleDefinition_branchId_idx" ON "RoleDefinition"("branchId");

-- CreateIndex
CREATE INDEX "RoleDefinition_parentId_idx" ON "RoleDefinition"("parentId");

-- CreateIndex
CREATE INDEX "RoleDefinition_hospitalId_isActive_idx" ON "RoleDefinition"("hospitalId", "isActive");

-- CreateIndex
CREATE INDEX "RoleDefinition_hospitalId_isBuiltIn_idx" ON "RoleDefinition"("hospitalId", "isBuiltIn");

-- CreateIndex
CREATE INDEX "RoleDefinition_hospitalId_isTemplate_idx" ON "RoleDefinition"("hospitalId", "isTemplate");

-- AddForeignKey
ALTER TABLE "RoleDefinition" ADD CONSTRAINT "RoleDefinition_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoleDefinition" ADD CONSTRAINT "RoleDefinition_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoleDefinition" ADD CONSTRAINT "RoleDefinition_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "RoleDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
