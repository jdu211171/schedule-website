import { useMutation, useQueryClient } from "@tanstack/react-query";
import { fetcher } from "@/lib/fetcher";
import { toast } from "sonner";

interface TeacherLineUnbindParams {
  teacherId: string;
  confirm: boolean;
}

interface StudentLineUnbindParams {
  studentId: string;
  accountType: "student" | "parent";
  confirm: boolean;
}

// Teacher LINE unbind mutation
export function useTeacherLineUnbind() {
  const queryClient = useQueryClient();

  return useMutation<
    { data: any; message: string },
    Error,
    TeacherLineUnbindParams
  >({
    mutationFn: ({ teacherId, confirm }) =>
      fetcher(`/api/teachers/${teacherId}/line-unbind`, {
        method: "PATCH",
        body: JSON.stringify({ confirm }),
      }),
    onSuccess: (response, variables) => {
      toast.success(response.message || "講師のLINE連携を解除しました");
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["teachers"] });
      queryClient.invalidateQueries({ queryKey: ["teacher", variables.teacherId] });
    },
    onError: (error: any) => {
      const message = error?.message || "LINE連携の解除に失敗しました";
      toast.error(message);
    },
  });
}

// Student LINE unbind mutation
export function useStudentLineUnbind() {
  const queryClient = useQueryClient();

  return useMutation<
    { data: any; message: string },
    Error,
    StudentLineUnbindParams
  >({
    mutationFn: ({ studentId, accountType, confirm }) =>
      fetcher(`/api/students/${studentId}/line-unbind`, {
        method: "PATCH",
        body: JSON.stringify({ accountType, confirm }),
      }),
    onSuccess: (response, variables) => {
      toast.success(response.message || "LINE連携を解除しました");
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["students"] });
      queryClient.invalidateQueries({ queryKey: ["student", variables.studentId] });
    },
    onError: (error: any) => {
      const message = error?.message || "LINE連携の解除に失敗しました";
      toast.error(message);
    },
  });
}

// Delete a specific teacher-channel link
export function useDeleteTeacherLineLink() {
  const queryClient = useQueryClient();

  return useMutation<
    { success: boolean },
    Error,
    { teacherId: string; linkId?: string; channelId?: string }
  >({
    mutationFn: ({ teacherId, linkId, channelId }) => {
      const params = new URLSearchParams();
      if (linkId) params.set("linkId", linkId);
      if (channelId) params.set("channelId", channelId);
      return fetcher(`/api/teachers/${teacherId}/line-links?${params.toString()}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      toast.success("チャネル連携を解除しました");
      queryClient.invalidateQueries({ queryKey: ["teachers"] });
    },
    onError: (error: any) => {
      const message = error?.message || "チャネル連携の解除に失敗しました";
      toast.error(message);
    },
  });
}

// Delete a specific student-channel link (by linkId or by channelId+accountSlot)
export function useDeleteStudentLineLink() {
  const queryClient = useQueryClient();

  return useMutation<
    { success: boolean },
    Error,
    { studentId: string; linkId?: string; channelId?: string; accountSlot?: "student" | "parent" }
  >({
    mutationFn: ({ studentId, linkId, channelId, accountSlot }) => {
      const params = new URLSearchParams();
      if (linkId) params.set("linkId", linkId);
      if (channelId) params.set("channelId", channelId);
      if (accountSlot) params.set("accountSlot", accountSlot);
      return fetcher(`/api/students/${studentId}/line-links?${params.toString()}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      toast.success("チャネル連携を解除しました");
      queryClient.invalidateQueries({ queryKey: ["students"] });
    },
    onError: (error: any) => {
      const message = error?.message || "チャネル連携の解除に失敗しました";
      toast.error(message);
    },
  });
}
