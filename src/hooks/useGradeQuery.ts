import { fetcher } from "@/lib/fetcher";
import { useQuery } from "@tanstack/react-query";
import { GradeQuerySchema } from "@/schemas/grade.schema";
import { Grade, Prisma } from "@prisma/client";

type UseGradesParams = {
  page?: number;
  limit?: number;
  name?: string;
  studentTypeId?: string;
  gradeYear?: number;
  sort?: string;
  order?: "asc" | "desc";
};

export type GradeWithStudentType = Prisma.GradeGetPayload<{
  include: { studentType: true };
}>;

type GradesResponse = {
  data: GradeWithStudentType[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
};

type SingleGradeResponse = {
  data: Grade & {
    studentType?: {
      name: string;
    };
  };
};

export function useGrades(params: UseGradesParams = {}) {
  const {
    page = 1,
    limit = 10,
    name,
    studentTypeId,
    gradeYear,
    sort,
    order,
  } = params;

  const query = GradeQuerySchema.parse({
    page,
    limit,
    name,
    studentTypeId,
    gradeYear,
    sort,
    order,
  });
  const searchParams = new URLSearchParams(
    Object.entries(query).reduce((acc, [key, value]) => {
      if (value !== undefined) {
        acc[key] = String(value);
      }
      return acc;
    }, {} as Record<string, string>)
  ).toString();

  return useQuery<GradesResponse>({
    queryKey: [
      "grades",
      page,
      limit,
      name,
      studentTypeId,
      gradeYear,
      sort,
      order,
    ],
    queryFn: async () =>
      await fetcher<GradesResponse>(`/api/grades?${searchParams}`),
  });
}

export function useGrade(gradeId: string) {
  return useQuery<Grade & { studentType?: { name: string } }>({
    queryKey: ["grade", gradeId],
    queryFn: async () =>
      await fetcher<SingleGradeResponse>(`/api/grades/${gradeId}`).then(
        (res) => res.data
      ),
    enabled: !!gradeId,
  });
}
