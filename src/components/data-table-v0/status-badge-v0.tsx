import { CheckCircle2Icon, LoaderIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"

interface StatusBadgeProps {
  status: string
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <Badge variant="outline" className="flex gap-1 px-1.5 text-muted-foreground [&_svg]:size-3">
      {status === "Done" ? <CheckCircle2Icon className="text-green-500 dark:text-green-400" /> : <LoaderIcon />}
      {status}
    </Badge>
  )
}