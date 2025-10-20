// src/lib/conflict-resolution-helper.ts
// Helper functions for handling class session conflicts and resolution

import { ConflictInfo, SessionAction } from "@/schemas/class-session.schema";

export type ConflictResolutionOption = {
  type: "skip" | "force" | "alternative";
  label: string;
  description: string;
  available: boolean;
  timeSlot?: {
    startTime: string;
    endTime: string;
  };
};

export type ConflictResolutionChoice = {
  date: string;
  action: "skip" | "force" | "alternative";
  newTime?: {
    start: string;
    end: string;
  };
};

/**
 * Generate resolution options for a conflict
 */
export function generateResolutionOptions(
  conflict: ConflictInfo
): ConflictResolutionOption[] {
  const options: ConflictResolutionOption[] = [];

  // Always allow skipping
  options.push({
    type: "skip",
    label: "この日をスキップ",
    description: "この日の授業を作成しません",
    available: true,
  });

  // Always allow force creation (with warning)
  const forceWarning = getForceCreateWarning(conflict.type);
  options.push({
    type: "force",
    label: "強制作成",
    description: `競合を無視して作成します。${forceWarning}`,
    available: true,
  });

  // Add alternative time options if available
  if (
    conflict.sharedAvailableSlots &&
    conflict.sharedAvailableSlots.length > 0
  ) {
    conflict.sharedAvailableSlots.forEach((slot) => {
      options.push({
        type: "alternative",
        label: `${slot.startTime}-${slot.endTime}に変更`,
        description: "講師と生徒の両方が利用可能な時間帯です",
        available: true,
        timeSlot: slot,
      });
    });
  }

  return options;
}

/**
 * Get warning message for force create based on conflict type
 */
function getForceCreateWarning(conflictType: ConflictInfo["type"]): string {
  switch (conflictType) {
    case "VACATION":
      return "休日期間中に作成されます。";
    case "TEACHER_UNAVAILABLE":
      return "講師の利用可能時間外に作成されます。";
    case "STUDENT_UNAVAILABLE":
      return "生徒の利用可能時間外に作成されます。";
    case "TEACHER_WRONG_TIME":
      return "講師の利用可能時間と異なります。";
    case "STUDENT_WRONG_TIME":
      return "生徒の利用可能時間と異なります。";
    case "BOOTH_CONFLICT":
      return "ブースが重複予約されます。";
    case "TEACHER_CONFLICT":
      return "同一講師の授業が時間重複します。";
    case "STUDENT_CONFLICT":
      return "同一生徒の授業が時間重複します。";
    case "NO_SHARED_AVAILABILITY":
      return "共通の利用可能時間がありません。";
    default:
      return "競合が存在します。";
  }
}

/**
 * Convert resolution choices to session actions
 */
export function choicesToSessionActions(
  choices: ConflictResolutionChoice[]
): SessionAction[] {
  return choices.map((choice) => {
    const action: SessionAction = {
      date: choice.date,
      action:
        choice.action === "skip"
          ? "SKIP"
          : choice.action === "force"
            ? "FORCE_CREATE"
            : "USE_ALTERNATIVE",
    };

    if (choice.action === "alternative" && choice.newTime) {
      action.alternativeStartTime = choice.newTime.start;
      action.alternativeEndTime = choice.newTime.end;
    }

    return action;
  });
}

/**
 * Group conflicts by type for better display
 */
export function groupConflictsByType(
  conflicts: ConflictInfo[]
): Record<string, ConflictInfo[]> {
  return conflicts.reduce(
    (groups, conflict) => {
      const type = conflict.type;
      if (!groups[type]) {
        groups[type] = [];
      }
      groups[type].push(conflict);
      return groups;
    },
    {} as Record<string, ConflictInfo[]>
  );
}

/**
 * Get conflict type display information
 */
export function getConflictTypeInfo(type: ConflictInfo["type"]) {
  const typeInfo = {
    VACATION: {
      icon: "🏖️",
      color: "orange",
      severity: "medium",
      title: "休日期間",
      canUseAlternative: false,
    },
    TEACHER_UNAVAILABLE: {
      icon: "👨‍🏫",
      color: "red",
      severity: "high",
      title: "講師利用不可",
      canUseAlternative: false,
    },
    STUDENT_UNAVAILABLE: {
      icon: "👨‍🎓",
      color: "red",
      severity: "high",
      title: "生徒利用不可",
      canUseAlternative: false,
    },
    TEACHER_WRONG_TIME: {
      icon: "⏰",
      color: "yellow",
      severity: "medium",
      title: "講師時間外",
      canUseAlternative: true,
    },
    STUDENT_WRONG_TIME: {
      icon: "⏰",
      color: "yellow",
      severity: "medium",
      title: "生徒時間外",
      canUseAlternative: true,
    },
    BOOTH_CONFLICT: {
      icon: "🏢",
      color: "purple",
      severity: "medium",
      title: "ブース重複",
      canUseAlternative: true,
    },
    TEACHER_CONFLICT: {
      icon: "👨‍🏫",
      color: "purple",
      severity: "high",
      title: "講師重複",
      canUseAlternative: true,
    },
    STUDENT_CONFLICT: {
      icon: "👨‍🎓",
      color: "purple",
      severity: "high",
      title: "生徒重複",
      canUseAlternative: true,
    },
    NO_SHARED_AVAILABILITY: {
      icon: "⚠️",
      color: "red",
      severity: "high",
      title: "共通時間なし",
      canUseAlternative: true,
    },
  };

  return (
    typeInfo[type] || {
      icon: "❓",
      color: "gray",
      severity: "low",
      title: "不明な競合",
      canUseAlternative: false,
    }
  );
}

/**
 * Generate summary statistics for conflicts
 */
export function generateConflictSummary(conflicts: ConflictInfo[]) {
  const byType = groupConflictsByType(conflicts);
  const datesWithAlternatives = conflicts.filter(
    (c) => c.sharedAvailableSlots && c.sharedAvailableSlots.length > 0
  ).length;

  return {
    totalConflicts: conflicts.length,
    conflictTypes: Object.keys(byType),
    datesWithAlternatives,
    canResolveWithAlternatives: datesWithAlternatives > 0,
    highSeverityCount: conflicts.filter(
      (c) => getConflictTypeInfo(c.type).severity === "high"
    ).length,
  };
}

/**
 * Recommend best resolution strategy
 */
export function recommendResolutionStrategy(conflicts: ConflictInfo[]): {
  strategy: "skip_all" | "force_all" | "mixed" | "alternatives_preferred";
  reasoning: string;
  autoResolution?: SessionAction[];
} {
  const summary = generateConflictSummary(conflicts);

  // If all conflicts have alternatives, prefer alternatives
  if (summary.datesWithAlternatives === summary.totalConflicts) {
    const autoResolution = conflicts
      .map((conflict) => {
        const firstSlot = conflict.sharedAvailableSlots?.[0];
        return {
          date: conflict.date,
          action: "USE_ALTERNATIVE" as const,
          alternativeStartTime: firstSlot?.startTime,
          alternativeEndTime: firstSlot?.endTime,
        };
      })
      .filter(
        (action) => action.alternativeStartTime && action.alternativeEndTime
      );

    return {
      strategy: "alternatives_preferred",
      reasoning:
        "すべての競合日に代替時間があります。自動的に最初の利用可能時間を提案します。",
      autoResolution,
    };
  }

  // If many high severity conflicts, recommend skipping
  if (summary.highSeverityCount > summary.totalConflicts / 2) {
    return {
      strategy: "skip_all",
      reasoning:
        "深刻な競合が多いため、該当日をスキップすることをお勧めします。",
    };
  }

  // If few conflicts with alternatives, recommend mixed approach
  if (summary.datesWithAlternatives > 0) {
    return {
      strategy: "mixed",
      reasoning:
        "一部の日には代替時間があります。個別に対応方法を選択してください。",
    };
  }

  // Default to manual decision
  return {
    strategy: "mixed",
    reasoning: "各日の状況に応じて適切な対応方法を選択してください。",
  };
}

/**
 * Validate session actions against conflicts
 */
export function validateSessionActions(
  conflicts: ConflictInfo[],
  actions: SessionAction[]
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const actionMap = new Map(actions.map((a) => [a.date, a]));

  conflicts.forEach((conflict) => {
    const action = actionMap.get(conflict.date);

    if (!action) {
      errors.push(`${conflict.date}: アクションが指定されていません`);
      return;
    }

    if (action.action === "USE_ALTERNATIVE") {
      if (!action.alternativeStartTime || !action.alternativeEndTime) {
        errors.push(`${conflict.date}: 代替時間が指定されていません`);
        return;
      }

      // Check if alternative time is in available slots
      const hasValidSlot = conflict.sharedAvailableSlots?.some(
        (slot) =>
          slot.startTime === action.alternativeStartTime &&
          slot.endTime === action.alternativeEndTime
      );

      if (!hasValidSlot) {
        errors.push(
          `${conflict.date}: 指定された代替時間は利用可能な時間帯にありません`
        );
      }
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}

// Example usage in a React component:
/*
function ConflictResolutionModal({ conflicts, onResolve, onCancel }) {
  const [choices, setChoices] = useState<ConflictResolutionChoice[]>([]);
  const recommendation = recommendResolutionStrategy(conflicts);

  const handleSubmit = () => {
    const sessionActions = choicesToSessionActions(choices);
    const validation = validateSessionActions(conflicts, sessionActions);

    if (!validation.valid) {
      alert('エラー: ' + validation.errors.join('\n'));
      return;
    }

    onResolve(sessionActions);
  };

  return (
    <div className="conflict-resolution-modal">
      <h2>スケジュール競合の解決</h2>

      <div className="recommendation">
        <h3>推奨解決策</h3>
        <p>{recommendation.reasoning}</p>
        {recommendation.autoResolution && (
          <button onClick={() => onResolve(recommendation.autoResolution)}>
            推奨設定を適用
          </button>
        )}
      </div>

      {conflicts.map(conflict => (
        <ConflictCard
          key={conflict.date}
          conflict={conflict}
          onChoiceChange={(choice) => {
            setChoices(prev => [...prev.filter(c => c.date !== choice.date), choice]);
          }}
        />
      ))}

      <div className="actions">
        <button onClick={onCancel}>キャンセル</button>
        <button onClick={handleSubmit}>適用</button>
      </div>
    </div>
  );
}
*/
