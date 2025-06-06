import { useState, useEffect } from "react";

interface TimePreset {
  label: string;
  start: string;
  end: string;
}

export function useTimePresets() {
  const [customPresets, setCustomPresets] = useState<TimePreset[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem("customTimePresets");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setCustomPresets(parsed);
        }
      } catch (e) {
        console.error("Failed to parse custom presets:", e);
      }
    }
  }, []);

  const addCustomPreset = (newPreset: TimePreset) => {
    const updatedCustomPresets = [...customPresets, newPreset];
    setCustomPresets(updatedCustomPresets);
    localStorage.setItem(
      "customTimePresets",
      JSON.stringify(updatedCustomPresets)
    );
  };

  const removeCustomPreset = (index: number) => {
    const updatedCustomPresets = customPresets.filter((_, i) => i !== index);
    setCustomPresets(updatedCustomPresets);
    localStorage.setItem(
      "customTimePresets",
      JSON.stringify(updatedCustomPresets)
    );
  };

  return {
    customPresets,
    addCustomPreset,
    removeCustomPreset,
  };
}
