"use client"

import * as React from "react"

import * as Editable from "@/components/ui/editable"

interface InlineEditableCellProps {
  value: string
  onSubmit: (value: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  readOnly?: boolean
  triggerMode?: "click" | "dblclick"
}

export const InlineEditableCell = React.memo(function InlineEditableCell({
  value,
  onSubmit,
  placeholder = "Click to edit...",
  className,
  disabled = false,
  readOnly = false,
  triggerMode = "click",
}: InlineEditableCellProps) {
  const [currentValue, setCurrentValue] = React.useState(value)
  const [isEditing, setIsEditing] = React.useState(false)

  // Update internal value when prop changes
  React.useEffect(() => {
    setCurrentValue(value)
  }, [value])

  const handleSubmit = React.useCallback(
    (newValue: string) => {
      console.log("Submitting value:", { old: value, new: newValue })
      setIsEditing(false)
      if (newValue !== value && newValue.trim() !== "") {
        onSubmit(newValue)
      }
      setCurrentValue(newValue)
    },
    [value, onSubmit],
  )

  const handleCancel = React.useCallback(() => {
    console.log("Cancelling edit")
    setIsEditing(false)
    setCurrentValue(value)
  }, [value])

  const handleEdit = React.useCallback(() => {
    console.log("Edit mode activated for:", value)
    setIsEditing(true)
  }, [value])

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
        disabled={disabled}
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