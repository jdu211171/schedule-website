import { useMutation } from "@tanstack/react-query";
import { fetcher } from "@/lib/fetcher";
import { useSession } from "next-auth/react";
import { PasswordUpdateValues } from "@/schemas/password.schema";
import { toast } from "sonner";

interface PasswordChangeResponse {
  message: string;
}

function endpointForRole(role?: string) {
  switch (role) {
    case "ADMIN":
      return "/api/admins/me/password";
    case "STAFF":
      return "/api/staffs/me/password";
    case "TEACHER":
      return "/api/teachers/me/password";
    case "STUDENT":
      return "/api/students/me/password";
    default:
      return "/api/students/me/password"; // sensible default; will fail on server if unauthorized
  }
}

export function usePasswordChange() {
  const { data } = useSession();
  const role = data?.user?.role;

  return useMutation<PasswordChangeResponse, Error, PasswordUpdateValues>({
    mutationFn: async (values) => {
      const url = endpointForRole(role);
      const res = await fetcher<PasswordChangeResponse>(url, {
        method: "PATCH",
        body: JSON.stringify(values),
      });
      return res;
    },
    onSuccess: (response) => {
      toast.success(response.message || "パスワードを変更しました");
    },
    onError: (error: any) => {
      const msg =
        error?.info?.error ||
        error?.message ||
        "パスワードの変更に失敗しました";
      toast.error(String(msg));
    },
  });
}
