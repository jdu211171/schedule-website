// src/types/user-preferences.ts

export type UserClassTypeVisibilityPreferenceDTO = {
  hiddenClassTypeIds: string[];
};

export type SetUserClassTypeVisibilityRequest = {
  hiddenClassTypeIds: string[];
};
