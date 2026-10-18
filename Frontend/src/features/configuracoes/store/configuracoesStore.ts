import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Settings = {
  theme: "Sistema" | "light" | "dark";
  language: "pt" | "en" | "es";
  autoDelete: "7d" | "15d" | "30d" | "Nunca";
};

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