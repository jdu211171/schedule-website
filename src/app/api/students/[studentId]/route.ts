// src/app/api/students/[studentId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { withBranchAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { studentUpdateSchema } from "@/schemas/student.schema";
import { Student, StudentType, DayOfWeek } from "@prisma/client";

// Define a type for the student with includes
type StudentWithIncludes = Student & {
  studentType: StudentType | null;
  user: {
    username: string | null;
    email: string | null;
    passwordHash: string | null;
    branches?: {
      branch: {
        branchId: string;
        name: string;
      };
    }[];
    subjectPreferences?: {
      subjectId: string;
      subjectTypeId: string;
      subject: {
        subjectId: string;
        name: string;
      };
      subjectType: {
        subjectTypeId: string;
        name: string;
      };
    }[];
    availability?: {
      id: string;
      dayOfWeek: string | null;
      type: string;
      status: string;
      fullDay: boolean | null;
      startTime: Date | null;
      endTime: Date | null;
      date: Date | null;
      reason: string | null;
      notes: string | null;
    }[];
  };
  teacherPreferences?: {
    teacherId: string;
    subjectId: string;
    subjectTypeId: string;
    teacher: {
      teacherId: string;
      name: string;
    };
  }[];
  contactPhones?: {
    id: string;
    phoneType: string;
    phoneNumber: string;
    notes: string | null;
    order: number;
  }[];
};

// Define the return type for the formatted student
export type FormattedStudent = {
  studentId: string;
  userId: string;
  name: string;
  kanaName: string | null;
  studentTypeId: string | null;
  studentTypeName: string | null;
  maxYears: number | null;
  gradeYear: number | null;
  lineId: string | null;
  lineNotificationsEnabled: boolean | null;
  notes: string | null;
  status: string;
  username: string | null;
  email: string | null;
  password: string | null;
  branches: {
    branchId: string;
    name: string;
  }[];
  subjectPreferences: {
    subjectId: string;
    subjectTypeIds: string[];
    preferredTeacherIds?: string[];
  }[];
  regularAvailability: {
    dayOfWeek: string;
    timeSlots: {
      id: string;
      startTime: string;
      endTime: string;
    }[];
    fullDay: boolean;
  }[];
  exceptionalAvailability: {
    date: string;
    timeSlots: {
      id: string;
      startTime: string;
      endTime: string;
    }[];
    fullDay: boolean;
    reason?: string | null;
    notes?: string | null;
  }[];
  // School information
  schoolName: string | null;
  schoolType: string | null;
  // Exam information
  examCategory: string | null;
  examCategoryType: string | null;
  firstChoice: string | null;
  secondChoice: string | null;
  examDate: Date | null;
  // Contact information
  homePhone: string | null;
  parentPhone: string | null;
  studentPhone: string | null;
  parentEmail: string | null;
  // Personal information
  birthDate: Date | null;
  // Contact phones
  contactPhones: {
    id: string;
    phoneType: string;
    phoneNumber: string;
    notes: string | null;
    order: number;
  }[];
  createdAt: Date;
  updatedAt: Date;
};

// Helper function to format student response with proper typing
const formatStudent = (student: StudentWithIncludes): FormattedStudent => {
  // Group subject preferences by subjectId
  const subjectPreferencesMap = new Map<
    string,
    { subjectTypeIds: string[]; preferredTeacherIds: string[] }
  >();

  student.user.subjectPreferences?.forEach((pref) => {
    if (!subjectPreferencesMap.has(pref.subjectId)) {
      subjectPreferencesMap.set(pref.subjectId, {
        subjectTypeIds: [],
        preferredTeacherIds: [],
      });
    }
    subjectPreferencesMap
      .get(pref.subjectId)!
      .subjectTypeIds.push(pref.subjectTypeId);
  });

  // Add teacher preferences
  student.teacherPreferences?.forEach((pref) => {
    const subjectPref = subjectPreferencesMap.get(pref.subjectId);
    if (
      subjectPref &&
      !subjectPref.preferredTeacherIds.includes(pref.teacherId)
    ) {
      subjectPref.preferredTeacherIds.push(pref.teacherId);
    }
  });

  const subjectPreferences = Array.from(subjectPreferencesMap.entries()).map(
    ([subjectId, { subjectTypeIds, preferredTeacherIds }]) => ({
      subjectId,
      subjectTypeIds,
      preferredTeacherIds,
    })
  );

  // Process regular availability data
  const availabilityMap = new Map<
    string,
    NonNullable<typeof student.user.availability>
  >();

  student.user.availability?.forEach((avail) => {
    if (
      avail.type === "REGULAR" &&
      avail.status === "APPROVED" &&
      avail.dayOfWeek
    ) {
      if (!availabilityMap.has(avail.dayOfWeek)) {
        availabilityMap.set(avail.dayOfWeek, []);
      }
      availabilityMap.get(avail.dayOfWeek)!.push(avail);
    }
  });

  const regularAvailability = Array.from(availabilityMap.entries()).map(
    ([dayOfWeek, availabilities]) => {
      // Check if any availability for this day is full day
      const hasFullDay =
        availabilities?.some((avail) => avail.fullDay) || false;

      if (hasFullDay) {
        return {
          dayOfWeek,
          timeSlots: [],
          fullDay: true,
        };
      }

      // Process time slots
      const timeSlots =
        availabilities
          ?.filter(
            (avail) => !avail.fullDay && avail.startTime && avail.endTime
          )
          .map((avail) => ({
            id: avail.id,
            startTime: `${String(avail.startTime!.getUTCHours()).padStart(
              2,
              "0"
            )}:${String(avail.startTime!.getUTCMinutes()).padStart(2, "0")}`,
            endTime: `${String(avail.endTime!.getUTCHours()).padStart(
              2,
              "0"
            )}:${String(avail.endTime!.getUTCMinutes()).padStart(2, "0")}`,
          })) || [];

      return {
        dayOfWeek,
        timeSlots,
        fullDay: false,
      };
    }
  );

  // Process exceptional availability data - filter out past dates
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Set to start of day for comparison

  const exceptionalAvailability: FormattedStudent['exceptionalAvailability'] = [];

  student.user.availability?.forEach((avail) => {
    if (
      avail.type === "EXCEPTION" &&
      avail.status === "APPROVED" &&
      avail.date
    ) {
      // Skip past dates
      const availDate = new Date(avail.date);
      availDate.setHours(0, 0, 0, 0);
      if (availDate < today) {
        return; // Skip this entry
      }

      const dateStr = avail.date.toISOString().split('T')[0];

      // Check if we already have an entry for this date
      let dateEntry = exceptionalAvailability.find(ea => ea.date === dateStr);

      if (!dateEntry) {
        dateEntry = {
          date: dateStr,
          timeSlots: [],
          fullDay: false,
          reason: avail.reason,
          notes: avail.notes
        };
        exceptionalAvailability.push(dateEntry);
      }

      if (avail.fullDay) {
        dateEntry.fullDay = true;
        dateEntry.timeSlots = [];
      } else if (avail.startTime && avail.endTime && !dateEntry.fullDay) {
        dateEntry.timeSlots.push({
          id: avail.id,
          startTime: `${String(avail.startTime.getUTCHours()).padStart(2, "0")}:${String(avail.startTime.getUTCMinutes()).padStart(2, "0")}`,
          endTime: `${String(avail.endTime.getUTCHours()).padStart(2, "0")}:${String(avail.endTime.getUTCMinutes()).padStart(2, "0")}`
        });
      }
    }
  });

  return {
    studentId: student.studentId,
    userId: student.userId,
    name: student.name,
    kanaName: student.kanaName,
    studentTypeId: student.studentTypeId,
    studentTypeName: student.studentType?.name || null,
    maxYears: student.studentType?.maxYears || null,
    gradeYear: student.gradeYear,
    lineId: student.lineId,
    lineUserId: student.lineUserId,
    notes: student.notes,
    status: student.status,
    username: student.user.username,
    email: student.user.email,
    password: student.user.passwordHash,
    branches:
      student.user.branches?.map((ub) => ({
        branchId: ub.branch.branchId,
        name: ub.branch.name,
      })) || [],
    subjectPreferences,
    regularAvailability,
    exceptionalAvailability,
    // School information
    schoolName: student.schoolName,
    schoolType: student.schoolType,
    // Exam information
    examCategory: student.examCategory,
    examCategoryType: student.examCategoryType,
    firstChoice: student.firstChoice,
    secondChoice: student.secondChoice,
    examDate: student.examDate,
    // Contact information
    homePhone: student.homePhone,
    parentPhone: student.parentPhone,
    studentPhone: student.studentPhone,
    parentEmail: student.parentEmail,
    // Personal information
    birthDate: student.birthDate,
    // Contact phones
    contactPhones: student.contactPhones?.map(phone => ({
      id: phone.id,
      phoneType: phone.phoneType,
      phoneNumber: phone.phoneNumber,
      notes: phone.notes,
      order: phone.order,
    })) || [],
    createdAt: student.createdAt,
    updatedAt: student.updatedAt,
    lineNotificationsEnabled: student.lineNotificationsEnabled,
  };
};

// GET a specific student
export const GET = withBranchAccess(
  ["ADMIN", "STAFF"],
  async (request: NextRequest, session) => {
    const studentId = request.url.split("/").pop();

    if (!studentId) {
      return NextResponse.json(
        { error: "Student ID is required" },
        { status: 400 }
      );
    }

    const student = await prisma.student.findUnique({
      where: { studentId },
      include: {
        studentType: true,
        user: {
          select: {
            username: true,
            email: true,
            passwordHash: true,
            branches: {
              include: {
                branch: {
                  select: {
                    branchId: true,
                    name: true,
                  },
                },
              },
            },
            subjectPreferences: {
              select: {
                subjectId: true,
                subjectTypeId: true,
                subject: {
                  select: {
                    subjectId: true,
                    name: true,
                  },
                },
                subjectType: {
                  select: {
                    subjectTypeId: true,
                    name: true,
                  },
                },
              },
            },
            availability: {
              select: {
                id: true,
                dayOfWeek: true,
                type: true,
                status: true,
                fullDay: true,
                startTime: true,
                endTime: true,
                date: true,
                reason: true,
                notes: true,
              },
            },
          },
        },
        teacherPreferences: {
          select: {
            teacherId: true,
            subjectId: true,
            subjectTypeId: true,
            teacher: {
              select: {
                teacherId: true,
                name: true,
              },
            },
          },
        },
        contactPhones: {
          orderBy: { order: "asc" },
        },
      },
    });

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    // Format response using the helper function
    const formattedStudent = formatStudent(student);

    return NextResponse.json({
      data: [formattedStudent],
      pagination: {
        total: 1,
        page: 1,
        limit: 1,
        pages: 1,
      },
    });
  }
);

// PATCH - Update a student
export const PATCH = withBranchAccess(
  ["ADMIN", "STAFF"],
  async (request: NextRequest, session) => {
    try {
      const studentId = request.url.split("/").pop();
      if (!studentId) {
        return NextResponse.json(
          { error: "Student ID is required" },
          { status: 400 }
        );
      }

      const body = await request.json();

      // Validate request body
      const result = studentUpdateSchema.safeParse({ ...body, studentId });
      if (!result.success) {
        return NextResponse.json(
          { error: result.error.message },
          { status: 400 }
        );
      }

      // Check if student exists
      const existingStudent = await prisma.student.findUnique({
        where: { studentId },
        include: { user: true },
      });

      if (!existingStudent) {
        return NextResponse.json(
          { error: "Student not found" },
          { status: 404 }
        );
      }

      const {
        username,
        password,
        email,
        branchIds,
        subjectPreferences = [],
        regularAvailability = [],
        exceptionalAvailability = [],
        contactPhones = [],
        ...studentData
      } = result.data;

      // Check username uniqueness if being updated
      if (username && username !== existingStudent.user.username) {
        const userExists = await prisma.user.findFirst({
          where: { username, id: { not: existingStudent.userId } },
        });

        if (userExists) {
          return NextResponse.json(
            { error: "Username already taken" },
            { status: 409 }
          );
        }
      }

      // Check email uniqueness if being updated
      if (email && email !== existingStudent.user.email) {
        const emailExists = await prisma.user.findFirst({
          where: { email, id: { not: existingStudent.userId } },
        });

        if (emailExists) {
          return NextResponse.json(
            { error: "Email already in use" },
            { status: 409 }
          );
        }
      }

      // Verify that all branchIds exist if provided
      if (branchIds && branchIds.length > 0) {
        const branchCount = await prisma.branch.count({
          where: { branchId: { in: branchIds } },
        });

        if (branchCount !== branchIds.length) {
          return NextResponse.json(
            { error: "一部の校舎IDが存在しません" }, // "Some branch IDs do not exist"
            { status: 400 }
          );
        }
      }

      // Validate subject preferences if provided
      if (subjectPreferences.length > 0) {
        // Check if all subjectIds exist
        const subjectIds = [
          ...new Set(subjectPreferences.map((pref) => pref.subjectId)),
        ];
        const subjectCount = await prisma.subject.count({
          where: { subjectId: { in: subjectIds } },
        });

        if (subjectCount !== subjectIds.length) {
          return NextResponse.json(
            { error: "一部の科目IDが存在しません" }, // "Some subject IDs do not exist"
            { status: 400 }
          );
        }

        // Check if all subjectTypeIds exist
        const subjectTypeIds = [
          ...new Set(subjectPreferences.flatMap((pref) => pref.subjectTypeIds)),
        ];
        const subjectTypeCount = await prisma.subjectType.count({
          where: { subjectTypeId: { in: subjectTypeIds } },
        });

        if (subjectTypeCount !== subjectTypeIds.length) {
          return NextResponse.json(
            { error: "一部の科目タイプIDが存在しません" }, // "Some subject type IDs do not exist"
            { status: 400 }
          );
        }

        // Check if all preferred teachers exist
        const allTeacherIds = subjectPreferences.flatMap(
          (pref) => pref.preferredTeacherIds || []
        );
        const uniqueTeacherIds = [...new Set(allTeacherIds)];
        if (uniqueTeacherIds.length > 0) {
          const teacherCount = await prisma.teacher.count({
            where: { teacherId: { in: uniqueTeacherIds } },
          });

          if (teacherCount !== uniqueTeacherIds.length) {
            return NextResponse.json(
              { error: "一部の講師IDが存在しません" },
              { status: 400 }
            );
          }
        }
      }

      // Update user, student and branch associations in a transaction
      const updatedStudent = await prisma.$transaction(async (tx) => {
        // Update user first if needed
        if (username || password || email !== undefined) {
          await tx.user.update({
            where: { id: existingStudent.userId },
            data: {
              username,
              passwordHash: password || undefined,
              email: email || null,
            },
          });
        }

        // Clean up optional fields - convert empty strings to null
        const cleanedStudentData: any = {};
        for (const [key, value] of Object.entries(studentData)) {
          if (key === 'lineUserId' || key === 'kanaName' || key === 'notes' || 
              key === 'schoolName' || key === 'firstChoice' || key === 'secondChoice' || 
              key === 'parentEmail' || key === 'homePhone' || key === 'parentPhone' || 
              key === 'studentPhone') {
            cleanedStudentData[key] = value || null;
          } else {
            cleanedStudentData[key] = value;
          }
        }

        // Update student record
        await tx.student.update({
          where: { studentId },
          data: cleanedStudentData,
        });

        // Update branch associations if provided
        if (branchIds !== undefined) {
          // Delete existing branch associations
          await tx.userBranch.deleteMany({
            where: { userId: existingStudent.userId },
          });

          // Create new branch associations
          if (branchIds.length > 0) {
            await tx.userBranch.createMany({
              data: branchIds.map((branchId) => ({
                userId: existingStudent.userId,
                branchId,
              })),
            });
          }
        }

        // Update subject preferences if provided
        if (subjectPreferences.length > 0) {
          // Delete existing subject preferences for this user
          await tx.userSubjectPreference.deleteMany({
            where: { userId: existingStudent.userId },
          });

          // Delete existing teacher preferences for this student
          await tx.studentTeacherPreference.deleteMany({
            where: { studentId },
          });

          // Flatten the subject preferences into individual records
          const userSubjectPreferenceRecords = subjectPreferences.flatMap(
            (pref) =>
              pref.subjectTypeIds.map((subjectTypeId) => ({
                userId: existingStudent.userId,
                subjectId: pref.subjectId,
                subjectTypeId,
              }))
          );

          // Create new subject preferences
          if (userSubjectPreferenceRecords.length > 0) {
            await tx.userSubjectPreference.createMany({
              data: userSubjectPreferenceRecords,
            });
          }

          // Create teacher preferences if provided
          const teacherPreferenceData = subjectPreferences.flatMap((pref) =>
            (pref.preferredTeacherIds || []).flatMap((teacherId) =>
              pref.subjectTypeIds.map((subjectTypeId) => ({
                studentId,
                teacherId,
                subjectId: pref.subjectId,
                subjectTypeId,
              }))
            )
          );

          if (teacherPreferenceData.length > 0) {
            await tx.studentTeacherPreference.createMany({
              data: teacherPreferenceData,
            });
          }
        }

        // Update regular availability if provided (including empty array to clear all)
        if (regularAvailability !== undefined) {
          // Always delete existing regular availability records when regularAvailability is provided
          await tx.userAvailability.deleteMany({
            where: {
              userId: existingStudent.userId,
              type: "REGULAR",
            },
          });

          // Only create new records if there are any
          if (regularAvailability.length > 0) {
            const availabilityRecords = [];

            for (const dayAvailability of regularAvailability) {
              const { dayOfWeek, timeSlots, fullDay } = dayAvailability;

              if (fullDay) {
                // Create a full-day availability record
                availabilityRecords.push({
                  userId: existingStudent.userId,
                  dayOfWeek: dayOfWeek as DayOfWeek,
                  type: "REGULAR" as const,
                  status: "APPROVED" as const,
                  fullDay: true,
                  startTime: null,
                  endTime: null,
                  date: null,
                  reason: null,
                  notes: null,
                });
              } else if (timeSlots && timeSlots.length > 0) {
                // Create availability records for each time slot
                for (const slot of timeSlots) {
                  // Create time from string using epoch date for consistency
                  const [startHours, startMinutes] = slot.startTime
                    .split(":")
                    .map(Number);
                  const [endHours, endMinutes] = slot.endTime
                    .split(":")
                    .map(Number);

                  availabilityRecords.push({
                    userId: existingStudent.userId,
                    dayOfWeek: dayOfWeek as DayOfWeek,
                    type: "REGULAR" as const,
                    status: "APPROVED" as const,
                    fullDay: false,
                    startTime: new Date(
                      Date.UTC(2000, 0, 1, startHours, startMinutes, 0, 0)
                    ),
                    endTime: new Date(
                      Date.UTC(2000, 0, 1, endHours, endMinutes, 0, 0)
                    ),
                    date: null,
                    reason: null,
                    notes: null,
                  });
                }
              }
            }

            if (availabilityRecords.length > 0) {
              await tx.userAvailability.createMany({
                data: availabilityRecords,
              });
            }
          }
        }

        // Update exceptional availability if provided or if empty array (to clear all)
        if (exceptionalAvailability !== undefined) {
          // Always delete existing exceptional availability records when exceptionalAvailability is provided
          await tx.userAvailability.deleteMany({
            where: {
              userId: existingStudent.userId,
              type: "EXCEPTION",
            },
          });

          // Only create new records if there are any
          if (exceptionalAvailability.length > 0) {
            const exceptionalRecords = [];

            for (const exceptionalItem of exceptionalAvailability) {
              const { date, fullDay, startTime, endTime, reason, notes } = exceptionalItem;

              // Create UTC date from the date input
              const createUTCDate = (dateInput: Date): Date => {
                const year = dateInput.getFullYear();
                const month = dateInput.getMonth();
                const day = dateInput.getDate();
                return new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
              };

              const dateUTC = createUTCDate(date);

              if (fullDay) {
                // Create a full-day exceptional availability record
                exceptionalRecords.push({
                  userId: existingStudent.userId,
                  dayOfWeek: null,
                  type: "EXCEPTION" as const,
                  status: "APPROVED" as const,
                  fullDay: true,
                  startTime: null,
                  endTime: null,
                  date: dateUTC,
                  reason: reason || null,
                  notes: notes || null,
                });
              } else if (startTime && endTime) {
                // Create time-specific exceptional availability record
                const [startHours, startMinutes] = startTime.split(":").map(Number);
                const [endHours, endMinutes] = endTime.split(":").map(Number);

                exceptionalRecords.push({
                  userId: existingStudent.userId,
                  dayOfWeek: null,
                  type: "EXCEPTION" as const,
                  status: "APPROVED" as const,
                  fullDay: false,
                  startTime: new Date(
                    Date.UTC(2000, 0, 1, startHours, startMinutes, 0, 0)
                  ),
                  endTime: new Date(
                    Date.UTC(2000, 0, 1, endHours, endMinutes, 0, 0)
                  ),
                  date: dateUTC,
                  reason: reason || null,
                  notes: notes || null,
                });
              }
            }

            if (exceptionalRecords.length > 0) {
              await tx.userAvailability.createMany({
                data: exceptionalRecords,
              });
            }
          }
        }

        // Update contact phones if provided
        if (contactPhones !== undefined) {
          // Delete existing contact phones
          await tx.contactPhone.deleteMany({
            where: { studentId },
          });

          // Create new contact phones
          if (contactPhones.length > 0) {
            await tx.contactPhone.createMany({
              data: contactPhones.map((phone, index) => ({
                studentId,
                phoneType: phone.phoneType,
                phoneNumber: phone.phoneNumber,
                notes: phone.notes || null,
                order: phone.order ?? index,
              })),
            });
          }
        }

        // Return updated student with user and branch associations
        return tx.student.findUnique({
          where: { studentId },
          include: {
            studentType: true,
            user: {
              select: {
                username: true,
                email: true,
                passwordHash: true,
                branches: {
                  include: {
                    branch: {
                      select: {
                        branchId: true,
                        name: true,
                      },
                    },
                  },
                },
                subjectPreferences: {
                  select: {
                    subjectId: true,
                    subjectTypeId: true,
                    subject: {
                      select: {
                        subjectId: true,
                        name: true,
                      },
                    },
                    subjectType: {
                      select: {
                        subjectTypeId: true,
                        name: true,
                      },
                    },
                  },
                },
                availability: {
                  select: {
                    id: true,
                    dayOfWeek: true,
                    type: true,
                    status: true,
                    fullDay: true,
                    startTime: true,
                    endTime: true,
                    date: true,
                    reason: true,
                    notes: true,
                  },
                },
              },
            },
            teacherPreferences: {
              select: {
                teacherId: true,
                subjectId: true,
                subjectTypeId: true,
                teacher: {
                  select: {
                    teacherId: true,
                    name: true,
                  },
                },
              },
            },
            contactPhones: {
              orderBy: { order: "asc" },
            },
          },
        });
      });

      if (!updatedStudent) {
        throw new Error("Failed to update student");
      }

      // Format response using the helper function
      const formattedStudent = formatStudent(updatedStudent);

      return NextResponse.json({
        data: [formattedStudent],
        pagination: {
          total: 1,
          page: 1,
          limit: 1,
          pages: 1,
        },
      });
    } catch (error) {
      console.error("Error updating student:", error);
      return NextResponse.json(
        { error: "Failed to update student" },
        { status: 500 }
      );
    }
  }
);

// DELETE - Delete a student
export const DELETE = withBranchAccess(
  ["ADMIN", "STAFF"],
  async (request: NextRequest) => {
    const studentId = request.url.split("/").pop();

    if (!studentId) {
      return NextResponse.json(
        { error: "Student ID is required" },
        { status: 400 }
      );
    }

    try {
      // Check if student exists
      const student = await prisma.student.findUnique({
        where: { studentId },
        include: { user: true },
      });

      if (!student) {
        return NextResponse.json(
          { error: "Student not found" },
          { status: 404 }
        );
      }

      // Delete student, user and branch associations in a transaction
      await prisma.$transaction(async (tx) => {
        // Delete user availability first
        await tx.userAvailability.deleteMany({
          where: { userId: student.userId },
        });

        // Delete student teacher preferences
        await tx.studentTeacherPreference.deleteMany({
          where: { studentId },
        });

        // Delete user subject preferences
        await tx.userSubjectPreference.deleteMany({
          where: { userId: student.userId },
        });

        // Delete branch associations
        await tx.userBranch.deleteMany({
          where: { userId: student.userId },
        });

        // Delete student
        await tx.student.delete({ where: { studentId } });

        // Delete associated user
        await tx.user.delete({ where: { id: student.userId } });
      });

      return NextResponse.json(
        {
          data: [],
          pagination: {
            total: 0,
            page: 0,
            limit: 0,
            pages: 0,
          },
        },
        { status: 200 }
      );
    } catch (error) {
      console.error("Error deleting student:", error);
      return NextResponse.json(
        { error: "Failed to delete student" },
        { status: 500 }
      );
    }
  }
);
