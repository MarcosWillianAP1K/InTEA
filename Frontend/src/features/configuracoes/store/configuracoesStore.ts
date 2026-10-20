import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { Settings } from "../types/settings.types";

export type Configuracoes = Settings;

interface SettingState {
  settings: Settings;
  updateSetting: <K extends keyof Settings>(
    key: K,
    value: Settings[K],
  ) => void;
}

export type ConfiguracoesState = SettingState;

export const useSettingStore = create<SettingState>()(
  persist(
    (set) => ({
      settings: {
        theme: "Sistema",
        language: "pt",
        autoDelete: "Nunca",
      },

      updateSetting: (key, value) =>
        set((state) => ({
          settings: {
            ...state.settings,
            [key]: value,
          },
        })),
    }),
    {
      name: "app:preferences",
    },
  ),
);

export const useConfiguracoesStore = useSettingStore;
export default useConfiguracoesStore;