"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { ClassSeriesUpdate } from "@/schemas/class-series.schema";

export type ClassSeries = {
  seriesId: string;
  branchId: string | null;
  teacherId: string | null;
  teacherName?: string | null;
  studentId: string | null;
  studentName?: string | null;
  subjectId: string | null;
  subjectName?: string | null;
  classTypeId: string | null;
  classTypeName?: string | null;
  boothId: string | null;
  startDate: string; // YYYY-MM-DD
  endDate: string | null; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  duration: number | null;
  daysOfWeek: number[];
  status: string;
  lastGeneratedThrough: string | null; // YYYY-MM-DD
  conflictPolicy: Record<string, any> | null;
  conflictCount?: number;
  notes: string | null;
  createdAt: string; // ISO
  updatedAt: string; // ISO
};

export type ClassSeriesFilters = {
  studentId?: string;
  teacherId?: string;
  status?: string;
  branchId?: string;
};

export function useClassSeriesList(filters: ClassSeriesFilters = {}) {
  return useQuery<ClassSeries[]>({
    queryKey: ["class-series", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.studentId) params.set("studentId", filters.studentId);
      if (filters.teacherId) params.set("teacherId", filters.teacherId);
      if (filters.status) params.set("status", filters.status);
      if (filters.branchId) params.set("branchId", filters.branchId);

      const res = await fetch(`/api/class-series?${params.toString()}`, {
        headers: {
          "X-Selected-Branch": localStorage.getItem("selectedBranchId") || "",
        },
      });
      if (!res.ok) throw new Error("Failed to load class series");
      return res.json();
    },
    staleTime: 30_000,
  });
}

export function useClassSeries(seriesId: string | undefined) {
  return useQuery<ClassSeries | null>({
    enabled: !!seriesId,
    queryKey: ["class-series", seriesId],
    queryFn: async () => {
      if (!seriesId) return null;
      const res = await fetch(`/api/class-series/${seriesId}`, {
        headers: {
          "X-Selected-Branch": localStorage.getItem("selectedBranchId") || "",
        },
      });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to load series");
      return res.json();
    },
    staleTime: 30_000,
  });
}

export function useUpdateClassSeries(seriesId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["class-series", seriesId, "update"],
    mutationFn: async (payload: ClassSeriesUpdate) => {
      const res = await fetch(`/api/class-series/${seriesId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "X-Selected-Branch": localStorage.getItem("selectedBranchId") || "",
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to update class series");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["class-series", seriesId] });
      qc.invalidateQueries({ queryKey: ["class-series"] });
    },
  });
}

export function useExtendClassSeries(seriesId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["class-series", seriesId, "extend"],
    mutationFn: async (months: number = 1) => {
      const res = await fetch(`/api/class-series/${seriesId}/extend`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Selected-Branch": localStorage.getItem("selectedBranchId") || "",
        },
        body: JSON.stringify({ months }),
      });
      if (!res.ok) throw new Error("Failed to extend class series");
      return res.json() as Promise<{ count: number; skipped: number }>;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["class-series", seriesId] });
    },
  });
}

export function useDeleteClassSeries(seriesId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["class-series", seriesId, "delete"],
    mutationFn: async () => {
      const res = await fetch(`/api/class-series/${seriesId}`, {
        method: "DELETE",
        headers: {
          "X-Selected-Branch": localStorage.getItem("selectedBranchId") || "",
        },
      });
      if (!res.ok) throw new Error("Failed to delete class series");
      return res.json() as Promise<{ deletedSeriesId: string }>;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["class-series"] });
    },
  });
}

export type ClassSeriesSummary = {
  totalRegular: number;
  bySubject: Array<{ subjectId: string; count: number }>;
  bySeries?: Array<{
    seriesId: string;
    teacherId: string | null;
    teacherName: string | null;
    studentId: string | null;
    studentName: string | null;
    subjectId: string | null;
    subjectName: string | null;
    daysOfWeek: number[];
    startTime: string; // HH:mm
    endTime: string;   // HH:mm
    takenCountSoFar: number;
  }>;
};

export function useClassSeriesSummary(studentId: string | undefined, days: number = 90) {
  return useQuery<ClassSeriesSummary>({
    enabled: !!studentId,
    queryKey: ["class-series", "summary", studentId, days],
    queryFn: async () => {
      if (!studentId) throw new Error("studentId required");
      const params = new URLSearchParams({ studentId, days: String(days) });
      const res = await fetch(`/api/class-series/summary?${params.toString()}`, {
        headers: {
          "X-Selected-Branch": localStorage.getItem("selectedBranchId") || "",
        },
      });
      if (!res.ok) throw new Error("Failed to load class series summary");
      return res.json();
    },
    staleTime: 30_000,
  });
}

export function useClassSeriesSummaryByTeacher(teacherId: string | undefined, days: number = 90) {
  return useQuery<ClassSeriesSummary>({
    enabled: !!teacherId,
    queryKey: ["class-series", "summary", "teacher", teacherId, days],
    queryFn: async () => {
      if (!teacherId) throw new Error("teacherId required");
      const params = new URLSearchParams({ teacherId, days: String(days) });
      const res = await fetch(`/api/class-series/summary?${params.toString()}`, {
        headers: {
          "X-Selected-Branch": localStorage.getItem("selectedBranchId") || "",
        },
      });
      if (!res.ok) throw new Error("Failed to load class series summary (teacher)");
      return res.json();
    },
    staleTime: 30_000,
  });
}

export type SpecialSummary = { takenSoFar: number; upcomingCount: number };

export function useSpecialSummary(params: { studentId?: string; teacherId?: string }) {
  const key = params.studentId ? ["special-summary", "student", params.studentId] : ["special-summary", "teacher", params.teacherId];
  const qs = new URLSearchParams();
  if (params.studentId) qs.set("studentId", params.studentId);
  if (params.teacherId) qs.set("teacherId", String(params.teacherId));
  return useQuery<SpecialSummary>({
    enabled: !!(params.studentId || params.teacherId),
    queryKey: key,
    queryFn: async () => {
      const res = await fetch(`/api/class-sessions/special-summary?${qs.toString()}`, {
        headers: {
          "X-Selected-Branch": localStorage.getItem("selectedBranchId") || "",
        },
      });
      if (!res.ok) throw new Error("Failed to load special summary");
      return res.json();
    },
    staleTime: 30_000,
  });
}
