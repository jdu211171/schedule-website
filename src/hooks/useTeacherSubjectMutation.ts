import { fetcher } from "@/lib/fetcher";
import {
  CreateTeacherSubjectInput,
  UpdateTeacherSubjectInput,
} from "@/schemas/teacher-subject.schema";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { TeacherSubject } from "@prisma/client";
import { toast } from "sonner";
import { TeacherSubjectWithRelations } from "@/hooks/useTeacherSubjectQuery";

type CreateTeacherSubjectInputWithNames = CreateTeacherSubjectInput & {
  _teacherName?: string;
  _subjectName?: string;
  _subjectTypeName?: string;
};


type CreateTeacherSubjectResponse = {
  message: string;
  data: TeacherSubject;
};

type UpdateTeacherSubjectResponse = {
  message: string;
  data: TeacherSubject;
};

type DeleteTeacherSubjectResponse = {
  message: string;
};

type TeacherSubjectsQueryData = {
  data: TeacherSubjectWithRelations[];
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    pages: number;
  };
};

// Define context types for mutations
type TeacherSubjectMutationContext = {
  previousTeacherSubjects?: Record<string, TeacherSubjectsQueryData>;
  tempId?: string;
};

// Create a composite ID for teacher subject
const createCompositeId = (
  teacherId: string,
  subjectId: string,
  subjectTypeId: string
): string => {
  return `${teacherId}:${subjectId}:${subjectTypeId}`;
};

// Maintain a mapping between temporary IDs and server composite IDs
const tempToServerIdMap = new Map<
  string,
  {
    teacherId: string;
    subjectId: string;
    subjectTypeId: string;
  }
>();

export function getResolvedTeacherSubjectIds(tempId: string):
  | {
      teacherId: string;
      subjectId: string;
      subjectTypeId: string;
    }
  | undefined {
  return tempToServerIdMap.get(tempId);
}

export function useTeacherSubjectCreate() {
  const queryClient = useQueryClient();
  return useMutation<
    CreateTeacherSubjectResponse,
    Error,
    CreateTeacherSubjectInputWithNames,
    TeacherSubjectMutationContext
  >({
    mutationFn: (data) => {
      // Strip the client-side only fields before sending to API
      const { _teacherName, _subjectName, _subjectTypeName, ...apiData } = data;

      return fetcher("/api/teacher-subjects", {
        method: "POST",
        body: JSON.stringify(apiData),
      });
    },
      onMutate: async (newTeacherSubject) => {
        await queryClient.cancelQueries({ queryKey: ["teacherSubjects"] });
        const queries = queryClient.getQueriesData<TeacherSubjectsQueryData>({
          queryKey: ["teacherSubjects"],
        });
        const previousTeacherSubjects: Record<string, TeacherSubjectsQueryData> = {};
        queries.forEach(([queryKey, data]) => {
          if (data) {
            previousTeacherSubjects[JSON.stringify(queryKey)] = data;
          }
        });

        const tempId = `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

        // Use the names provided by the form, fallback to lookup if not provided
        let teacherName = newTeacherSubject._teacherName || "Unknown";
        let subjectName = newTeacherSubject._subjectName || "Unknown";
        let subjectTypeName = newTeacherSubject._subjectTypeName || "Unknown";

        // If names weren't provided, try to look them up from the cache
        if (!newTeacherSubject._teacherName || !newTeacherSubject._subjectName || !newTeacherSubject._subjectTypeName) {
          // Get teacher info
          const teacherData = await queryClient.getQueryData<any>(["teachers"]);
          if (teacherData?.data) {
            const teacher = teacherData.data.find(
              (t: any) => t.teacherId === newTeacherSubject.teacherId
            );
            if (teacher) {
              teacherName = teacher.name;
            }
          }

          // Get subject info
          const subjectData = await queryClient.getQueryData<any>(["subjects"]);
          if (subjectData?.data) {
            const subject = subjectData.data.find(
              (s: any) => s.subjectId === newTeacherSubject.subjectId
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
              (st: any) => st.subjectTypeId === newTeacherSubject.subjectTypeId
            );
            if (subjectType) {
              subjectTypeName = subjectType.name;
            }
          }
        }

        queries.forEach(([queryKey]) => {
          const currentData = queryClient.getQueryData<TeacherSubjectsQueryData>(queryKey);
          if (currentData) {
            // Create optimistic entry with the provided or looked up names
            const optimisticTeacherSubject = {
              teacherId: newTeacherSubject.teacherId,
              subjectId: newTeacherSubject.subjectId,
              subjectTypeId: newTeacherSubject.subjectTypeId,
              notes: newTeacherSubject.notes || null,
              createdAt: new Date(),
              updatedAt: new Date(),
              teacher: {
                name: teacherName,
                teacherId: newTeacherSubject.teacherId,
              },
              subject: {
                name: subjectName,
                subjectId: newTeacherSubject.subjectId,
              },
              subjectType: {
                name: subjectTypeName,
                subjectTypeId: newTeacherSubject.subjectTypeId,
              },
              _optimistic: true,
              _tempId: tempId,
            } as unknown as TeacherSubjectWithRelations & {
              _optimistic?: boolean;
              _tempId?: string;
            };

            queryClient.setQueryData<TeacherSubjectsQueryData>(queryKey, {
              ...currentData,
              data: [...currentData.data, optimisticTeacherSubject],
              pagination: {
                ...currentData.pagination,
                total: currentData.pagination.total + 1,
              },
            });
          }
        });

        return { previousTeacherSubjects, tempId };
      },
    onError: (error, variables, context) => {
      if (context?.previousTeacherSubjects) {
        Object.entries(context.previousTeacherSubjects).forEach(
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

      toast.error("教師科目の追加に失敗しました", {
        description: error.message,
      });
    },
    onSuccess: (response, variables, context) => {
      if (context?.tempId) {
        // Get the actual data from the API response or cached data
        const teacherData = queryClient.getQueryData<any>(["teachers"]);
        const teacher = teacherData?.data?.find(
          (t: any) => t.teacherId === variables.teacherId
        );

        const subjectData = queryClient.getQueryData<any>(["subjects"]);
        const subject = subjectData?.data?.find(
          (s: any) => s.subjectId === variables.subjectId
        );

        const subjectTypeData = queryClient.getQueryData<any>(["subjectTypes"]);
        const subjectType = subjectTypeData?.data?.find(
          (st: any) => st.subjectTypeId === variables.subjectTypeId
        );

        // Store mapping from temp ID to actual composite ID
        tempToServerIdMap.set(context.tempId, {
          teacherId: variables.teacherId,
          subjectId: variables.subjectId,
          subjectTypeId: variables.subjectTypeId,
        });

        // Update queries to replace the optimistic entry with the real one
        const queries = queryClient.getQueriesData<TeacherSubjectsQueryData>({
          queryKey: ["teacherSubjects"],
        });

        queries.forEach(([queryKey]) => {
          const currentData =
            queryClient.getQueryData<TeacherSubjectsQueryData>(queryKey);
          if (currentData) {
            queryClient.setQueryData<TeacherSubjectsQueryData>(queryKey, {
              ...currentData,
              data: currentData.data.map((item) => {
                // Check if this is our optimistic entry
                if ((item as any)._tempId === context.tempId) {
                  return {
                    ...response.data,
                    teacher: {
                      ...item.teacher,
                      name: teacher?.name || item.teacher.name,
                      teacherId: variables.teacherId,
                    },
                    subject: {
                      ...item.subject,
                      name: subject?.name || item.subject.name,
                      subjectId: variables.subjectId,
                    },
                    subjectType: {
                      ...item.subjectType,
                      name: subjectType?.name || item.subjectType.name,
                      subjectTypeId: variables.subjectTypeId,
                    },
                  };
                }
                return item;
              }),
            });
          }
        });
      }

      toast.success("教師科目を追加しました", {
        description: response.message,
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ["teacherSubjects"],
        refetchType: "none",
      });
    },
  });
}

export function useTeacherSubjectUpdate() {
  const queryClient = useQueryClient();
  return useMutation<
    UpdateTeacherSubjectResponse,
    Error,
    UpdateTeacherSubjectInput
  >({
    mutationFn: ({ teacherId, subjectId, subjectTypeId, ...data }) =>
      fetcher(`/api/teacher-subjects`, {
        method: "PUT",
        body: JSON.stringify({ teacherId, subjectId, subjectTypeId, ...data }),
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["teacherSubjects"] });

      toast.success("教師科目を更新しました", {
        description: data.message,
      });
    },
    onError: (error) => {
      toast.error("教師科目の更新に失敗しました", {
        description: error.message,
      });
    },
  });
}

export function useTeacherSubjectDelete() {
  const queryClient = useQueryClient();
  return useMutation<
    DeleteTeacherSubjectResponse,
    Error,
    {
      teacherId: string;
      subjectId: string;
      subjectTypeId: string;
      tempId?: string;
    },
    TeacherSubjectMutationContext
  >({
    mutationFn: ({ teacherId, subjectId, subjectTypeId, tempId }) => {
      // If it's a temporary ID, we don't need to call the API
      if (tempId && tempId.startsWith("temp-")) {
        return Promise.resolve({ message: "Optimistic delete successful" });
      }

      // Check that all required parameters are provided and not undefined
      if (!teacherId || !subjectId || !subjectTypeId) {
        return Promise.reject(
          new Error("講師ID、科目ID、科目タイプIDはすべて必須です")
        );
      }

      return fetcher(
        `/api/teacher-subjects?teacherId=${teacherId}&subjectId=${subjectId}&subjectTypeId=${subjectTypeId}`,
        {
          method: "DELETE",
        }
      );
    },
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: ["teacherSubjects"] });

      const queries = queryClient.getQueriesData<TeacherSubjectsQueryData>({
        queryKey: ["teacherSubjects"],
      });

      const previousTeacherSubjects: Record<string, TeacherSubjectsQueryData> =
        {};
      queries.forEach(([queryKey, data]) => {
        if (data) {
          previousTeacherSubjects[JSON.stringify(queryKey)] = data;
        }
      });

      // Optimistically update all teacher subject queries
      queries.forEach(([queryKey]) => {
        const currentData =
          queryClient.getQueryData<TeacherSubjectsQueryData>(queryKey);

        if (currentData) {
          queryClient.setQueryData<TeacherSubjectsQueryData>(queryKey, {
            ...currentData,
            data: currentData.data.filter((item) => {
              // If we have a tempId, filter by that
              if (
                variables.tempId &&
                (item as any)._tempId === variables.tempId
              ) {
                return false;
              }

              // Otherwise filter by the composite key
              return !(
                item.teacherId === variables.teacherId &&
                item.subjectId === variables.subjectId &&
                item.subjectTypeId === variables.subjectTypeId
              );
            }),
            pagination: {
              ...currentData.pagination,
              total: Math.max(0, currentData.pagination.total - 1),
            },
          });
        }
      });

      // If it was a temporary ID, clean up the mapping
      if (variables.tempId && variables.tempId.startsWith("temp-")) {
        tempToServerIdMap.delete(variables.tempId);
      }

      return { previousTeacherSubjects };
    },
    onError: (error, _, context) => {
      // Restore previous data if there was an error
      if (context?.previousTeacherSubjects) {
        Object.entries(context.previousTeacherSubjects).forEach(
          ([queryKeyStr, data]) => {
            const queryKey = JSON.parse(queryKeyStr);
            queryClient.setQueryData(queryKey, data);
          }
        );
      }

      toast.error("教師科目の削除に失敗しました", {
        description: error.message,
      });
    },
    onSuccess: (data) => {
      toast.success("教師科目を削除しました", {
        description: data.message,
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ["teacherSubjects"],
        refetchType: "none",
      });
    },
  });
}
