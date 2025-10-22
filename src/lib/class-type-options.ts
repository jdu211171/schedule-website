import { fetcher } from "@/lib/fetcher";
import { ClassTypeDTO, ClassTypeOption } from "@/types/class-type";

type ClassTypesResponse = {
  data: ClassTypeDTO[];
  pagination?: { total: number; page: number; limit: number; pages: number };
};

export async function fetchClassTypeOptions(): Promise<ClassTypeOption[]> {
  const params = new URLSearchParams({
    page: "1",
    limit: "200",
    sortBy: "order",
    sortOrder: "asc",
    includeChildren: "false",
  });
  const res = await fetcher<ClassTypesResponse>(
    `/api/class-types?${params.toString()}`
  );
  // Preserve server ordering (order field, then name) — do not resort here
  const arr = (res.data || []).map((ct) => ({
    value: ct.classTypeId,
    label: ct.name,
  }));
  return arr;
}
