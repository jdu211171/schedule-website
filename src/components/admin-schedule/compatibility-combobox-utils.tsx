import React from "react";
import { CheckCircle2, AlertTriangle, Users } from "lucide-react";
import {
  ComboboxItemBase,
  ComboboxRenderItemProps,
} from "@/components/ui/combobox";
import {
  EnhancedTeacher,
  EnhancedStudent,
  SubjectCompatibility,
} from "@/hooks/useSmartSelection";

export type CompatibilityType =
  | EnhancedTeacher["compatibilityType"]
  | EnhancedStudent["compatibilityType"]
  | SubjectCompatibility["compatibilityType"];

export type CompatibilityComboboxItem = ComboboxItemBase & {
  description?: string;
  compatibilityType?: CompatibilityType;
  matchingSubjectsCount?: number;
  partialMatchingSubjectsCount?: number;
};

export const getCompatibilityIcon = (type?: CompatibilityType) => {
  switch (type) {
    case "perfect":
      return <CheckCircle2 className="h-3 w-3 text-green-500" />;
    case "subject-only":
      return <AlertTriangle className="h-3 w-3 text-orange-500" />;
    case "teacher-only":
      return <Users className="h-3 w-3 text-blue-500" />;
    case "student-only":
      return <Users className="h-3 w-3 text-orange-500" />;
    case "mismatch":
      return <AlertTriangle className="h-3 w-3 text-amber-500" />;
    case "teacher-no-prefs":
    case "student-no-prefs":
    case "no-teacher-selected":
    case "no-student-selected":
    case "no-preferences":
      return <Users className="h-3 w-3 text-muted-foreground" />;
    default:
      return null;
  }
};

export const getCompatibilityPriority = (type?: CompatibilityType) => {
  switch (type) {
    case "perfect":
      return 5;
    case "subject-only":
      return 4;
    case "teacher-only":
    case "student-only":
      return 3;
    case "teacher-no-prefs":
    case "student-no-prefs":
      return 2;
    case "no-preferences":
      return 1;
    case "mismatch":
      return 0;
    default:
      return -1;
  }
};

export const renderCompatibilityComboboxItem = <
  T extends CompatibilityComboboxItem,
>({
  item,
  defaultIndicator,
}: ComboboxRenderItemProps<T>) => {
  return (
    <div className="flex w-full flex-col">
      <div className="flex items-center gap-2">
        {getCompatibilityIcon(item.compatibilityType)}
        <span className="flex-1 truncate">{item.label}</span>
        {item.matchingSubjectsCount ? (
          <span className="rounded-full bg-green-100 px-1.5 py-0.5 text-xs font-medium text-green-800">
            +{item.matchingSubjectsCount}
          </span>
        ) : null}
        {item.partialMatchingSubjectsCount ? (
          <span className="rounded-full bg-orange-100 px-1.5 py-0.5 text-xs font-medium text-orange-800">
            ±{item.partialMatchingSubjectsCount}
          </span>
        ) : null}
        {defaultIndicator}
      </div>
      {item.description && (
        <span className="text-xs text-muted-foreground">
          {item.description}
        </span>
      )}
    </div>
  );
};
