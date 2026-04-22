// ─── Types ─────────────────────────────────────────────────────────────────

export interface CreateJsaApdData {
  safetyHelmet?: boolean;
  safetyShoes?: boolean;
  gloves?: boolean;
  safetyGlasses?: boolean;
  safetyVest?: boolean;
  safetyBodyHarness?: boolean;
  others?: string;
}

export interface CreateJsaData {
  jenisKegiatan: string;
  lokasiKegiatan?: string;
  tanggalDibuat?: string;
  referensiHirarc?: string;
  hiracId?: string;
  pelaksanaUtama?: string;
  hseInCharge?: string;
  apd?: CreateJsaApdData;
}

export interface JsaCreator {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface JsaVersionSummary {
  versionNumber: number;
  status: string;
  submittedAt: string | null;
}

export interface JsaListItem {
  id: string;
  noJsa: string | null;
  jenisKegiatan: string;
  lokasiKegiatan: string | null;
  tanggalDibuat: string | null;
  revisiKe: number;
  approvalStatus: string;
  createdAt: string;
  updatedAt: string;
  creator: JsaCreator;
  versions: JsaVersionSummary[];
}

export interface JsaApdData {
  id: string;
  safetyHelmet: boolean;
  safetyShoes: boolean;
  gloves: boolean;
  safetyGlasses: boolean;
  safetyVest: boolean;
  safetyBodyHarness: boolean;
  others: string | null;
  jsaProjectId: string;
  createdAt: string;
  updatedAt: string;
}

export interface JsaApprover {
  id: string;
  firstName: string;
  lastName: string;
}

export interface JsaApprovalStep {
  id: string;
  stepOrder: number;
  requiredRole: string;
  status: string;
  approver: JsaApprover | null;
  createdAt: string;
  updatedAt: string;
}

export interface JsaVersionDetail {
  id: string;
  versionNumber: number;
  label: string | null;
  status: string;
  submittedBy: string | null;
  submittedAt: string | null;
  approvalSteps: JsaApprovalStep[];
  createdAt: string;
  updatedAt: string;
}

export interface JsaDetail {
  id: string;
  noJsa: string | null;
  jenisKegiatan: string;
  lokasiKegiatan: string | null;
  tanggalDibuat: string | null;
  pelaksanaUtama: string | null;
  hseInCharge: string | null;
  referensiHirarc: string | null;
  revisiKe: number;
  approvalStatus: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  creator: JsaCreator;
  apd: JsaApdData | null;
  versions: JsaVersionDetail[];
}
