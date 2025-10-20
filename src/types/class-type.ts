export interface ClassTypeDTO {
  classTypeId: string;
  name: string;
  parentId: string | null;
  order: number | null;
  color: string | null;
}

export type ClassTypeOption = { value: string; label: string };
