export enum ImportMode {
  CREATE_ONLY = "CREATE_ONLY",
  UPDATE_ONLY = "UPDATE_ONLY"
}

export const importModeLabels: Record<ImportMode, string> = {
  [ImportMode.CREATE_ONLY]: "新規作成のみ",
  [ImportMode.UPDATE_ONLY]: "更新のみ"
};

export const importModeDescriptions: Record<ImportMode, string> = {
  [ImportMode.CREATE_ONLY]: "既存のレコードはスキップし、新規レコードのみ作成します",
  [ImportMode.UPDATE_ONLY]: "既存のレコードのみ更新し、新規レコードはスキップします"
};
