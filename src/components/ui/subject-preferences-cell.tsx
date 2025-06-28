import React, { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface SubjectPreference {
  subjectId: string;
  subjectTypeIds: string[];
}

interface Subject {
  subjectId: string;
  name: string;
}

interface SubjectType {
  subjectTypeId: string;
  name: string;
}

interface SubjectPreferencesCellProps {
  subjectPreferences: SubjectPreference[];
  subjects: Subject[];
  subjectTypes: SubjectType[];
}

export function SubjectPreferencesCell({
  subjectPreferences,
  subjects,
  subjectTypes,
}: SubjectPreferencesCellProps) {
  const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(
    new Set()
  );

  const toggleSubject = (subjectId: string) => {
    setExpandedSubjects((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(subjectId)) {
        newSet.delete(subjectId);
      } else {
        newSet.add(subjectId);
      }
      return newSet;
    });
  };

  if (!subjectPreferences || subjectPreferences.length === 0) {
    return <span className="text-muted-foreground">-</span>;
  }

  return (
    <div className="space-y-1">
      {subjectPreferences.map((pref) => {
        const subject = subjects.find((s) => s.subjectId === pref.subjectId);
        if (!subject) return null;

        const isExpanded = expandedSubjects.has(pref.subjectId);
        const hasTypes = pref.subjectTypeIds && pref.subjectTypeIds.length > 0;

        return (
          <div key={pref.subjectId} className="flex flex-wrap gap-1 items-center">
            <Badge
              variant="secondary"
              className={hasTypes ? "cursor-pointer" : ""}
              onClick={() => hasTypes && toggleSubject(pref.subjectId)}
            >
              {hasTypes && (
                isExpanded ? (
                  <ChevronDown className="h-3 w-3 mr-1" />
                ) : (
                  <ChevronRight className="h-3 w-3 mr-1" />
                )
              )}
              {subject.name}
            </Badge>
            {isExpanded &&
              pref.subjectTypeIds.map((typeId) => {
                const type = subjectTypes.find((t) => t.subjectTypeId === typeId);
                return type ? (
                  <Badge key={typeId} variant="outline" className="text-xs">
                    {type.name}
                  </Badge>
                ) : null;
              })}
          </div>
        );
      })}
    </div>
  );
}