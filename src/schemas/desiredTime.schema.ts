import { z } from "zod"

export const desiredTimeSchema = z.object({
  dayOfWeek: z.string(), 
  startTime: z.string(), 
  endTime: z.string(),   
})

export type DesiredTimeInput = z.infer<typeof desiredTimeSchema>