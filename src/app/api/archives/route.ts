// src/app/api/archives/route.ts
import { NextRequest, NextResponse } from "next/server";
import { withBranchAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Archive } from "@prisma/client";

type FormattedArchive = {
  archiveId: string;
  classId: string;
  teacherName: string | null;
  studentName: string | null;
  subjectName: string | null;
  boothName: string | null;
  branchName: string | null;
  classTypeName: string | null;
  enrolledStudents: any | null;
  date: Date;
  startTime: Date;
  endTime: Date;
  duration: number | null;
  notes: string | null;
  archivedAt: Date;
};

// Helper function to format archive response
const formatArchive = (archive: Archive): FormattedArchive => ({
  archiveId: archive.archiveId,
  classId: archive.classId,
  teacherName: archive.teacherName,
  studentName: archive.studentName,
  subjectName: archive.subjectName,
  boothName: archive.boothName,
  branchName: archive.branchName,
  classTypeName: archive.classTypeName,
  enrolledStudents: archive.enrolledStudents,
  date: archive.date,
  startTime: archive.startTime,
  endTime: archive.endTime,
  duration: archive.duration,
  notes: archive.notes,
  archivedAt: archive.archivedAt,
});

// GET - List archives with pagination and filters
export const GET = withBranchAccess(
  ["ADMIN", "STAFF"],
  async (request: NextRequest) => {
    try {
      // Parse query parameters
      const url = new URL(request.url);
      const params = Object.fromEntries(url.searchParams.entries());

      const page = parseInt(params.page || "1", 10);
      const limit = parseInt(params.limit || "25", 10);
      const teacherName = params.teacherName || undefined;
      const studentName = params.studentName || undefined;
      const subjectName = params.subjectName || undefined;
      const dateFrom = params.dateFrom ? new Date(params.dateFrom) : undefined;
      const dateTo = params.dateTo ? new Date(params.dateTo) : undefined;
      const branchName = params.branchName || undefined;

      // Build filter conditions
      const where: any = {};

      if (teacherName) {
        where.teacherName = {
          contains: teacherName,
          mode: "insensitive",
        };
      }

      if (studentName) {
        where.studentName = {
          contains: studentName,
          mode: "insensitive",
        };
      }

      if (subjectName) {
        where.subjectName = {
          contains: subjectName,
          mode: "insensitive",
        };
      }

      if (branchName) {
        where.branchName = {
          contains: branchName,
          mode: "insensitive",
        };
      }

      if (dateFrom || dateTo) {
        where.date = {};
        if (dateFrom) where.date.gte = dateFrom;
        if (dateTo) where.date.lte = dateTo;
      }

      // Calculate pagination
      const skip = (page - 1) * limit;

      // Fetch total count
      const total = await prisma.archive.count({ where });

      // Fetch archives
      const archives = await prisma.archive.findMany({
        where,
        skip,
        take: limit,
        orderBy: { archivedAt: "desc" },
      });

      // Format archives
      const formattedArchives = archives.map(formatArchive);

      return NextResponse.json({
        data: formattedArchives,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      console.error("Error fetching archives:", error);
      return NextResponse.json(
        { error: "アーカイブの取得に失敗しました" }, // "Failed to fetch archives"
        { status: 500 }
      );
    }
  }
);