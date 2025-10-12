// src/hooks/useClassTypeVisibility.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetcher } from "@/lib/fetcher";
import type { UserClassTypeVisibilityPreferenceDTO, SetUserClassTypeVisibilityRequest } from "@/types/user-preferences";

const QUERY_KEY = ["userHiddenClassTypes"] as const;

export function useHiddenClassTypes() {
  return useQuery<{ hiddenClassTypeIds: string[] }>({
    queryKey: QUERY_KEY,
    queryFn: () => fetcher<UserClassTypeVisibilityPreferenceDTO>("/api/preferences/class-types"),
    staleTime: 1000 * 60 * 5,
  });
}

export function useSetHiddenClassTypes() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      const res = await fetch("/api/preferences/class-types", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hiddenClassTypeIds: ids } satisfies SetUserClassTypeVisibilityRequest),
      });
      if (!res.ok) {
        let detail = "";
        try {
          const data = await res.json();
          detail = typeof data?.error === "string" ? data.error : JSON.stringify(data);
        } catch {
          // ignore
        }
        const msg = res.status === 401 || res.status === 403
          ? "認証が必要です。サインイン後に再度お試しください"
          : `更新に失敗しました (${res.status})${detail ? ": " + detail : ""}`;
        throw new Error(msg);
      }
      return (await res.json()) as UserClassTypeVisibilityPreferenceDTO;
    },
    onSuccess: (data) => {
      qc.setQueryData(QUERY_KEY, { hiddenClassTypeIds: data.hiddenClassTypeIds });
      // Broadcast cross-tab update
      try {
        const ch = new BroadcastChannel("class-type-visibility");
        ch.postMessage({ type: "hiddenClassTypesChanged", ids: data.hiddenClassTypeIds });
        ch.close();
      } catch {}
    },
  });
}
