// ─── Types ────────────────────────────────────────────────────────────────────

export interface CreateCertificationProgramData {
  name: string;
  description?: string;
  validityDays?: number;
  moduleIds?: string[];
}

export interface UpdateCertificationProgramData {
  name?: string;
  description?: string;
  validityDays?: number;
  moduleIds?: string[];
  isActive?: boolean;
}

export interface AssignModulesData {
  moduleIds: string[];
}

export interface AssignVendorProgramData {
  certificationProgramId: string;
}

export interface RevokeCertificationData {
  reason: string;
}
