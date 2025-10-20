"use client";

import { create } from "zustand";

interface StudentSettingsStore {
  activeSection: string;
  setActiveSection: (section: string) => void;
}

export const useStudentSettingsStore = create<StudentSettingsStore>((set) => ({
  activeSection: "profile",
  setActiveSection: (section) => set({ activeSection: section }),
}));
