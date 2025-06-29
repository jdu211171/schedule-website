"use client"

import { flexRender, type HeaderGroup } from "@tanstack/react-table"
import { z } from "zod"

import { TableHead, TableHeader as UITableHeader, TableRow } from "@/components/ui/table"

const schema = z.object({
  id: z.number(),
  header: z.string(),
  type: z.string(),
  status: z.string(),
  target: z.string(),
  limit: z.string(),
  reviewer: z.string(),
})

interface TableHeaderProps {
  headerGroups: HeaderGroup<z.infer<typeof schema>>[]
}

export function TableHeader({ headerGroups }: TableHeaderProps) {
  return (
    <UITableHeader className="sticky top-0 z-10 bg-muted">
      {headerGroups.map((headerGroup) => (
        <TableRow key={headerGroup.id}>
          {headerGroup.headers.map((header) => {
            return (
              <TableHead key={header.id} colSpan={header.colSpan}>
                {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
              </TableHead>
            )
          })}
        </TableRow>
      ))}
    </UITableHeader>
  )
}