import { useMutation, useQueryClient } from "@tanstack/react-query";
import { fetcher } from "@/lib/fetcher";
import {
  AdminUserCreateInput,
  AdminUserUpdateInput,
  AdminUserOrderUpdate,
} from "@/schemas/adminUser.schema";
import { AdminUser } from "./useAdminUserQuery";
import { toast } from "sonner";

interface CreateAdminUserResponse {
  data: AdminUser;
  message: string;
}

interface UpdateAdminUserResponse {
  data: AdminUser;
  message: string;
}

interface DeleteAdminUserResponse {
  message: string;
}

export function useCreateAdminUser() {
  const queryClient = useQueryClient();

  return useMutation<CreateAdminUserResponse, Error, AdminUserCreateInput>({
    mutationFn: async (data) => {
      const response = await fetcher("/api/admin-users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      return response as CreateAdminUserResponse;
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ["adminUsers"] });
      toast.success(response.message);
    },
    onError: (error) => {
      toast.error(error.message || "管理者ユーザーの作成に失敗しました");
    },
  });
}

export function useUpdateAdminUser() {
  const queryClient = useQueryClient();

  return useMutation<UpdateAdminUserResponse, Error, AdminUserUpdateInput>({
    mutationFn: async ({ id, ...data }) => {
      const response = await fetcher(`/api/admin-users/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      return response as UpdateAdminUserResponse;
    },
    onSuccess: (response, variables) => {
      queryClient.invalidateQueries({ queryKey: ["adminUsers"] });
      queryClient.invalidateQueries({ queryKey: ["adminUser", variables.id] });
      toast.success(response.message);
    },
    onError: (error) => {
      toast.error(error.message || "管理者ユーザーの更新に失敗しました");
    },
  });
}

export function useDeleteAdminUser() {
  const queryClient = useQueryClient();

  return useMutation<DeleteAdminUserResponse, Error, string>({
    mutationFn: async (id) => {
      const response = await fetcher(`/api/admin-users/${id}`, {
        method: "DELETE",
      });
      return response as DeleteAdminUserResponse;
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ["adminUsers"] });
      toast.success(response.message);
    },
    onError: (error) => {
      toast.error(error.message || "管理者ユーザーの削除に失敗しました");
    },
  });
}

export function useUpdateAdminUserOrder() {
  const queryClient = useQueryClient();

  return useMutation<{ message: string }, Error, AdminUserOrderUpdate>({
    mutationFn: async (data) => {
      const response = await fetcher("/api/admin-users/order", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      return response as { message: string };
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ["adminUsers"] });
      toast.success(response.message);
    },
    onError: (error) => {
      toast.error(error.message || "管理者の順序更新に失敗しました");
    },
  });
}

export function useAdminUserMutation() {
  const createMutation = useCreateAdminUser();
  const updateMutation = useUpdateAdminUser();
  const deleteMutation = useDeleteAdminUser();
  const updateOrderMutation = useUpdateAdminUserOrder();

  return {
    create: createMutation,
    update: updateMutation,
    delete: deleteMutation,
    updateOrder: updateOrderMutation,
  };
}