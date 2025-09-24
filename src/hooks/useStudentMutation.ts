// src/hooks/useStudentMutation.ts
import { fetcher, CustomError } from "@/lib/fetcher";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { StudentCreate, StudentUpdate } from "@/schemas/student.schema";
import { Student } from "./useStudentQuery";

// Helper function to extract error message from CustomError or regular Error
const getErrorMessage = (error: Error): string => {
  if (error instanceof CustomError) {
    return (error.info.error as string) || error.message;
  }
  return error.message;
};

type StudentsResponse = {
  data: Student[];
  message?: string;
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
};

type StudentMutationContext = {
  previousStudents?: Record<string, StudentsResponse>;
  previousStudent?: Student;
  deletedStudent?: Student;
  tempId?: string;
};

// Maintain a mapping between temporary IDs and server IDs
const tempToServerIdMap = new Map<string, string>();

export function getResolvedStudentId(id: string): string {
  return tempToServerIdMap.get(id) || id;
}

export function useStudentCreate() {
  const queryClient = useQueryClient();
  return useMutation<
  StudentsResponse,
    Error,
    StudentCreate,
    StudentMutationContext >
      ({
        mutationFn: (data) =>
          fetcher("/api/students", {
            method: "POST",
            body: JSON.stringify(data),
          }),
        onMutate: async (newStudent) => {
          await queryClient.cancelQueries({ queryKey: ["students"] });
          const queries = queryClient.getQueriesData<StudentsResponse>({
            queryKey: ["students"],
          });
          const previousStudents: Record<string, StudentsResponse> = {};
          queries.forEach(([queryKey, data]) => {
            if (data) {
              previousStudents[JSON.stringify(queryKey)] = data;
            }
          });
          const tempId = `temp-${Date.now()}`;
          queries.forEach(([queryKey]) => {
            const currentData =
              queryClient.getQueryData<StudentsResponse>(queryKey);
            if (currentData?.data) {
              // Create optimistic student
              const optimisticStudent: Student = {
                studentId: tempId,
                userId: tempId,
                name: newStudent.name,
                kanaName: newStudent.kanaName || null,
                studentTypeId: newStudent.studentTypeId || null,
                studentTypeName: null,
                maxYears: null,
                gradeYear: newStudent.gradeYear || null,
                lineId: newStudent.lineId || null,
                parentLineId1: newStudent.parentLineId1 || null,
                lineUserId: newStudent.lineUserId || null,
                lineNotificationsEnabled: newStudent.lineNotificationsEnabled ?? true,
                notes: newStudent.notes || null,
                status: newStudent.status || "ACTIVE",
                username: newStudent.username,
                email: newStudent.email || null,
                password: newStudent.password || null,
                admissionDate: (newStudent as any).admissionDate || null,
                branches: [],
                subjectPreferences: newStudent.subjectPreferences || [],
                regularAvailability: (newStudent.regularAvailability || []).map(ra => ({
                  dayOfWeek: ra.dayOfWeek,
                  timeSlots: ra.timeSlots || [],
                  fullDay: ra.fullDay
                })),
                exceptionalAvailability: (newStudent.exceptionalAvailability || []).map(ea => {
                  // Convert schema format to API response format
                  const timeSlots = [];
                  if (!ea.fullDay && ea.startTime && ea.endTime) {
                    timeSlots.push({
                      id: crypto.randomUUID(),
                      startTime: ea.startTime,
                      endTime: ea.endTime
                    });
                  }
                  return {
                    date: ea.date instanceof Date ? ea.date.toISOString().split('T')[0] : ea.date,
                    timeSlots,
                    fullDay: ea.fullDay,
                    reason: ea.reason || null,
                    notes: ea.notes || null
                  };
                }),
                absenceAvailability: (newStudent as any).absenceAvailability
                  ? (newStudent as any).absenceAvailability.map((ea: any) => {
                      const timeSlots = [] as { id: string; startTime: string; endTime: string }[];
                      if (!ea.fullDay && ea.startTime && ea.endTime) {
                        timeSlots.push({
                          id: crypto.randomUUID(),
                          startTime: ea.startTime,
                          endTime: ea.endTime
                        });
                      }
                      return {
                        date: ea.date instanceof Date ? ea.date.toISOString().split('T')[0] : ea.date,
                        timeSlots,
                        fullDay: ea.fullDay,
                        reason: ea.reason || null,
                        notes: ea.notes || null
                      };
                    })
                  : [],
                // School information
                schoolName: newStudent.schoolName || null,
                schoolType: newStudent.schoolType || null,
                // Exam information
                examCategory: newStudent.examCategory || null,
                examCategoryType: newStudent.examCategoryType || null,
                firstChoice: newStudent.firstChoice || null,
                secondChoice: newStudent.secondChoice || null,
                examDate: newStudent.examDate || null,
                // Contact information
                homePhone: null,
                parentPhone: null,
                studentPhone: null,
                parentEmail: newStudent.parentEmail || null,
                // Personal information
                birthDate: newStudent.birthDate || null,
                // Contact phones
                contactPhones: (newStudent.contactPhones || []).map((phone, index) => ({
                  id: phone.id || crypto.randomUUID(),
                  phoneType: phone.phoneType,
                  phoneNumber: phone.phoneNumber,
                  notes: phone.notes || null,
                  order: phone.order ?? index,
                })),
                // Contact emails
                contactEmails: (newStudent.contactEmails || []).map((e, index) => ({
                  id: e.id || crypto.randomUUID(),
                  email: e.email,
                  notes: e.notes || null,
                  order: e.order ?? index,
                })),
                createdAt: new Date(),
                updatedAt: new Date(),
                _optimistic: true,
              };

              queryClient.setQueryData<StudentsResponse>(queryKey, {
                ...currentData,
                data: [optimisticStudent, ...currentData.data],
                pagination: {
                  ...currentData.pagination,
                  total: currentData.pagination.total + 1,
                },
              });
            }
          });
          return { previousStudents, tempId };
        },
        onError: (error, _, context) => {
          if (context?.previousStudents) {
            Object.entries(context.previousStudents).forEach(
              ([queryKeyStr, data]) => {
                const queryKey = JSON.parse(queryKeyStr);
                queryClient.setQueryData(queryKey, data);
              }
            );
          }

          // Clean up the ID mapping if we created one
          if (context?.tempId) {
            tempToServerIdMap.delete(context.tempId);
          }

          toast.error("生徒の追加に失敗しました", {
            id: "student-create-error",
            description: getErrorMessage(error),
          });
        },
        onSuccess: (response, _, context) => {
          if (!context?.tempId) return;

          // Store the mapping between temporary ID and server ID
          const newStudent = response.data[0];
          tempToServerIdMap.set(context.tempId, newStudent.studentId);

          // Update all student queries
          const queries = queryClient.getQueriesData<StudentsResponse>({
            queryKey: ["students"],
          });

          queries.forEach(([queryKey]) => {
            const currentData =
              queryClient.getQueryData<StudentsResponse>(queryKey);
            if (currentData?.data) {
              queryClient.setQueryData<StudentsResponse>(queryKey, {
                ...currentData,
                data: currentData.data.map((student) =>
                  student.studentId === context.tempId ? newStudent : student
                ),
              });
            }
          });

          toast.success("生徒を追加しました", {
            id: "student-create-success",
          });
        },
        onSettled: () => {
          queryClient.invalidateQueries({
            queryKey: ["students"],
            refetchType: "none",
          });
        },
      });
}

export function useStudentUpdate() {
  const queryClient = useQueryClient();
  return useMutation<
  StudentsResponse,
    Error,
    StudentUpdate,
    StudentMutationContext >
      ({
        mutationFn: ({ studentId, ...data }) => {
          const resolvedId = getResolvedStudentId(studentId);
          return fetcher(`/api/students/${resolvedId}`, {
            method: "PATCH",
            body: JSON.stringify(data),
          });
        },
        onMutate: async (updatedStudent) => {
          await queryClient.cancelQueries({ queryKey: ["students"] });

          const resolvedId = getResolvedStudentId(updatedStudent.studentId);

          await queryClient.cancelQueries({
            queryKey: ["student", resolvedId],
          });
          const queries = queryClient.getQueriesData<StudentsResponse>({
            queryKey: ["students"],
          });
          const previousStudents: Record<string, StudentsResponse> = {};
          queries.forEach(([queryKey, data]) => {
            if (data) {
              previousStudents[JSON.stringify(queryKey)] = data;
            }
          });
          const previousStudent = queryClient.getQueryData<Student>([
            "student",
            resolvedId,
          ]);
          queries.forEach(([queryKey]) => {
            const currentData =
              queryClient.getQueryData<StudentsResponse>(queryKey);
            if (currentData?.data) {
              queryClient.setQueryData<StudentsResponse>(queryKey, {
                ...currentData,
                data: currentData.data.map((student) =>
                  student.studentId === updatedStudent.studentId
                    ? {
                        ...student,
                        ...updatedStudent,
                        name: updatedStudent.name || student.name,
                        // Convert availability data to match Student interface
                        regularAvailability: updatedStudent.regularAvailability
                          ? updatedStudent.regularAvailability.map(ra => ({
                              dayOfWeek: ra.dayOfWeek,
                              timeSlots: ra.timeSlots || [],
                              fullDay: ra.fullDay
                            }))
                          : student.regularAvailability,
                        exceptionalAvailability: updatedStudent.exceptionalAvailability
                          ? updatedStudent.exceptionalAvailability.map(ea => {
                              const timeSlots = [];
                              if (!ea.fullDay && ea.startTime && ea.endTime) {
                                timeSlots.push({
                                  id: crypto.randomUUID(),
                                  startTime: ea.startTime,
                                  endTime: ea.endTime
                                });
                              }
                              return {
                                date: ea.date instanceof Date ? ea.date.toISOString().split('T')[0] : ea.date,
                                timeSlots,
                                fullDay: ea.fullDay,
                                reason: ea.reason || null,
                                notes: ea.notes || null
                              };
                            })
                          : student.exceptionalAvailability,
                        absenceAvailability: (updatedStudent as any).absenceAvailability
                          ? (updatedStudent as any).absenceAvailability.map((ea: any) => {
                              const timeSlots = [] as { id: string; startTime: string; endTime: string }[];
                              if (!ea.fullDay && ea.startTime && ea.endTime) {
                                timeSlots.push({
                                  id: crypto.randomUUID(),
                                  startTime: ea.startTime,
                                  endTime: ea.endTime
                                });
                              }
                              return {
                                date: ea.date instanceof Date ? ea.date.toISOString().split('T')[0] : ea.date,
                                timeSlots,
                                fullDay: ea.fullDay,
                                reason: ea.reason || null,
                                notes: ea.notes || null
                              };
                            })
                          : (student as any).absenceAvailability || [],
                        contactPhones: updatedStudent.contactPhones
                          ? updatedStudent.contactPhones.map((phone, index) => ({
                              id: phone.id || crypto.randomUUID(),
                              phoneType: phone.phoneType,
                              phoneNumber: phone.phoneNumber,
                              notes: phone.notes || null,
                              order: phone.order ?? index,
                            }))
                          : student.contactPhones || [],
                        contactEmails: updatedStudent.contactEmails
                          ? updatedStudent.contactEmails.map((e, index) => ({
                              id: e.id || crypto.randomUUID(),
                              email: e.email,
                              notes: e.notes || null,
                              order: e.order ?? index,
                            }))
                          : student.contactEmails || [],
                        updatedAt: new Date(),
                      }
                    : student
                ),
              });
            }
          });
          if (previousStudent) {
          const updatedData = {
            ...previousStudent,
            ...updatedStudent,
            name: updatedStudent.name || previousStudent.name,
            // Convert availability data to match Student interface
            regularAvailability: updatedStudent.regularAvailability
              ? updatedStudent.regularAvailability.map(ra => ({
                  dayOfWeek: ra.dayOfWeek,
                  timeSlots: ra.timeSlots || [],
                  fullDay: ra.fullDay
                }))
              : previousStudent.regularAvailability,
            exceptionalAvailability: updatedStudent.exceptionalAvailability
              ? updatedStudent.exceptionalAvailability.map(ea => {
                  const timeSlots = [];
                  if (!ea.fullDay && ea.startTime && ea.endTime) {
                    timeSlots.push({
                      id: crypto.randomUUID(),
                      startTime: ea.startTime,
                      endTime: ea.endTime
                    });
                  }
                  return {
                    date: ea.date instanceof Date ? ea.date.toISOString().split('T')[0] : ea.date,
                    timeSlots,
                    fullDay: ea.fullDay,
                    reason: ea.reason || null,
                    notes: ea.notes || null
                  };
                })
              : previousStudent.exceptionalAvailability,
            absenceAvailability: (updatedStudent as any).absenceAvailability
              ? (updatedStudent as any).absenceAvailability.map((ea: any) => {
                  const timeSlots = [] as { id: string; startTime: string; endTime: string }[];
                  if (!ea.fullDay && ea.startTime && ea.endTime) {
                    timeSlots.push({
                      id: crypto.randomUUID(),
                      startTime: ea.startTime,
                      endTime: ea.endTime
                    });
                  }
                  return {
                    date: ea.date instanceof Date ? ea.date.toISOString().split('T')[0] : ea.date,
                    timeSlots,
                    fullDay: ea.fullDay,
                    reason: ea.reason || null,
                    notes: ea.notes || null
                  };
                })
              : (previousStudent as any).absenceAvailability || [],
              contactPhones: updatedStudent.contactPhones
                ? updatedStudent.contactPhones.map((phone, index) => ({
                    id: phone.id || crypto.randomUUID(),
                    phoneType: phone.phoneType,
                    phoneNumber: phone.phoneNumber,
                    notes: phone.notes || null,
                    order: phone.order ?? index,
                  }))
                : previousStudent.contactPhones || [],
              contactEmails: updatedStudent.contactEmails
                ? updatedStudent.contactEmails.map((e, index) => ({
                    id: e.id || crypto.randomUUID(),
                    email: e.email,
                    notes: e.notes || null,
                    order: e.order ?? index,
                  }))
                : previousStudent.contactEmails || [],
              updatedAt: new Date(),
            };
            queryClient.setQueryData<Student>(["student", resolvedId], updatedData);
          }
          return { previousStudents, previousStudent };
        },
        onError: (error, variables, context) => {
          if (context?.previousStudents) {
            Object.entries(context.previousStudents).forEach(
              ([queryKeyStr, data]) => {
                const queryKey = JSON.parse(queryKeyStr);
                queryClient.setQueryData(queryKey, data);
              }
            );
          }

          const resolvedId = getResolvedStudentId(variables.studentId);

          if (context?.previousStudent) {
            queryClient.setQueryData(
              ["student", resolvedId],
              context.previousStudent
            );
          }
          toast.error("生徒の更新に失敗しました", {
            id: "student-update-error",
            description: getErrorMessage(error),
          });
        },
        onSuccess: (data) => {
          // Find the updated student from the response
          const updatedStudent = data?.data?.[0];
          if (updatedStudent) {
            // Update all student queries to replace the student with the updated one
            const queries = queryClient.getQueriesData<StudentsResponse>({
              queryKey: ["students"],
            });
            queries.forEach(([queryKey]) => {
              const currentData = queryClient.getQueryData<StudentsResponse>(queryKey);
              if (currentData?.data) {
                queryClient.setQueryData<StudentsResponse>(queryKey, {
                  ...currentData,
                  data: currentData.data.map((student) =>
                    student.studentId === updatedStudent.studentId ? updatedStudent : student
                  ),
                });
              }
            });
            // Also update the single student query if it exists
            queryClient.setQueryData(["student", updatedStudent.studentId], updatedStudent);
          }
          toast.success("生徒を更新しました", {
            id: "student-update-success",
          });
        },
        onSettled: (_, __, variables) => {
          const resolvedId = getResolvedStudentId(variables.studentId);

          queryClient.invalidateQueries({
            queryKey: ["students"],
            refetchType: "none",
          });
          queryClient.invalidateQueries({
            queryKey: ["student", resolvedId],
            refetchType: "none",
          });
        },
      });
}

export function useStudentDelete() {
  const queryClient = useQueryClient();
  return useMutation<
  StudentsResponse,
    Error,
    string,
    StudentMutationContext >
      ({
        mutationFn: (studentId) => {
          const resolvedId = getResolvedStudentId(studentId);
          return fetcher(`/api/students/${resolvedId}`, {
            method: "DELETE",
          });
        },
        onMutate: async (studentId) => {
          await queryClient.cancelQueries({ queryKey: ["students"] });

          const resolvedId = getResolvedStudentId(studentId);

          await queryClient.cancelQueries({
            queryKey: ["student", resolvedId],
          });

          const queries = queryClient.getQueriesData<StudentsResponse>({
            queryKey: ["students"],
          });
          const previousStudents: Record<string, StudentsResponse> = {};

          queries.forEach(([queryKey, data]) => {
            if (data) {
              previousStudents[JSON.stringify(queryKey)] = data;
            }
          });

          let deletedStudent: Student | undefined;
          for (const [, data] of queries) {
            if (data?.data) {
              const found = data.data.find(
                (student) => student.studentId === studentId
              );
              if (found) {
                deletedStudent = found;
                break;
              }
            }
          }

          queries.forEach(([queryKey]) => {
            const currentData =
              queryClient.getQueryData<StudentsResponse>(queryKey);

            if (currentData?.data) {
              queryClient.setQueryData<StudentsResponse>(queryKey, {
                ...currentData,
                data: currentData.data.filter(
                  (student) => student.studentId !== studentId
                ),
                pagination: {
                  ...currentData.pagination,
                  total: Math.max(0, currentData.pagination.total - 1),
                },
              });
            }
          });

          queryClient.removeQueries({ queryKey: ["student", resolvedId] });

          if (studentId.startsWith("temp-")) {
            tempToServerIdMap.delete(studentId);
          }

          return { previousStudents, deletedStudent };
        },
        onError: (error, studentId, context) => {
          if (context?.previousStudents) {
            Object.entries(context.previousStudents).forEach(
              ([queryKeyStr, data]) => {
                const queryKey = JSON.parse(queryKeyStr);
                queryClient.setQueryData(queryKey, data);
              }
            );
          }

          if (studentId.startsWith("temp-") && context?.deletedStudent) {
            tempToServerIdMap.set(studentId, context.deletedStudent.studentId);
          }

          const resolvedId = getResolvedStudentId(studentId);

          if (context?.deletedStudent) {
            queryClient.setQueryData(
              ["student", resolvedId],
              context.deletedStudent
            );
          }

          toast.error("生徒の削除に失敗しました", {
            id: "student-delete-error",
            description: getErrorMessage(error),
          });
        },
        onSuccess: (data, studentId) => {
          if (studentId.startsWith("temp-")) {
            tempToServerIdMap.delete(studentId);
          }

          toast.success("生徒を削除しました", {
            id: "student-delete-success",
          });
        },
        onSettled: (_, __, studentId) => {
          const resolvedId = getResolvedStudentId(studentId);

          queryClient.invalidateQueries({
            queryKey: ["students"],
            refetchType: "none",
          });
          queryClient.invalidateQueries({
            queryKey: ["student", resolvedId],
            refetchType: "none",
          });

          queryClient.invalidateQueries({
            queryKey: ["classSessions"],
            refetchType: "none",
          });
        },
      });
}
