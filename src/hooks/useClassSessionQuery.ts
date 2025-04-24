import { useQuery } from "@tanstack/react-query";
import { getClassSessions } from "@/actions/class-session/read";

export function useClassSessions({
  startDate,
  endDate,
  teacherId,
  studentId,
}: {
  startDate?: Date;
  endDate?: Date;
  teacherId?: string;
  studentId?: string;
}) {
  return useQuery({
    queryKey: ["classSessions", startDate, endDate, teacherId, studentId],
    queryFn: () =>
      getClassSessions({ startDate, endDate, teacherId, studentId }),
  });
}

export function useClassSession(classId: string) {
  return useQuery({
    queryKey: ["classSession", classId],
    queryFn: () =>
      getClassSessions({}).then((sessions) =>
        sessions.find((s) => s.classId === classId)
      ),
    enabled: !!classId,
  });
}
