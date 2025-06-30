"use client"

import * as React from "react"
import * as Editable from "@/components/ui/editable"

interface GenericInlineEditableCellProps {
  value: string | null | undefined
  onSubmit: (value: string) => void | Promise<void>
  placeholder?: string
  className?: string
  disabled?: boolean
  readOnly?: boolean
  triggerMode?: "click" | "dblclick"
}

export const GenericInlineEditableCell = React.memo(function GenericInlineEditableCell({
  value,
  onSubmit,
  placeholder = "クリックして編集...",
  className,
  disabled = false,
  readOnly = false,
  triggerMode = "click",
}: GenericInlineEditableCellProps) {
  const [currentValue, setCurrentValue] = React.useState(value || "")
  const [isEditing, setIsEditing] = React.useState(false)
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  // Update internal value when prop changes
  React.useEffect(() => {
    setCurrentValue(value || "")
  }, [value])

  const handleSubmit = React.useCallback(
    async (newValue: string) => {
      setIsEditing(false)
      if (newValue !== (value || "") && newValue.trim() !== "") {
        setIsSubmitting(true)
        try {
          await onSubmit(newValue)
        } catch (error) {
          // Revert on error
          setCurrentValue(value || "")
          console.error("Failed to update:", error)
        } finally {
          setIsSubmitting(false)
        }
      } else {
        // Revert to original if empty or unchanged
        setCurrentValue(value || "")
      }
    },
    [value, onSubmit],
  )

  const handleCancel = React.useCallback(() => {
    setIsEditing(false)
    setCurrentValue(value || "")
  }, [value])

  const handleEdit = React.useCallback(() => {
    if (!disabled && !readOnly && !isSubmitting) {
      setIsEditing(true)
    }
  }, [disabled, readOnly, isSubmitting])

  return (
    <div className={`relative w-full ${className || ""}`}>
      <Editable.Root
        value={currentValue}
        onValueChange={setCurrentValue}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        onEdit={handleEdit}
        editing={isEditing}
        placeholder={placeholder}
        disabled={disabled || isSubmitting}
        readOnly={readOnly}
        triggerMode={triggerMode}
      >
        <Editable.Area className="w-full">
          <Editable.Preview className="w-full min-h-[2rem] flex items-center px-2 py-1 rounded hover:bg-muted/30 transition-colors cursor-pointer" />
          <Editable.Input className="w-full px-2 py-1 border-0 shadow-none focus:ring-2 focus:ring-primary/20 rounded bg-background" />
        </Editable.Area>
      </Editable.Root>
    </div>
  )
})