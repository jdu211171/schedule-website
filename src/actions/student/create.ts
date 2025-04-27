"use server";

import prisma from "@/lib/prisma";
import { requireAuth } from "../auth-actions";
import { z } from "zod";
import {
  studentCreateSchema,
  StudentCreateInput,
} from "@/schemas/student.schema";
import { studentPreferencesSchema } from "@/schemas/student-preferences.schema";

const createStudentWithPreferenceSchema = z.object({
  student: studentCreateSchema,
  preferences: studentPreferencesSchema.optional(),
});
type CreateStudentWithPreferenceInput = z.infer<
  typeof createStudentWithPreferenceSchema
>;

export async function createStudentWithPreference(
  data: CreateStudentWithPreferenceInput
) {
  await requireAuth();

  const parsed = createStudentWithPreferenceSchema.safeParse(data);
  if (!parsed.success) throw new Error("Invalid data provided");

  const { student: studentData, preferences } = parsed.data;

  const { username, password, ...rest } = studentData;
  let userId: string | null = null;

  if (username && password) {
    const user = await prisma.user.create({
      data: {
        name: rest.name,
        username,
        passwordHash: password,
        role: "STUDENT",
      },
    });
    userId = user.id;
  }

  type StudentCreateWithoutCred = Omit<
    StudentCreateInput,
    "username" | "password"
  >;

  // Transaction to create student and preferences
  return prisma.$transaction(async (tx) => {
    // Create the student
    const student = await tx.student.create({
      data: {
        ...(rest as StudentCreateWithoutCred),
        userId: userId || undefined,
      },
    });

    // Create preferences if provided
    if (preferences) {
      // Create the base preference record
      const preference = await tx.studentPreference.create({
        data: {
          studentId: student.studentId,
          classTypeId: preferences.classTypeId || null,
          notes: preferences.additionalNotes || null,
        },
      });

      // Create teacher preferences
      if (
        preferences.preferredTeachers &&
        preferences.preferredTeachers.length > 0
      ) {
        await Promise.all(
          preferences.preferredTeachers.map((teacherId) =>
            tx.studentPreferenceTeacher.create({
              data: {
                studentPreferenceId: preference.preferenceId,
                teacherId,
              },
            })
          )
        );
      }

      // Create subject preferences
      if (
        preferences.preferredSubjects &&
        preferences.preferredSubjects.length > 0
      ) {
        await Promise.all(
          preferences.preferredSubjects.map((subjectId) =>
            tx.studentPreferenceSubject.create({
              data: {
                studentPreferenceId: preference.preferenceId,
                subjectId,
              },
            })
          )
        );
      }

      // Create time slot preferences
      if (preferences.desiredTimes && preferences.desiredTimes.length > 0) {
        await Promise.all(
          preferences.desiredTimes.map((timeSlot) =>
            tx.studentPreferenceTimeSlot.create({
              data: {
                preferenceId: preference.preferenceId,
                dayOfWeek: timeSlot.dayOfWeek,
                startTime: timeSlot.startTime,
                endTime: timeSlot.endTime,
              },
            })
          )
        );
      }
    }

    // Return the student with preferences
    return tx.student.findUnique({
      where: { studentId: student.studentId },
      include: {
        StudentPreference: {
          include: {
            teachers: {
              include: {
                teacher: true,
              },
            },
            subjects: {
              include: {
                subject: true,
              },
            },
            timeSlots: true,
          },
        },
      },
    });
  });
}
