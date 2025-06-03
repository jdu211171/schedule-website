// src/hooks/useTeachersBySubjectPreference.ts
import { fetcher } from "@/lib/fetcher";
import { useQuery } from "@tanstack/react-query";

export type TeacherBySubjectPreference = {
  teacherId: string;
  userId: string;
  name: string;
  kanaName: string | null;
  email: string | null;
  status: string;
};

interface TeachersBySubjectPreferenceResponse {
  data: TeacherBySubjectPreference[];
}

export function useTeachersBySubjectPreference(
  subjectId?: string,
  subjectTypeIds?: string[]
) {
  const enabled = !!subjectId && !!subjectTypeIds && subjectTypeIds.length > 0;

  return useQuery<TeacherBySubjectPreference[]>({
    queryKey: ["teachers", "bySubjectPreference", subjectId, subjectTypeIds],
    queryFn: async () => {
      const params = new URLSearchParams({
        subjectId: subjectId!,
        subjectTypeIds: subjectTypeIds!.join(","),
      });

      const response = await fetcher<TeachersBySubjectPreferenceResponse>(
        `/api/teachers/by-subject-preference?${params}`
      );
      return response.data;
    },
    enabled,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
