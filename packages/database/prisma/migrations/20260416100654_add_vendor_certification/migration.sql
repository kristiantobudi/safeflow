/*
  Warnings:

  - The `questionIds` column on the `exam_attempts` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `visibleTo` column on the `notifications` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `options` column on the `questions` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `twoFactorBackupCodes` column on the `users` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the `project_approvals` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "DiffType" AS ENUM ('ADDED', 'REMOVED', 'MODIFIED', 'UNCHANGED');

-- CreateEnum
CREATE TYPE "VersionStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "TipePotensi" AS ENUM ('MAN', 'MACHINE', 'METHOD', 'MATERIAL', 'ENV');

-- CreateEnum
CREATE TYPE "TipeKontrol" AS ENUM ('EL', 'SUB', 'RE', 'ADM', 'PPE');

-- CreateEnum
CREATE TYPE "VendorStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "VendorCertificationStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'REVOKED');

-- DropForeignKey
ALTER TABLE "project_approvals" DROP CONSTRAINT "project_approvals_approvedBy_fkey";

-- DropForeignKey
ALTER TABLE "project_approvals" DROP CONSTRAINT "project_approvals_projectId_fkey";

-- AlterTable
ALTER TABLE "exam_attempts" DROP COLUMN "questionIds",
ADD COLUMN     "questionIds" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "hiracs" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ALTER COLUMN "no" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "notifications" DROP COLUMN "visibleTo",
ADD COLUMN     "visibleTo" "Role"[] DEFAULT ARRAY['ADMIN']::"Role"[];

-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "currentVersionId" TEXT;

-- AlterTable
ALTER TABLE "questions" DROP COLUMN "options",
ADD COLUMN     "options" TEXT[];

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "address" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "vendorId" TEXT,
DROP COLUMN "twoFactorBackupCodes",
ADD COLUMN     "twoFactorBackupCodes" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- DropTable
DROP TABLE "project_approvals";

-- CreateTable
CREATE TABLE "project_versions" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
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

    CONSTRAINT "project_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "version_approvals" (
    "id" TEXT NOT NULL,
    "projectVersionId" TEXT NOT NULL,
    "stepOrder" INTEGER NOT NULL,
    "requiredRole" "Role" NOT NULL,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "version_approvals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hirac_versions" (
    "id" TEXT NOT NULL,
    "projectVersionId" TEXT NOT NULL,
    "hiracId" TEXT,
    "no" TEXT,
    "kegiatan" TEXT NOT NULL,
    "kategori" "ActivityCategory" NOT NULL,
    "identifikasiBahaya" TEXT NOT NULL,
    "akibatRisiko" TEXT NOT NULL,
    "penilaianAwalAkibat" INTEGER NOT NULL,
    "penilaianAwalKemungkinan" TEXT NOT NULL,
    "penilaianAwalTingkatRisiko" "RiskLevel" NOT NULL,
    "risikoDapatDiterimaAwal" BOOLEAN NOT NULL,
    "peraturanTerkait" TEXT,
    "pengendalian" TEXT NOT NULL,
    "penilaianLanjutanAkibat" INTEGER NOT NULL,
    "penilaianLanjutanKemungkinan" TEXT NOT NULL,
    "penilaianLanjutanTingkatRisiko" "RiskLevel" NOT NULL,
    "risikoDapatDiterimaLanjutan" BOOLEAN NOT NULL,
    "peluang" TEXT,
    "picId" TEXT,
    "status" "StatusControl" NOT NULL,
    "diffType" "DiffType" NOT NULL DEFAULT 'UNCHANGED',
    "versionNumber" INTEGER NOT NULL,
    "isLatest" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hirac_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jsa_project" (
    "id" TEXT NOT NULL,
    "noJsa" TEXT,
    "jenisKegiatan" TEXT NOT NULL,
    "lokasiKegiatan" TEXT,
    "tanggalDibuat" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revisiKe" INTEGER NOT NULL DEFAULT 0,
    "referensiHirarc" TEXT,
    "pelaksanaUtama" TEXT,
    "hseInCharge" TEXT,
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT,
    "deletedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectedBy" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "approvalStatus" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "currentVersionId" TEXT,

    CONSTRAINT "jsa_project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jsa_apd" (
    "id" TEXT NOT NULL,
    "jsaProjectId" TEXT NOT NULL,
    "safetyHelmet" BOOLEAN NOT NULL DEFAULT false,
    "safetyShoes" BOOLEAN NOT NULL DEFAULT false,
    "gloves" BOOLEAN NOT NULL DEFAULT false,
    "safetyGlasses" BOOLEAN NOT NULL DEFAULT false,
    "safetyVest" BOOLEAN NOT NULL DEFAULT false,
    "safetyBodyHarness" BOOLEAN NOT NULL DEFAULT false,
    "others" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "jsa_apd_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jsa_project_versions" (
    "id" TEXT NOT NULL,
    "hiracVersionId" TEXT NOT NULL,
    "jsaId" TEXT,
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

    CONSTRAINT "jsa_project_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jsa_version_approvals" (
    "id" TEXT NOT NULL,
    "jsaProjectVersionId" TEXT NOT NULL,
    "stepOrder" INTEGER NOT NULL,
    "requiredRole" "Role" NOT NULL,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "jsa_version_approvals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jsa_entries" (
    "id" TEXT NOT NULL,
    "jsaProjectVersionId" TEXT NOT NULL,
    "no" INTEGER,
    "kategoriGrup" TEXT,
    "namaGrup" TEXT,
    "langkahKerja" TEXT NOT NULL,
    "penanggungJawab" TEXT,
    "diffType" "DiffType" NOT NULL DEFAULT 'UNCHANGED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "jsa_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jsa_bahaya" (
    "id" TEXT NOT NULL,
    "jsaEntryId" TEXT NOT NULL,
    "tipePotensi" "TipePotensi" NOT NULL,
    "deskripsi" TEXT NOT NULL,
    "urutan" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "jsa_bahaya_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jsa_penanggulangan" (
    "id" TEXT NOT NULL,
    "jsaBahayaId" TEXT NOT NULL,
    "tipeKontrol" "TipeKontrol" NOT NULL,
    "deskripsi" TEXT NOT NULL,
    "urutan" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "jsa_penanggulangan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jsas" (
    "id" TEXT NOT NULL,
    "no" INTEGER NOT NULL,
    "katergoriLangkah" TEXT NOT NULL,
    "langkahKerja" TEXT NOT NULL,
    "penanggungJawab" TEXT NOT NULL,
    "jsaProjectId" TEXT NOT NULL,

    CONSTRAINT "jsas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jsa_versions" (
    "id" TEXT NOT NULL,
    "jsaProjectVersionId" TEXT NOT NULL,

    CONSTRAINT "jsa_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendors" (
    "id" TEXT NOT NULL,
    "vendorName" TEXT NOT NULL,
    "vendorAddress" TEXT NOT NULL,
    "vendorPhone" TEXT NOT NULL,
    "vendorEmail" TEXT NOT NULL,
    "vendorWebsite" TEXT,
    "vendorLogo" TEXT,
    "vendorDescription" TEXT,
    "vendorStatus" "VendorStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "deletedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "certificationProgramId" TEXT,

    CONSTRAINT "vendors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "worker_vendors" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "deletedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "worker_vendors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "certification_programs" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "certification_programs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "certification_program_modules" (
    "id" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "certification_program_modules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendor_certifications" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "status" "VendorCertificationStatus" NOT NULL DEFAULT 'ACTIVE',
    "certNumber" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "revokedBy" TEXT,
    "revokeReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vendor_certifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_HiracToJsaProject" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "_HiracToVendor" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE INDEX "project_versions_projectId_idx" ON "project_versions"("projectId");

-- CreateIndex
CREATE INDEX "project_versions_status_idx" ON "project_versions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "project_versions_projectId_versionNumber_key" ON "project_versions"("projectId", "versionNumber");

-- CreateIndex
CREATE INDEX "version_approvals_projectVersionId_idx" ON "version_approvals"("projectVersionId");

-- CreateIndex
CREATE INDEX "hirac_versions_projectVersionId_idx" ON "hirac_versions"("projectVersionId");

-- CreateIndex
CREATE INDEX "hirac_versions_hiracId_idx" ON "hirac_versions"("hiracId");

-- CreateIndex
CREATE INDEX "jsa_project_currentVersionId_idx" ON "jsa_project"("currentVersionId");

-- CreateIndex
CREATE INDEX "jsa_project_approvalStatus_idx" ON "jsa_project"("approvalStatus");

-- CreateIndex
CREATE INDEX "jsa_project_isDeleted_idx" ON "jsa_project"("isDeleted");

-- CreateIndex
CREATE INDEX "jsa_project_createdBy_idx" ON "jsa_project"("createdBy");

-- CreateIndex
CREATE INDEX "jsa_project_updatedBy_idx" ON "jsa_project"("updatedBy");

-- CreateIndex
CREATE INDEX "jsa_project_deletedBy_idx" ON "jsa_project"("deletedBy");

-- CreateIndex
CREATE INDEX "jsa_project_approvedBy_idx" ON "jsa_project"("approvedBy");

-- CreateIndex
CREATE INDEX "jsa_project_rejectedBy_idx" ON "jsa_project"("rejectedBy");

-- CreateIndex
CREATE UNIQUE INDEX "jsa_apd_jsaProjectId_key" ON "jsa_apd"("jsaProjectId");

-- CreateIndex
CREATE INDEX "jsa_project_versions_hiracVersionId_idx" ON "jsa_project_versions"("hiracVersionId");

-- CreateIndex
CREATE INDEX "jsa_project_versions_jsaId_idx" ON "jsa_project_versions"("jsaId");

-- CreateIndex
CREATE INDEX "jsa_entries_jsaProjectVersionId_idx" ON "jsa_entries"("jsaProjectVersionId");

-- CreateIndex
CREATE INDEX "jsa_bahaya_jsaEntryId_idx" ON "jsa_bahaya"("jsaEntryId");

-- CreateIndex
CREATE INDEX "jsa_penanggulangan_jsaBahayaId_idx" ON "jsa_penanggulangan"("jsaBahayaId");

-- CreateIndex
CREATE INDEX "worker_vendors_vendorId_idx" ON "worker_vendors"("vendorId");

-- CreateIndex
CREATE UNIQUE INDEX "certification_programs_name_key" ON "certification_programs"("name");

-- CreateIndex
CREATE UNIQUE INDEX "certification_program_modules_programId_moduleId_key" ON "certification_program_modules"("programId", "moduleId");

-- CreateIndex
CREATE UNIQUE INDEX "vendor_certifications_certNumber_key" ON "vendor_certifications"("certNumber");

-- CreateIndex
CREATE INDEX "vendor_certifications_vendorId_idx" ON "vendor_certifications"("vendorId");

-- CreateIndex
CREATE INDEX "vendor_certifications_status_idx" ON "vendor_certifications"("status");

-- CreateIndex
CREATE UNIQUE INDEX "_HiracToJsaProject_AB_unique" ON "_HiracToJsaProject"("A", "B");

-- CreateIndex
CREATE INDEX "_HiracToJsaProject_B_index" ON "_HiracToJsaProject"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_HiracToVendor_AB_unique" ON "_HiracToVendor"("A", "B");

-- CreateIndex
CREATE INDEX "_HiracToVendor_B_index" ON "_HiracToVendor"("B");

-- CreateIndex
CREATE INDEX "hiracs_isActive_idx" ON "hiracs"("isActive");

-- CreateIndex
CREATE INDEX "hiracs_status_idx" ON "hiracs"("status");

-- CreateIndex
CREATE INDEX "hiracs_kategori_idx" ON "hiracs"("kategori");

-- CreateIndex
CREATE INDEX "hiracs_penilaianAwalTingkatRisiko_idx" ON "hiracs"("penilaianAwalTingkatRisiko");

-- CreateIndex
CREATE INDEX "projects_status_idx" ON "projects"("status");

-- CreateIndex
CREATE INDEX "projects_approvalStatus_idx" ON "projects"("approvalStatus");

-- CreateIndex
CREATE INDEX "projects_unitKerja_idx" ON "projects"("unitKerja");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_versions" ADD CONSTRAINT "project_versions_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_versions" ADD CONSTRAINT "project_versions_submittedBy_fkey" FOREIGN KEY ("submittedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_versions" ADD CONSTRAINT "project_versions_reviewedBy_fkey" FOREIGN KEY ("reviewedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "version_approvals" ADD CONSTRAINT "version_approvals_projectVersionId_fkey" FOREIGN KEY ("projectVersionId") REFERENCES "project_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "version_approvals" ADD CONSTRAINT "version_approvals_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hirac_versions" ADD CONSTRAINT "hirac_versions_projectVersionId_fkey" FOREIGN KEY ("projectVersionId") REFERENCES "project_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hirac_versions" ADD CONSTRAINT "hirac_versions_hiracId_fkey" FOREIGN KEY ("hiracId") REFERENCES "hiracs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jsa_project" ADD CONSTRAINT "jsa_project_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jsa_project" ADD CONSTRAINT "jsa_project_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jsa_project" ADD CONSTRAINT "jsa_project_deletedBy_fkey" FOREIGN KEY ("deletedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jsa_project" ADD CONSTRAINT "jsa_project_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jsa_project" ADD CONSTRAINT "jsa_project_rejectedBy_fkey" FOREIGN KEY ("rejectedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jsa_apd" ADD CONSTRAINT "jsa_apd_jsaProjectId_fkey" FOREIGN KEY ("jsaProjectId") REFERENCES "jsa_project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jsa_project_versions" ADD CONSTRAINT "jsa_project_versions_hiracVersionId_fkey" FOREIGN KEY ("hiracVersionId") REFERENCES "hirac_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jsa_project_versions" ADD CONSTRAINT "jsa_project_versions_jsaId_fkey" FOREIGN KEY ("jsaId") REFERENCES "jsa_project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jsa_project_versions" ADD CONSTRAINT "jsa_project_versions_submittedBy_fkey" FOREIGN KEY ("submittedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jsa_project_versions" ADD CONSTRAINT "jsa_project_versions_reviewedBy_fkey" FOREIGN KEY ("reviewedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jsa_version_approvals" ADD CONSTRAINT "jsa_version_approvals_jsaProjectVersionId_fkey" FOREIGN KEY ("jsaProjectVersionId") REFERENCES "jsa_project_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jsa_version_approvals" ADD CONSTRAINT "jsa_version_approvals_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jsa_entries" ADD CONSTRAINT "jsa_entries_jsaProjectVersionId_fkey" FOREIGN KEY ("jsaProjectVersionId") REFERENCES "jsa_project_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jsa_bahaya" ADD CONSTRAINT "jsa_bahaya_jsaEntryId_fkey" FOREIGN KEY ("jsaEntryId") REFERENCES "jsa_entries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jsa_penanggulangan" ADD CONSTRAINT "jsa_penanggulangan_jsaBahayaId_fkey" FOREIGN KEY ("jsaBahayaId") REFERENCES "jsa_bahaya"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jsas" ADD CONSTRAINT "jsas_jsaProjectId_fkey" FOREIGN KEY ("jsaProjectId") REFERENCES "jsa_project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jsa_versions" ADD CONSTRAINT "jsa_versions_jsaProjectVersionId_fkey" FOREIGN KEY ("jsaProjectVersionId") REFERENCES "jsa_project_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendors" ADD CONSTRAINT "vendors_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendors" ADD CONSTRAINT "vendors_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendors" ADD CONSTRAINT "vendors_deletedBy_fkey" FOREIGN KEY ("deletedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendors" ADD CONSTRAINT "vendors_certificationProgramId_fkey" FOREIGN KEY ("certificationProgramId") REFERENCES "certification_programs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "worker_vendors" ADD CONSTRAINT "worker_vendors_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "worker_vendors" ADD CONSTRAINT "worker_vendors_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "worker_vendors" ADD CONSTRAINT "worker_vendors_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "worker_vendors" ADD CONSTRAINT "worker_vendors_deletedBy_fkey" FOREIGN KEY ("deletedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certification_programs" ADD CONSTRAINT "certification_programs_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certification_programs" ADD CONSTRAINT "certification_programs_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certification_program_modules" ADD CONSTRAINT "certification_program_modules_programId_fkey" FOREIGN KEY ("programId") REFERENCES "certification_programs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certification_program_modules" ADD CONSTRAINT "certification_program_modules_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "modules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_certifications" ADD CONSTRAINT "vendor_certifications_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_certifications" ADD CONSTRAINT "vendor_certifications_programId_fkey" FOREIGN KEY ("programId") REFERENCES "certification_programs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_certifications" ADD CONSTRAINT "vendor_certifications_revokedBy_fkey" FOREIGN KEY ("revokedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_HiracToJsaProject" ADD CONSTRAINT "_HiracToJsaProject_A_fkey" FOREIGN KEY ("A") REFERENCES "hiracs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_HiracToJsaProject" ADD CONSTRAINT "_HiracToJsaProject_B_fkey" FOREIGN KEY ("B") REFERENCES "jsa_project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_HiracToVendor" ADD CONSTRAINT "_HiracToVendor_A_fkey" FOREIGN KEY ("A") REFERENCES "hiracs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_HiracToVendor" ADD CONSTRAINT "_HiracToVendor_B_fkey" FOREIGN KEY ("B") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;
