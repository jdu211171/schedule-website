export interface BranchSettings {
  id: string | null;
  branchId: string | null;
  archiveRetentionMonths: number;
  createdAt?: Date;
  updatedAt?: Date;
  isDefault?: boolean;
  isGlobal?: boolean;
}

export interface BranchSettingsUpdatePayload {
  archiveRetentionMonths: number;
}
