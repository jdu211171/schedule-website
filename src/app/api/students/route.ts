// src/app/api/students/route.ts
import { NextRequest, NextResponse } from "next/server";
import { withBranchAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  studentCreateSchema,
  studentFilterSchema,
} from "@/schemas/student.schema";
import { Student, DayOfWeek } from "@prisma/client";

type StudentWithIncludes = Student & {
  studentType: {
    studentTypeId: string;
    name: string;
    maxYears: number | null;
  } | null;
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
      startTime: Date | null;
      endTime: Date | null;
      fullDay: boolean | null;
      type: string;
      status: string;
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
};

type FormattedStudent = {
  studentId: string;
  userId: string;
  name: string;
  kanaName: string | null;
  studentTypeId: string | null;
  studentTypeName: string | null;
  maxYears: number | null;
  gradeYear: number | null;
  lineId: string | null;
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
            startTime: avail.startTime
              ? `${String(avail.startTime.getUTCHours()).padStart(
                  2,
                  "0"
                )}:${String(avail.startTime.getUTCMinutes()).padStart(2, "0")}`
              : "",
            endTime: avail.endTime
              ? `${String(avail.endTime.getUTCHours()).padStart(
                  2,
                  "0"
                )}:${String(avail.endTime.getUTCMinutes()).padStart(2, "0")}`
              : "",
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
    notes: student.notes,
    status: student.status,
    username: student.user.username,
    email: student.user.email,
    password: student.user.passwordHash || null,
    branches:
      student.user.branches?.map((ub) => ({
        branchId: ub.branch.branchId,
        name: ub.branch.name,
      })) || [],
    subjectPreferences,
    regularAvailability,
    exceptionalAvailability,
    createdAt: student.createdAt,
    updatedAt: student.updatedAt,
  };
};

// GET - List students with pagination and filters
export const GET = withBranchAccess(
  ["ADMIN", "STAFF"],
  async (request: NextRequest, session, branchId) => {
    // Parse query parameters
    const url = new URL(request.url);
    const params: Record<string, any> = {};
    
    // Handle both single values and arrays
    url.searchParams.forEach((value, key) => {
      if (key === 'studentTypeIds') {
        // Collect all studentTypeIds into an array
        if (!params.studentTypeIds) {
          params.studentTypeIds = [];
        }
        params.studentTypeIds.push(value);
      } else if (params[key]) {
        // If key already exists, convert to array
        if (Array.isArray(params[key])) {
          params[key].push(value);
        } else {
          params[key] = [params[key], value];
        }
      } else {
        params[key] = value;
      }
    });

    // Validate and parse filter parameters
    const result = studentFilterSchema.safeParse(params);
    if (!result.success) {
      return NextResponse.json(
        { error: "フィルターパラメータが無効です" }, // "Invalid filter parameters"
        { status: 400 }
      );
    }

    const { page, limit, name, studentTypeId, studentTypeIds, gradeYear, status } = result.data;

    // Build filter conditions
    const where: Record<string, any> = {};

    if (name) {
      where.OR = [
        { name: { contains: name, mode: "insensitive" } },
        { kanaName: { contains: name, mode: "insensitive" } },
      ];
    }

    // Support both single studentTypeId and multiple studentTypeIds
    if (studentTypeIds && studentTypeIds.length > 0) {
      where.studentTypeId = { in: studentTypeIds };
    } else if (studentTypeId) {
      where.studentTypeId = studentTypeId;
    }

    if (gradeYear !== undefined) {
      where.gradeYear = gradeYear;
    }

    if (status) {
      where.status = status;
    }

    // Filter students by branch for non-admin users
    if (session.user?.role !== "ADMIN") {
      where.user = {
        branches: {
          some: {
            branchId,
          },
        },
      };
    } else if (branchId) {
      // If admin has selected a specific branch, filter by that branch
      where.user = {
        branches: {
          some: {
            branchId,
          },
        },
      };
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Fetch total count
    const total = await prisma.student.count({ where });

    // Fetch students with branch associations
    const students = await prisma.student.findMany({
      where,
      include: {
        studentType: {
          select: {
            studentTypeId: true,
            name: true,
            maxYears: true,
          },
        },
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
                startTime: true,
                endTime: true,
                fullDay: true,
                type: true,
                status: true,
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
      },
      skip,
      take: limit,
      orderBy: { name: "asc" },
    });

    // Format students using the helper function
    const formattedStudents = students.map(formatStudent);

    return NextResponse.json({
      data: formattedStudents,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  }
);

// POST - Create a new student
export const POST = withBranchAccess(
  ["ADMIN", "STAFF"],
  async (request: NextRequest) => {
    try {
      const body = await request.json();

      // Validate request body
      const result = studentCreateSchema.safeParse(body);
      if (!result.success) {
        return NextResponse.json(
          { error: "入力データが無効です" }, // "Invalid input data"
          { status: 400 }
        );
      }

      const {
        username,
        password,
        email,
        studentTypeId,
        branchIds = [],
        subjectPreferences = [],
        regularAvailability = [],
        exceptionalAvailability = [],
        ...studentData
      } = result.data;

      // Check if username already exists
      const existingUser = await prisma.user.findFirst({
        where: { OR: [{ username }, { email: email || undefined }] },
      });

      if (existingUser) {
        return NextResponse.json(
          {
            error:
              email && existingUser.email === email
                ? "メールアドレスは既に使用されています" // "Email already in use"
                : "ユーザー名は既に使用されています", // "Username already taken"
          },
          { status: 409 }
        );
      }

      // If studentTypeId is provided, check if it exists
      if (studentTypeId) {
        const studentType = await prisma.studentType.findUnique({
          where: { studentTypeId },
        });

        if (!studentType) {
          return NextResponse.json(
            { error: "指定された学生タイプが存在しません" }, // "Specified student type does not exist"
            { status: 400 }
          );
        }
      }

      // Verify that all branchIds exist if provided
      if (branchIds.length > 0) {
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
        // Check if all subjects exist
        const subjectIds = subjectPreferences.map((pref) => pref.subjectId);
        const subjectCount = await prisma.subject.count({
          where: { subjectId: { in: subjectIds } },
        });

        if (subjectCount !== subjectIds.length) {
          return NextResponse.json(
            { error: "一部の科目IDが存在しません" },
            { status: 400 }
          );
        }

        // Check if all subject types exist
        const subjectTypeIds = subjectPreferences.flatMap(
          (pref) => pref.subjectTypeIds
        );
        const uniqueSubjectTypeIds = [...new Set(subjectTypeIds)];
        const subjectTypeCount = await prisma.subjectType.count({
          where: { subjectTypeId: { in: uniqueSubjectTypeIds } },
        });

        if (subjectTypeCount !== uniqueSubjectTypeIds.length) {
          return NextResponse.json(
            { error: "一部の科目タイプIDが存在しません" },
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

      // For students, use the password directly (no hashing)
      const passwordHash = password;

      // Create user, student and all related data in a transaction
      const newStudent = await prisma.$transaction(async (tx) => {
        // Create user first
        const user = await tx.user.create({
          data: {
            username,
            passwordHash,
            email,
            role: "STUDENT",
          },
        });

        // Create student record
        const student = await tx.student.create({
          data: {
            ...studentData,
            studentTypeId,
            userId: user.id,
          },
        });

        // Create branch associations if provided
        if (branchIds.length > 0) {
          await tx.userBranch.createMany({
            data: branchIds.map((branchId) => ({
              userId: user.id,
              branchId,
            })),
          });
        }

        // Create user subject preferences if provided
        if (subjectPreferences.length > 0) {
          const userSubjectPreferencesData = subjectPreferences.flatMap(
            (pref) =>
              pref.subjectTypeIds.map((subjectTypeId) => ({
                userId: user.id,
                subjectId: pref.subjectId,
                subjectTypeId,
              }))
          );

          await tx.userSubjectPreference.createMany({
            data: userSubjectPreferencesData,
          });

          // Create teacher preferences if provided
          const teacherPreferenceData = subjectPreferences.flatMap((pref) =>
            (pref.preferredTeacherIds || []).flatMap((teacherId) =>
              pref.subjectTypeIds.map((subjectTypeId) => ({
                studentId: student.studentId,
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

        // Create regular availability records if provided
        if (regularAvailability.length > 0) {
          const availabilityRecords = [];

          for (const dayAvailability of regularAvailability) {
            const { dayOfWeek, timeSlots, fullDay } = dayAvailability;

            if (fullDay) {
              // Create a full-day availability record
              availabilityRecords.push({
                userId: user.id,
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
                  userId: user.id,
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

        // Create exceptional availability records if provided
        if (exceptionalAvailability.length > 0) {
          const exceptionalRecords = [];

          for (const exceptionalItem of exceptionalAvailability) {
            const { date, fullDay, startTime, endTime, reason, notes } = exceptionalItem;

            if (fullDay) {
              // Create a full-day exceptional availability record
              exceptionalRecords.push({
                userId: user.id,
                dayOfWeek: null,
                type: "EXCEPTION" as const,
                status: "APPROVED" as const,
                fullDay: true,
                startTime: null,
                endTime: null,
                date: date,
                reason: reason || null,
                notes: notes || null,
              });
            } else if (startTime && endTime) {
              // Create time-specific exceptional availability record
              const [startHours, startMinutes] = startTime.split(":").map(Number);
              const [endHours, endMinutes] = endTime.split(":").map(Number);

              exceptionalRecords.push({
                userId: user.id,
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
                date: date,
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

        // Return student with all associations
        return tx.student.findUnique({
          where: { studentId: student.studentId },
          include: {
            studentType: {
              select: {
                studentTypeId: true,
                name: true,
                maxYears: true,
              },
            },
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
                    startTime: true,
                    endTime: true,
                    fullDay: true,
                    type: true,
                    status: true,
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
          },
        });
      });

      if (!newStudent) {
        throw new Error("Failed to create student");
      }

      // Use the formatStudent helper function
      const formattedStudent = formatStudent(newStudent);

      return NextResponse.json(
        {
          data: [formattedStudent],
          pagination: {
            total: 1,
            page: 1,
            limit: 1,
            pages: 1,
          },
        },
        { status: 201 }
      );
    } catch (error) {
      console.error("Error creating student:", error);
      return NextResponse.json(
        { error: "生徒の作成に失敗しました" }, // "Failed to create student"
        { status: 500 }
      );
    }
  }
);
