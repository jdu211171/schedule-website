"use client"

import * as React from "react"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface GenericSelectEditableCellProps {
  value: string | null | undefined
  options: Array<{ value: string; label: string }>
  onSubmit: (value: string) => void | Promise<void>
  placeholder?: string
  disabled?: boolean
  className?: string
}

export const GenericSelectEditableCell = React.memo(function GenericSelectEditableCell({
  value,
  options,
  onSubmit,
  placeholder = "選択してください",
  disabled = false,
  className,
}: GenericSelectEditableCellProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const handleValueChange = React.useCallback(
    async (newValue: string) => {
      if (newValue !== value) {
        setIsSubmitting(true)
        try {
          await onSubmit(newValue)
        } catch (error) {
          console.error("Failed to update:", error)
        } finally {
          setIsSubmitting(false)
        }
      }
    },
    [value, onSubmit],
  )

  const currentValue = value || ""

  return (
    <Select 
      value={currentValue} 
      onValueChange={handleValueChange} 
      disabled={disabled || isSubmitting}
    >
      <SelectTrigger className={`h-8 w-full ${className || ""}`}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent align="start">
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
})