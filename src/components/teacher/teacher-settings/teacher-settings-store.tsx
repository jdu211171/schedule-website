"use client"

import { create } from "zustand"

interface TeacherSettingsStore {
  activeSection: string
  setActiveSection: (section: string) => void
}

export const useTeacherSettingsStore = create<TeacherSettingsStore>((set) => ({
  activeSection: "profile",
  setActiveSection: (section) => set({ activeSection: section }),
}))
