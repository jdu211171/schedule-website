// src/app/api/archives/search/route.ts
import { NextRequest, NextResponse } from "next/server";
import { withBranchAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Archive } from "@prisma/client";

// POST - Advanced search with filters for enrolled students
export const POST = withBranchAccess(
  ["ADMIN", "STAFF"],
  async (request: NextRequest) => {
    try {
      const body = await request.json();

      const {
        page = 1,
        limit = 25,
        teacherName,
        studentName,
        subjectName,
        branchName,
        classTypeName,
        dateFrom,
        dateTo,
        enrolledStudentName,
        includeGroupClasses,
      } = body;

      // Build where clause
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

      if (classTypeName) {
        where.classTypeName = {
          contains: classTypeName,
          mode: "insensitive",
        };
      }

      if (dateFrom || dateTo) {
        where.date = {};
        if (dateFrom) where.date.gte = new Date(dateFrom);
        if (dateTo) where.date.lte = new Date(dateTo);
      }

      // Handle enrolled student search (JSON field)
      if (enrolledStudentName) {
        where.enrolledStudents = {
          path: ["$[*].student_name"],
          string_contains: enrolledStudentName,
        };
      }

      // Filter by whether class has enrolled students
      if (includeGroupClasses !== undefined) {
        if (includeGroupClasses) {
          where.enrolledStudents = { not: null };
        } else {
          where.enrolledStudents = null;
        }
      }

      // Calculate pagination
      const skip = (page - 1) * limit;

      // Get total count
      const total = await prisma.archive.count({ where });

      // Fetch archives
      const archives = await prisma.archive.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ date: "desc" }, { startTime: "desc" }],
      });

      // Format response
      const formattedArchives = archives.map((archive: Archive) => ({
        archiveId: archive.archiveId,
        classId: archive.classId,
        seriesId: (archive as any).seriesId ?? null,
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
        // Add derived fields
        isGroupClass: archive.enrolledStudents !== null,
        enrolledStudentCount: archive.enrolledStudents
          ? (archive.enrolledStudents as any[]).length
          : 0,
      }));

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
      console.error("Error searching archives:", error);
      return NextResponse.json(
        { error: "アーカイブの検索に失敗しました" }, // "Failed to search archives"
        { status: 500 }
      );
    }
  }
);
