import * as React from "react";
import { toast } from "sonner";

interface ToastProps {
  title?: string;
  description?: string;
  variant?: "default" | "destructive";
}

export function useToast() {
  const showToast = React.useCallback(
    ({ title, description, variant }: ToastProps) => {
      if (variant === "destructive") {
        toast.error(title || "Error", {
          description,
        });
      } else {
        toast.success(title || "Success", {
          description,
        });
      }
    },
    []
  );

  return { toast: showToast };
}
