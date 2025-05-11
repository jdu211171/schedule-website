import { fetcher } from "@/lib/fetcher";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { StudentPreferenceSubjectWithRelations } from "@/hooks/useStudentPreferenceSubjectQuery";

type CreateStudentPreferenceSubjectInput = {
  studentId: string;
  subjectId: string;
  subjectTypeId: string;
  preferenceId?: string;
  notes?: string;
  _studentName?: string;
  _subjectName?: string;
  _subjectTypeName?: string;
};

type UpdateStudentPreferenceSubjectInput = {
  id: string;
  notes?: string;
};

type StudentPreferenceSubjectResponse = {
  message: string;
  data: any;
};

type DeleteStudentPreferenceSubjectResponse = {
  message: string;
};

type StudentPreferenceSubjectsQueryData = {
  data: StudentPreferenceSubjectWithRelations[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
};

// Define context types for mutations
type StudentPreferenceSubjectMutationContext = {
  previousStudentSubjects?: Record<string, StudentPreferenceSubjectsQueryData>;
  tempId?: string;
};

// Maintain a mapping between temporary IDs and server IDs
const tempToServerIdMap = new Map<string, string>();

export function getResolvedStudentSubjectId(
  tempId: string
): string | undefined {
  return tempToServerIdMap.get(tempId);
}

export function useStudentPreferenceSubjectCreate() {
  const queryClient = useQueryClient();
  return useMutation<
  StudentPreferenceSubjectResponse,
    Error,
    CreateStudentPreferenceSubjectInput,
    StudentPreferenceSubjectMutationContext >
      ({
        mutationFn: (data) => {
          // Strip the client-side only fields before sending to API
          const { _studentName, _subjectName, _subjectTypeName, ...apiData } =
            data;

          return fetcher("/api/student-preference-subjects", {
            method: "POST",
            body: JSON.stringify(apiData),
          });
        },
        onMutate: async (newStudentSubject) => {
          await queryClient.cancelQueries({
            queryKey: ["studentPreferenceSubjects"],
          });
          const queries =
            queryClient.getQueriesData<StudentPreferenceSubjectsQueryData>({
              queryKey: ["studentPreferenceSubjects"],
            });

          const previousStudentSubjects: Record<
            string,
            StudentPreferenceSubjectsQueryData
          > = {};
          queries.forEach(([queryKey, data]) => {
            if (data) {
              previousStudentSubjects[JSON.stringify(queryKey)] = data;
            }
          });

          const tempId = `temp-${Date.now()}-${Math.random()
            .toString(36)
            .substring(2, 9)}`;

          // Use the names provided by the form, fallback to lookup if not provided
          let studentName = newStudentSubject._studentName || "Unknown";
          let subjectName = newStudentSubject._subjectName || "Unknown";
          let subjectTypeName = newStudentSubject._subjectTypeName || "Unknown";

          // If names weren't provided, try to look them up from the cache
          if (
            !newStudentSubject._studentName ||
            !newStudentSubject._subjectName ||
            !newStudentSubject._subjectTypeName
          ) {
            // Get student info
            const studentData = await queryClient.getQueryData<any>([
              "students",
            ]);
            if (studentData?.data) {
              const student = studentData.data.find(
                (s: any) => s.studentId === newStudentSubject.studentId
              );
              if (student) {
                studentName = student.name;
              }
            }

            // Get subject info
            const subjectData = await queryClient.getQueryData<any>([
              "subjects",
            ]);
            if (subjectData?.data) {
              const subject = subjectData.data.find(
                (s: any) => s.subjectId === newStudentSubject.subjectId
              );
              if (subject) {
                subjectName = subject.name;
              }
            }

            // Get subject type info
            const subjectTypeData = await queryClient.getQueryData<any>([
              "subjectTypes",
            ]);
            if (subjectTypeData?.data) {
              const subjectType = subjectTypeData.data.find(
                (st: any) =>
                  st.subjectTypeId === newStudentSubject.subjectTypeId
              );
              if (subjectType) {
                subjectTypeName = subjectType.name;
              }
            }
          }

          // Create a mock preference ID if none provided
          const preferenceId =
            newStudentSubject.preferenceId || `temp-pref-${tempId}`;

          queries.forEach(([queryKey]) => {
            const currentData =
              queryClient.getQueryData<StudentPreferenceSubjectsQueryData>(
                queryKey
              );
            if (currentData) {
              // Create optimistic entry with the provided or looked up names
              const optimisticStudentSubject = {
                id: tempId,
                subjectId: newStudentSubject.subjectId,
                subjectTypeId: newStudentSubject.subjectTypeId,
                notes: newStudentSubject.notes,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                studentPreference: {
                  student: {
                    studentId: newStudentSubject.studentId,
                    name: studentName,
                  },
                },
                subject: {
                  subjectId: newStudentSubject.subjectId,
                  name: subjectName,
                },
                subjectType: {
                  subjectTypeId: newStudentSubject.subjectTypeId,
                  name: subjectTypeName,
                },
                _optimistic: true,
                _tempId: tempId,
              } as unknown as StudentPreferenceSubjectWithRelations & {
                _optimistic?: boolean;
                _tempId?: string;
              };

              queryClient.setQueryData<StudentPreferenceSubjectsQueryData>(
                queryKey,
                {
                  ...currentData,
                  data: [...currentData.data, optimisticStudentSubject],
                  pagination: {
                    ...currentData.pagination,
                    total: currentData.pagination.total + 1,
                  },
                }
              );
            }
          });

          return { previousStudentSubjects, tempId };
        },
        onError: (error, variables, context) => {
          if (context?.previousStudentSubjects) {
            Object.entries(context.previousStudentSubjects).forEach(
              ([queryKeyStr, data]) => {
                const queryKey = JSON.parse(queryKeyStr);
                queryClient.setQueryData(queryKey, data);
              }
            );
          }

          // Clean up mapping if error occurs
          if (context?.tempId) {
            tempToServerIdMap.delete(context.tempId);
          }

          toast.error("生徒科目の追加に失敗しました", {
            description: error.message,
          });
        },
        onSuccess: (response, variables, context) => {
          if (context?.tempId) {
            // Get the actual data from the API response
            const realId = response.data.id;

            // Store mapping from temp ID to actual ID
            tempToServerIdMap.set(context.tempId, realId);

            // Update queries to replace the optimistic entry with the real one
            const queries =
              queryClient.getQueriesData<StudentPreferenceSubjectsQueryData>({
                queryKey: ["studentPreferenceSubjects"],
              });

            // Get the actual data from the API response or cached data
            const studentData = queryClient.getQueryData<any>(["students"]);
            const student = studentData?.data?.find(
              (s: any) => s.studentId === variables.studentId
            );

            const subjectData = queryClient.getQueryData<any>(["subjects"]);
            const subject = subjectData?.data?.find(
              (s: any) => s.subjectId === variables.subjectId
            );

            const subjectTypeData = queryClient.getQueryData<any>([
              "subjectTypes",
            ]);
            const subjectType = subjectTypeData?.data?.find(
              (st: any) => st.subjectTypeId === variables.subjectTypeId
            );

            queries.forEach(([queryKey]) => {
              const currentData =
                queryClient.getQueryData<StudentPreferenceSubjectsQueryData>(
                  queryKey
                );
              if (currentData) {
                queryClient.setQueryData<StudentPreferenceSubjectsQueryData>(
                  queryKey,
                  {
                    ...currentData,
                    data: currentData.data.map((item) => {
                      // Check if this is our optimistic entry
                      if ((item as any)._tempId === context.tempId) {
                        return {
                          ...response.data,
                          studentPreference: {
                            ...response.data.studentPreference,
                            student: {
                              studentId: variables.studentId,
                              name:
                                student?.name ||
                                item.studentPreference?.student?.name ||
                                "Unknown",
                            },
                          },
                          subject: {
                            subjectId: variables.subjectId,
                            name:
                              subject?.name || item.subject?.name || "Unknown",
                          },
                          subjectType: {
                            subjectTypeId: variables.subjectTypeId,
                            name:
                              subjectType?.name ||
                              item.subjectType?.name ||
                              "Unknown",
                          },
                        };
                      }
                      return item;
                    }),
                  }
                );
              }
            });
          }

          toast.success("生徒科目を追加しました", {
            description: response.message,
          });
        },
        onSettled: () => {
          queryClient.invalidateQueries({
            queryKey: ["studentPreferenceSubjects"],
            refetchType: "none",
          });
        },
      });
}

export function useStudentPreferenceSubjectUpdate() {
  const queryClient = useQueryClient();
  return useMutation<
  StudentPreferenceSubjectResponse,
    Error,
    UpdateStudentPreferenceSubjectInput >
      ({
        mutationFn: (data) =>
          fetcher(`/api/student-preference-subjects`, {
            method: "PUT",
            body: JSON.stringify(data),
          }),
        onSuccess: (data) => {
          queryClient.invalidateQueries({
            queryKey: ["studentPreferenceSubjects"],
          });

          toast.success("生徒科目を更新しました", {
            description: data.message,
          });
        },
        onError: (error) => {
          toast.error("生徒科目の更新に失敗しました", {
            description: error.message,
          });
        },
      });
}

export function useStudentPreferenceSubjectDelete() {
  const queryClient = useQueryClient();
  return useMutation<
  DeleteStudentPreferenceSubjectResponse,
    Error,
    { id: string },
    StudentPreferenceSubjectMutationContext >
      ({
        mutationFn: ({ id }) => {
          // If it's a temporary ID, we don't need to call the API
          if (id && id.startsWith("temp-")) {
            return Promise.resolve({ message: "Optimistic delete successful" });
          }

          if (!id) {
            return Promise.reject(new Error("IDは必須です"));
          }

          return fetcher(`/api/student-preference-subjects?id=${id}`, {
            method: "DELETE",
          });
        },
        onMutate: async (variables) => {
          await queryClient.cancelQueries({
            queryKey: ["studentPreferenceSubjects"],
          });

          const queries =
            queryClient.getQueriesData<StudentPreferenceSubjectsQueryData>({
              queryKey: ["studentPreferenceSubjects"],
            });

          const previousStudentSubjects: Record<
            string,
            StudentPreferenceSubjectsQueryData
          > = {};
          queries.forEach(([queryKey, data]) => {
            if (data) {
              previousStudentSubjects[JSON.stringify(queryKey)] = data;
            }
          });

          // Optimistically update all student subject queries
          queries.forEach(([queryKey]) => {
            const currentData =
              queryClient.getQueryData<StudentPreferenceSubjectsQueryData>(
                queryKey
              );

            if (currentData) {
              queryClient.setQueryData<StudentPreferenceSubjectsQueryData>(
                queryKey,
                {
                  ...currentData,
                  data: currentData.data.filter((item) => {
                    // If we have a tempId, filter by that
                    const isTempId = variables.id.startsWith("temp-");
                    if (isTempId && (item as any)._tempId === variables.id) {
                      return false;
                    }

                    // Otherwise filter by the actual ID
                    return item.id !== variables.id;
                  }),
                  pagination: {
                    ...currentData.pagination,
                    total: Math.max(0, currentData.pagination.total - 1),
                  },
                }
              );
            }
          });

          // If it was a temporary ID, clean up the mapping
          if (variables.id && variables.id.startsWith("temp-")) {
            tempToServerIdMap.delete(variables.id);
          }

          return { previousStudentSubjects };
        },
        onError: (error, _, context) => {
          // Restore previous data if there was an error
          if (context?.previousStudentSubjects) {
            Object.entries(context.previousStudentSubjects).forEach(
              ([queryKeyStr, data]) => {
                const queryKey = JSON.parse(queryKeyStr);
                queryClient.setQueryData(queryKey, data);
              }
            );
          }

          toast.error("生徒科目の削除に失敗しました", {
            description: error.message,
          });
        },
        onSuccess: (data) => {
          toast.success("生徒科目を削除しました", {
            description: data.message,
          });
        },
        onSettled: () => {
          queryClient.invalidateQueries({
            queryKey: ["studentPreferenceSubjects"],
            refetchType: "none",
          });
        },
      });
}
