import { z } from "zod"

export const teacherRegularShiftSchema = z.object({
  teacherId: z.string(), 
  dayOfWeek: z.string(), 
  startTime: z.date(),   
  endTime: z.date(),     
  notes: z.string().nullable().optional(),
})

export const teacherSpecialShiftSchema = z.object({
  teacherId: z.string(),
  date: z.date(),       
  startTime: z.date(),   
  endTime: z.date(),     
  notes: z.string().nullable().optional(),
})

export type TeacherRegularShift = z.infer<typeof teacherRegularShiftSchema>
export type TeacherSpecialShift = z.infer<typeof teacherSpecialShiftSchema>