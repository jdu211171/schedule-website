import { fetcher } from "@/lib/fetcher";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { StudentPreferenceSubjectWithRelations } from "@/hooks/useStudentPreferenceSubjectQuery";

type CreateStudentPreferenceSubjectInput = {
  studentId: string;
  subjectId: string;
  subjectTypeIds: string[]; // Changed to array
  preferenceId?: string;
  notes?: string;
  _studentName?: string;
  _subjectName?: string;
  _subjectTypeNames?: Record<string, string>; // Changed to map of ID -> name
};

type UpdateStudentPreferenceSubjectInput = {
  id: string;
  notes?: string;
};

type StudentPreferenceSubjectResponse = {
  message: string;
  data: any;
  errors?: string[];
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
  tempIds?: string[];
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
    StudentPreferenceSubjectMutationContext
  >({
    mutationFn: (data) => {
      // Strip the client-side only fields before sending to API
      const { _studentName, _subjectName, _subjectTypeNames, ...apiData } = data;

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

      // Generate temp IDs for each subject type
      const tempIds = newStudentSubject.subjectTypeIds.map(
        (_, index) =>
          `temp-${Date.now()}-${index}-${Math.random().toString(36).substring(2, 9)}`
      );

      // Use the names provided by the form, fallback to lookup if not provided
      let studentName = newStudentSubject._studentName || "Unknown";
      let subjectName = newStudentSubject._subjectName || "Unknown";

      // Create a map of subject type names
      const subjectTypeNames: Record<string, string> = {};

      // If names weren't provided, try to look them up from the cache
      if (
        !newStudentSubject._studentName ||
        !newStudentSubject._subjectName ||
        !newStudentSubject._subjectTypeNames
      ) {
        // Get student info
        const studentData = await queryClient.getQueryData<any>(["students"]);
        if (studentData?.data) {
          const student = studentData.data.find(
            (s: any) => s.studentId === newStudentSubject.studentId
          );
          if (student) {
            studentName = student.name;
          }
        }

        // Get subject info
        const subjectData = await queryClient.getQueryData<any>(["subjects"]);
        if (subjectData?.data) {
          const subject = subjectData.data.find(
            (s: any) => s.subjectId === newStudentSubject.subjectId
          );
          if (subject) {
            subjectName = subject.name;
          }
        }

        // Get subject type info
        const subjectTypesData = await queryClient.getQueryData<any>(["subjectTypes"]);
        if (subjectTypesData?.data) {
          newStudentSubject.subjectTypeIds.forEach((typeId) => {
            const subjectType = subjectTypesData.data.find(
              (st: any) => st.subjectTypeId === typeId
            );
            if (subjectType) {
              subjectTypeNames[typeId] = subjectType.name;
            } else {
              subjectTypeNames[typeId] = "Unknown";
            }
          });
        }
      } else if (newStudentSubject._subjectTypeNames) {
        // Use provided names if available
        Object.assign(subjectTypeNames, newStudentSubject._subjectTypeNames);
      }

      // Create a mock preference ID if none provided
      const preferenceId =
        newStudentSubject.preferenceId || `temp-pref-${tempIds[0]}`;

      queries.forEach(([queryKey]) => {
        const currentData =
          queryClient.getQueryData<StudentPreferenceSubjectsQueryData>(queryKey);
        if (currentData) {
          // Create an optimistic entry for each subject type
          const optimisticEntries = newStudentSubject.subjectTypeIds.map(
            (typeId, index) => ({
              id: tempIds[index],
              subjectId: newStudentSubject.subjectId,
              subjectTypeId: typeId,
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
                subjectTypeId: typeId,
                name: subjectTypeNames[typeId] || "Unknown",
              },
              _optimistic: true,
              _tempId: tempIds[index],
            } as unknown as StudentPreferenceSubjectWithRelations & {
              _optimistic?: boolean;
              _tempId?: string;
            })
          );

          queryClient.setQueryData<StudentPreferenceSubjectsQueryData>(
            queryKey,
            {
              ...currentData,
              data: [...currentData.data, ...optimisticEntries],
              pagination: {
                ...currentData.pagination,
                total: currentData.pagination.total + optimisticEntries.length,
              },
            }
          );
        }
      });

      return { previousStudentSubjects, tempIds };
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
      if (context?.tempIds) {
        context.tempIds.forEach((tempId) => {
          tempToServerIdMap.delete(tempId);
        });
      }

      toast.error("生徒科目の追加に失敗しました", {
        description: error.message,
      });
    },
    onSuccess: (response, variables, context) => {
      if (context?.tempIds && response.data && Array.isArray(response.data)) {
        // Map temp IDs to real IDs
        response.data.forEach((realRecord, index) => {
          if (context.tempIds && index < context.tempIds.length) {
            tempToServerIdMap.set(context.tempIds[index], realRecord.id);
          }
        });

        // Update each query to replace optimistic records with real ones
        const queries =
          queryClient.getQueriesData<StudentPreferenceSubjectsQueryData>({
            queryKey: ["studentPreferenceSubjects"],
          });

        queries.forEach(([queryKey]) => {
          const currentData =
            queryClient.getQueryData<StudentPreferenceSubjectsQueryData>(
              queryKey
            );
          if (currentData) {
            try {
              queryClient.setQueryData<StudentPreferenceSubjectsQueryData>(
                queryKey,
                {
                  ...currentData,
                  data: currentData.data.map((item) => {
                    // Check if this is one of our optimistic entries
                    const tempId = (item as any)._tempId;
                    if (tempId && context.tempIds?.includes(tempId)) {
                      // Find index of temp ID to get corresponding real record
                      const index = context.tempIds.indexOf(tempId);
                      if (index >= 0 && index < response.data.length) {
                        const realRecord = response.data[index];

                        // Create a safe copy with defensive programming
                        const safeRecord = {
                          ...realRecord,
                          // Ensure the nested structure exists with fallbacks
                          studentPreference: {
                            ...(realRecord.studentPreference || {}),
                            student: {
                              studentId: variables.studentId,
                              name: item.studentPreference?.student?.name || "Unknown"
                            }
                          },
                          subject: {
                            ...(realRecord.subject || {}),
                            subjectId: variables.subjectId,
                            name: item.subject?.name || realRecord.subject?.name || "Unknown"
                          },
                          subjectType: {
                            ...(realRecord.subjectType || {}),
                            subjectTypeId: item.subjectTypeId,
                            name: item.subjectType?.name || realRecord.subjectType?.name || "Unknown"
                          }
                        };

                        return safeRecord;
                      }
                    }
                    return item;
                  }),
                }
              );
            } catch (err) {
              console.error("Error updating cache:", err);
              // If there's an error in the optimistic update, just invalidate the query
              queryClient.invalidateQueries({
                queryKey: ["studentPreferenceSubjects"],
              });
            }
          }
        });
      }

      toast.success(response.message || "生徒科目を追加しました", {
        description: response.errors && response.errors.length > 0
          ? `警告: ${response.errors.join(", ")}`
          : undefined,
      });
    },
    onSettled: () => {
      // Always invalidate queries after mutation settles
      queryClient.invalidateQueries({
        queryKey: ["studentPreferenceSubjects"],
      });
    },
  });
}

export function useStudentPreferenceSubjectUpdate() {
  const queryClient = useQueryClient();
  return useMutation<
    StudentPreferenceSubjectResponse,
    Error,
    UpdateStudentPreferenceSubjectInput
  >({
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
    StudentPreferenceSubjectMutationContext
  >({
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
