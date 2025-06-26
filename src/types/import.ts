export enum ImportMode {
  CREATE_ONLY = "CREATE_ONLY",
  UPDATE_ONLY = "UPDATE_ONLY", 
  CREATE_OR_UPDATE = "CREATE_OR_UPDATE",
  DELETE = "DELETE"
}

export const importModeLabels: Record<ImportMode, string> = {
  [ImportMode.CREATE_ONLY]: "新規作成のみ",
  [ImportMode.UPDATE_ONLY]: "更新のみ",
  [ImportMode.CREATE_OR_UPDATE]: "新規作成・更新",
  [ImportMode.DELETE]: "削除"
};

export const importModeDescriptions: Record<ImportMode, string> = {
  [ImportMode.CREATE_ONLY]: "既存のレコードはスキップし、新規レコードのみ作成します",
  [ImportMode.UPDATE_ONLY]: "既存のレコードのみ更新し、新規レコードはスキップします", 
  [ImportMode.CREATE_OR_UPDATE]: "新規レコードは作成し、既存レコードは更新します",
  [ImportMode.DELETE]: "指定されたレコードを削除します"
};