// ─── Types ─────────────────────────────────────────────────────────────────

export interface CreatePtwData {
  judulPekerjaan: string;
  jsaProjectId: string;
  lokasiPekerjaan?: string;
  tanggalMulai?: string;
  tanggalSelesai?: string;
  keteranganTambahan?: string;
}

export interface JsaProjectSummary {
  id: string;
  noJsa: string | null;
  jenisKegiatan: string;
  approvalStatus: string;
}

export interface PtwCreator {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface PtwVersionSummary {
  versionNumber: number;
  status: string;
  submittedAt: string | null;
}

export interface PtwListItem {
  id: string;
  noPtw: string | null;
  judulPekerjaan: string;
  lokasiPekerjaan: string | null;
  tanggalMulai: string | null;
  tanggalSelesai: string | null;
  approvalStatus: string;
  createdAt: string;
  updatedAt: string;
  creator: PtwCreator;
  jsaProject: JsaProjectSummary;
  versions: PtwVersionSummary[];
}

export interface PtwApprover {
  id: string;
  firstName: string;
  lastName: string;
}

export interface PtwApprovalStep {
  id: string;
  stepOrder: number;
  requiredRole: string;
  status: string;
  approver: PtwApprover | null;
  createdAt: string;
  updatedAt: string;
}

export interface PtwVersionDetail {
  id: string;
  versionNumber: number;
  label: string | null;
  status: string;
  submittedBy: string | null;
  submittedAt: string | null;
  approvalSteps: PtwApprovalStep[];
  createdAt: string;
  updatedAt: string;
}

export interface PtwDetail {
  id: string;
  noPtw: string | null;
  judulPekerjaan: string;
  lokasiPekerjaan: string | null;
  tanggalMulai: string | null;
  tanggalSelesai: string | null;
  approvalStatus: string;
  createdBy: string;
  keteranganTambahan: string | null;
  createdAt: string;
  updatedAt: string;
  creator: PtwCreator;
  jsaProject: JsaProjectSummary;
  versions: PtwVersionDetail[];
}
