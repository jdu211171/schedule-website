"use client"

import * as React from "react"

import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface ReviewerSelectProps {
  id: number
  reviewer: string
  onReviewerChange?: (reviewerId: number, reviewer: string) => void
}

const reviewerOptions = [
  "Eddie Lake",
  "Jamik Tashpulatov",
  "Maya Johnson",
  "Carlos Rodriguez",
  "Sarah Chen",
  "Raj Patel",
  "Leila Ahmadi",
  "Thomas Wilson",
]

export const ReviewerSelect = React.memo(function ReviewerSelect({
  id,
  reviewer,
  onReviewerChange,
}: ReviewerSelectProps) {
  const isAssigned = reviewer !== "Assign reviewer"

  const handleValueChange = React.useCallback(
    (value: string) => {
      onReviewerChange?.(id, value)
    },
    [id, onReviewerChange],
  )

  return (
    <>
      <Label htmlFor={`${id}-reviewer`} className="sr-only">
        Reviewer
      </Label>
      <Select value={isAssigned ? reviewer : ""} onValueChange={handleValueChange}>
        <SelectTrigger className="h-8 w-40" id={`${id}-reviewer`}>
          <SelectValue placeholder="Assign reviewer" />
        </SelectTrigger>
        <SelectContent align="end">
          {reviewerOptions.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </>
  )
})