"use server";

import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireAuth } from "../auth-actions";
import { generateClassSessionsSchema } from "@/schemas/class-session.schema";
import { eachDayOfInterval } from "date-fns";

export async function generateClassSessions(
  data: z.infer<typeof generateClassSessionsSchema>
) {
  await requireAuth();

  const parsed = generateClassSessionsSchema.safeParse(data);
  if (!parsed.success) {
    throw new Error("Invalid data provided: " + parsed.error.message);
  }

  const { startDate, endDate } = parsed.data;

  // Find active templates within the date range
  const templates = await prisma.regularClassTemplate.findMany({
    where: {
      startDate: { lte: endDate },
      endDate: { gte: startDate },
    },
    include: {
      templateStudentAssignments: true,
    },
  });

  const dayMap = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];

  for (const template of templates) {
    const dayIndex = dayMap.indexOf(template.dayOfWeek || "");
    if (dayIndex === -1) continue; // Skip if dayOfWeek is invalid

    // Get all dates in the range matching the dayOfWeek
    const dates = eachDayOfInterval({ start: startDate, end: endDate }).filter(
      (date) => date.getDay() === dayIndex
    );

    for (const date of dates) {
      // Skip if a ClassSession already exists for this date and template
      const existing = await prisma.classSession.findFirst({
        where: { date, templateId: template.templateId },
      });
      if (existing) continue;

      await prisma.$transaction(async (tx) => {
        // Create ClassSession
        const classSession = await tx.classSession.create({
          data: {
            date,
            startTime: template.startTime,
            endTime: template.endTime,
            teacherId: template.teacherId,
            subjectId: template.subjectId,
            boothId: template.boothId,
            templateId: template.templateId,
          },
        });

        // Assign student (assuming one per template for one-to-one)
        const assignment = template.templateStudentAssignments[0];
        if (assignment) {
          await tx.studentClassEnrollment.create({
            data: {
              classId: classSession.classId,
              studentId: assignment.studentId,
              status: "enrolled",
            },
          });
        }
      });
    }
  }

  return { message: "Class sessions generated successfully" };
}
