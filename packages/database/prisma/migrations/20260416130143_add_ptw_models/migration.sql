-- AlterTable
ALTER TABLE "certification_programs" ADD COLUMN     "validityDays" INTEGER;

-- CreateTable
CREATE TABLE "ptw_projects" (
    "id" TEXT NOT NULL,
    "noPtw" TEXT,
    "judulPekerjaan" TEXT NOT NULL,
    "lokasiPekerjaan" TEXT,
    "tanggalMulai" TIMESTAMP(3),
    "tanggalSelesai" TIMESTAMP(3),
    "keteranganTambahan" TEXT,
    "jsaProjectId" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "approvalStatus" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "currentVersionId" TEXT,

    CONSTRAINT "ptw_projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ptw_project_versions" (
    "id" TEXT NOT NULL,
    "ptwId" TEXT,
    "versionNumber" INTEGER NOT NULL,
    "label" TEXT,
    "changeNote" TEXT,
    "status" "VersionStatus" NOT NULL DEFAULT 'DRAFT',
    "submittedBy" TEXT,
    "submittedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ptw_project_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ptw_version_approvals" (
    "id" TEXT NOT NULL,
    "ptwProjectVersionId" TEXT NOT NULL,
    "stepOrder" INTEGER NOT NULL,
    "requiredRole" "Role" NOT NULL,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ptw_version_approvals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ptw_projects_jsaProjectId_idx" ON "ptw_projects"("jsaProjectId");

-- CreateIndex
CREATE INDEX "ptw_projects_approvalStatus_idx" ON "ptw_projects"("approvalStatus");

-- CreateIndex
CREATE INDEX "ptw_projects_isDeleted_idx" ON "ptw_projects"("isDeleted");

-- CreateIndex
CREATE INDEX "ptw_projects_createdBy_idx" ON "ptw_projects"("createdBy");

-- CreateIndex
CREATE INDEX "ptw_project_versions_ptwId_idx" ON "ptw_project_versions"("ptwId");

-- AddForeignKey
ALTER TABLE "ptw_projects" ADD CONSTRAINT "ptw_projects_jsaProjectId_fkey" FOREIGN KEY ("jsaProjectId") REFERENCES "jsa_project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ptw_projects" ADD CONSTRAINT "ptw_projects_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ptw_project_versions" ADD CONSTRAINT "ptw_project_versions_ptwId_fkey" FOREIGN KEY ("ptwId") REFERENCES "ptw_projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ptw_project_versions" ADD CONSTRAINT "ptw_project_versions_submittedBy_fkey" FOREIGN KEY ("submittedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ptw_project_versions" ADD CONSTRAINT "ptw_project_versions_reviewedBy_fkey" FOREIGN KEY ("reviewedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ptw_version_approvals" ADD CONSTRAINT "ptw_version_approvals_ptwProjectVersionId_fkey" FOREIGN KEY ("ptwProjectVersionId") REFERENCES "ptw_project_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ptw_version_approvals" ADD CONSTRAINT "ptw_version_approvals_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
