"use client"

import type React from "react"

import { toast } from "sonner"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface EditableCellProps {
  id: number
  value: string
  field: string
  header: string
  className?: string
}

export function EditableCell({ id, value, field, header, className }: EditableCellProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    toast.promise(new Promise((resolve) => setTimeout(resolve, 1000)), {
      loading: `Saving ${header}`,
      success: "Done",
      error: "Error",
    })
  }

  return (
    <form onSubmit={handleSubmit}>
      <Label htmlFor={`${id}-${field}`} className="sr-only">
        {field}
      </Label>
      <Input
        className={`h-8 w-16 border-transparent bg-transparent text-right shadow-none hover:bg-input/30 focus-visible:border focus-visible:bg-background ${className}`}
        defaultValue={value}
        id={`${id}-${field}`}
      />
    </form>
  )
}