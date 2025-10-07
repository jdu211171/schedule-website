import type { ExtendedClassSessionWithRelations } from '@/hooks/useClassSessionQuery';

export type Pos = { boothIndex: number; start: number; end: number };

const isCancelled = (s: ExtendedClassSessionWithRelations): boolean =>
  Boolean((s as unknown as { isCancelled?: boolean })?.isCancelled);

const overlaps = (a: Pos, b: Pos): boolean => !(b.end <= a.start || a.end <= b.start);

export function computeBoothOverlap(
  session: ExtendedClassSessionWithRelations,
  sessions: ExtendedClassSessionWithRelations[],
  sessionPos: Map<string, Pos>
): boolean {
  if (isCancelled(session)) return false;
  const pos = sessionPos.get(String(session.classId));
  if (!pos) return false;
  return sessions.some((s2) => {
    if (s2.classId === session.classId) return false;
    if (isCancelled(s2)) return false;
    const p2 = sessionPos.get(String(s2.classId));
    return !!p2 && p2.boothIndex === pos.boothIndex && overlaps(pos, p2);
  });
}

export function computeTeacherOverlap(
  session: ExtendedClassSessionWithRelations,
  sessions: ExtendedClassSessionWithRelations[],
  sessionPos: Map<string, Pos>
): boolean {
  if (isCancelled(session)) return false;
  if (!session.teacherId) return false;
  const p1 = sessionPos.get(String(session.classId));
  if (!p1) return false;
  return sessions.some((s2) => {
    if (!s2.teacherId || s2.classId === session.classId) return false;
    if (isCancelled(s2)) return false;
    if (s2.teacherId !== session.teacherId) return false;
    const p2 = sessionPos.get(String(s2.classId));
    return !!p2 && overlaps(p1, p2);
  });
}

export function computeStudentOverlap(
  session: ExtendedClassSessionWithRelations,
  sessions: ExtendedClassSessionWithRelations[],
  sessionPos: Map<string, Pos>
): boolean {
  if (isCancelled(session)) return false;
  if (!session.studentId) return false;
  const p1 = sessionPos.get(String(session.classId));
  if (!p1) return false;
  return sessions.some((s2) => {
    if (!s2.studentId || s2.classId === session.classId) return false;
    if (isCancelled(s2)) return false;
    if (s2.studentId !== session.studentId) return false;
    const p2 = sessionPos.get(String(s2.classId));
    return !!p2 && overlaps(p1, p2);
  });
}
