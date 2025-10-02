"use client";

import * as React from "react";
import { Copy, Check, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface GenericUsernameCopyCellProps {
  value: string | null | undefined;
  className?: string;
  // Optional custom formatter for LINE-ready copy text.
  formatLineText?: (username: string) => string;
}

export const GenericUsernameCopyCell = React.memo(function GenericUsernameCopyCell({
  value,
  className,
  formatLineText,
}: GenericUsernameCopyCellProps) {
  const username = value || "";
  const [copiedPlain, setCopiedPlain] = React.useState(false);
  const [copiedLine, setCopiedLine] = React.useState(false);

  const handleCopyPlain = async () => {
    if (!username) return;
    try {
      await navigator.clipboard.writeText(username);
      setCopiedPlain(true);
      setTimeout(() => setCopiedPlain(false), 2000);
    } catch (error) {
      console.error("Failed to copy username:", error);
    }
  };

  const handleCopyLine = async () => {
    if (!username) return;
    try {
      // Default LINE-ready format is: "> username" (used by webhook flows)
      const text = formatLineText ? formatLineText(username) : `> ${username}`;
      await navigator.clipboard.writeText(text);
      setCopiedLine(true);
      setTimeout(() => setCopiedLine(false), 2000);
    } catch (error) {
      console.error("Failed to copy LINE-ready username:", error);
    }
  };

  if (!username) return <span className="text-muted-foreground">-</span>;

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <span className="font-mono text-sm select-all">{username}</span>
      <div className="flex items-center gap-0.5">
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={handleCopyPlain}
          title="ユーザー名をコピー"
          aria-label="ユーザー名をコピー"
        >
          {copiedPlain ? (
            <Check className="h-3 w-3 text-green-600" />
          ) : (
            <Copy className="h-3 w-3" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={handleCopyLine}
          title={"LINE用にコピー (> ユーザー名)"}
          aria-label="LINE用にコピー"
        >
          {copiedLine ? (
            <Check className="h-3 w-3 text-green-600" />
          ) : (
            <MessageSquare className="h-3 w-3" />
          )}
        </Button>
      </div>
    </div>
  );
});
