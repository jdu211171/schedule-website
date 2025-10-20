"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Check,
  X,
  Copy,
  Save,
  Send,
  Download,
  Upload,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type ButtonState = "default" | "loading" | "success" | "error";

export interface StateConfig {
  label: string;
  icon?: LucideIcon;
  variant?:
    | "default"
    | "destructive"
    | "outline"
    | "secondary"
    | "ghost"
    | "link";
  className?: string;
}

export interface EnhancedStateButtonProps {
  // State configurations
  defaultState?: StateConfig;
  loadingState?: StateConfig;
  successState?: StateConfig;
  errorState?: StateConfig;

  // Current state
  state?: ButtonState;

  // Button props
  size?: "default" | "sm" | "lg" | "icon";
  disabled?: boolean;
  className?: string;

  // Callbacks
  onClick?: () => void | Promise<void>;
  onStateChange?: (state: ButtonState) => void;

  // Auto-reset options
  autoResetDelay?: number; // milliseconds to auto-reset from success/error states
  resetToState?: ButtonState; // which state to reset to (default: "default")

  // Animation options
  animationDuration?: number;
}

const defaultConfigs: Record<ButtonState, StateConfig> = {
  default: {
    label: "Click me",
    icon: Copy,
    variant: "default",
  },
  loading: {
    label: "Loading...",
    icon: Loader2,
    variant: "default",
  },
  success: {
    label: "Success!",
    icon: Check,
    variant: "default",
  },
  error: {
    label: "Error",
    icon: X,
    variant: "destructive",
  },
};

export function EnhancedStateButton({
  defaultState,
  loadingState,
  successState,
  errorState,
  state: controlledState,
  size = "default",
  disabled = false,
  className,
  onClick,
  onStateChange,
  autoResetDelay = 2000,
  resetToState = "default",
  animationDuration = 200,
  ...props
}: EnhancedStateButtonProps) {
  const [internalState, setInternalState] =
    React.useState<ButtonState>("default");
  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  // Use controlled state if provided, otherwise use internal state
  const currentState = controlledState ?? internalState;

  // Merge user configs with defaults
  const stateConfigs = {
    default: { ...defaultConfigs.default, ...defaultState },
    loading: { ...defaultConfigs.loading, ...loadingState },
    success: { ...defaultConfigs.success, ...successState },
    error: { ...defaultConfigs.error, ...errorState },
  };

  const currentConfig = stateConfigs[currentState];

  // Handle state changes
  const updateState = React.useCallback(
    (newState: ButtonState) => {
      if (!controlledState) {
        setInternalState(newState);
      }
      onStateChange?.(newState);
    },
    [controlledState, onStateChange]
  );

  // Auto-reset functionality
  React.useEffect(() => {
    if (currentState === "success" || currentState === "error") {
      timeoutRef.current = setTimeout(() => {
        updateState(resetToState);
      }, autoResetDelay);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [currentState, autoResetDelay, resetToState, updateState]);

  // Handle click events
  const handleClick = React.useCallback(async () => {
    if (currentState === "loading" || disabled) return;

    if (onClick) {
      try {
        updateState("loading");
        await onClick();
        updateState("success");
      } catch (error) {
        updateState("error");
        console.error("Button action failed:", error);
      }
    }
  }, [currentState, disabled, onClick, updateState]);

  // Get the appropriate icon
  const IconComponent = currentConfig.icon;
  const isLoading = currentState === "loading";

  // Color classes for different states
  const stateColors = {
    default: "",
    loading: "",
    success: "bg-green-600 hover:bg-green-700 border-green-600",
    error: "",
  };

  const stateTextColors = {
    default: "",
    loading: "",
    success: "text-white",
    error: "",
  };

  return (
    <Button
      variant={currentConfig.variant}
      size={size}
      disabled={disabled || isLoading}
      onClick={handleClick}
      className={cn(
        "relative overflow-hidden transition-all duration-300",
        currentState === "success" && stateColors.success,
        currentState === "success" && stateTextColors.success,
        currentConfig.className,
        className
      )}
      {...props}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={currentState}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: animationDuration / 1000 }}
          className="flex items-center gap-2"
        >
          {IconComponent && (
            <motion.div
              animate={isLoading ? { rotate: 360 } : { rotate: 0 }}
              transition={
                isLoading
                  ? {
                      duration: 1,
                      repeat: Number.POSITIVE_INFINITY,
                      ease: "linear",
                    }
                  : { duration: 0.2 }
              }
            >
              <IconComponent className="h-4 w-4" />
            </motion.div>
          )}
          <span>{currentConfig.label}</span>
        </motion.div>
      </AnimatePresence>

      {/* Success ripple effect */}
      {currentState === "success" && (
        <motion.div
          initial={{ scale: 0, opacity: 0.6 }}
          animate={{ scale: 4, opacity: 0 }}
          transition={{ duration: 0.6 }}
          className="absolute inset-0 bg-green-400 rounded-md"
        />
      )}
    </Button>
  );
}

// Preset configurations for common use cases
export const buttonPresets = {
  copy: {
    defaultState: { label: "Copy", icon: Copy },
    loadingState: { label: "Copying...", icon: Loader2 },
    successState: { label: "Copied!", icon: Check },
    errorState: { label: "Failed", icon: X },
  },
  save: {
    defaultState: { label: "Save", icon: Save },
    loadingState: { label: "Saving...", icon: Loader2 },
    successState: { label: "Saved!", icon: Check },
    errorState: { label: "Save Failed", icon: X },
  },
  send: {
    defaultState: { label: "Send", icon: Send },
    loadingState: { label: "Sending...", icon: Loader2 },
    successState: { label: "Sent!", icon: Check },
    errorState: { label: "Send Failed", icon: X },
  },
  download: {
    defaultState: { label: "Download", icon: Download },
    loadingState: { label: "Downloading...", icon: Loader2 },
    successState: { label: "Downloaded!", icon: Check },
    errorState: { label: "Download Failed", icon: X },
  },
  upload: {
    defaultState: { label: "Upload", icon: Upload },
    loadingState: { label: "Uploading...", icon: Loader2 },
    successState: { label: "Uploaded!", icon: Check },
    errorState: { label: "Upload Failed", icon: X },
  },
};
