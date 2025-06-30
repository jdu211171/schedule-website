"use client"

import * as React from "react"
import { Eye, EyeOff, Copy, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface GenericPasswordEditableCellProps {
  value: string | null | undefined
  onSubmit?: (value: string) => void | Promise<void>
  editable?: boolean
  className?: string
}

export const GenericPasswordEditableCell = React.memo(function GenericPasswordEditableCell({
  value,
  onSubmit,
  editable = false,
  className,
}: GenericPasswordEditableCellProps) {
  const [isVisible, setIsVisible] = React.useState(false)
  const [isCopied, setIsCopied] = React.useState(false)
  const [isEditing, setIsEditing] = React.useState(false)
  const [editValue, setEditValue] = React.useState("")
  const inputRef = React.useRef<HTMLInputElement>(null)

  const password = value || ""

  const toggleVisibility = () => {
    setIsVisible((prev) => !prev)
  }

  const handleCopy = async () => {
    if (password) {
      try {
        await navigator.clipboard.writeText(password)
        setIsCopied(true)
        setTimeout(() => setIsCopied(false), 2000)
      } catch (error) {
        console.error("Failed to copy:", error)
      }
    }
  }

  const handleEdit = () => {
    if (editable && onSubmit) {
      setIsEditing(true)
      setEditValue(password)
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }

  const handleSubmit = async () => {
    if (editValue && editValue !== password && onSubmit) {
      try {
        await onSubmit(editValue)
        setIsEditing(false)
      } catch (error) {
        console.error("Failed to update password:", error)
      }
    } else {
      setIsEditing(false)
    }
  }

  const handleCancel = () => {
    setIsEditing(false)
    setEditValue("")
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSubmit()
    } else if (e.key === "Escape") {
      handleCancel()
    }
  }

  if (!password) return <span className="text-muted-foreground">-</span>

  if (isEditing) {
    return (
      <div className="flex items-center gap-1">
        <input
          ref={inputRef}
          type="password"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleSubmit}
          className="h-7 px-2 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>
    )
  }

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <span 
        className={cn(
          "font-mono text-sm cursor-pointer hover:text-primary",
          editable && "hover:underline"
        )}
        onClick={handleEdit}
      >
        {isVisible ? password : "•".repeat(Math.min(password.length, 8))}
      </span>
      <div className="flex items-center gap-0.5">
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={toggleVisibility}
        >
          {isVisible ? (
            <EyeOff className="h-3 w-3" />
          ) : (
            <Eye className="h-3 w-3" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={handleCopy}
        >
          {isCopied ? (
            <Check className="h-3 w-3 text-green-600" />
          ) : (
            <Copy className="h-3 w-3" />
          )}
        </Button>
      </div>
    </div>
  )
})