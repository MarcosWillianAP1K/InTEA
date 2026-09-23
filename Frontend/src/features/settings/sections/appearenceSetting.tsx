import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/shared/components/ui/select";

import { toast } from "sonner";

import { Label } from "@/shared/components/ui/label";
import { Separator } from "@/shared/components/ui/separator";
import { useTheme } from "@/shared/providers/theme-provider";

import { useSettingStore } from "../store/settingsStore";
import { Monitor, Moon, Sun } from "lucide-react";

function SettingRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
      {children}
    </div>
  );
}

export default function GeneralSettings() {
  const { settings, updateSetting } = useSettingStore();
  const { setTheme } = useTheme();

  const handleUpdate = <K extends keyof typeof settings>(
    key: K,
    value: (typeof settings)[K],
  ) => {
    try {
      updateSetting(key, value);

      if (key === "theme") {
        const mapped =
          value === "Sistema" ? "system" : (value as "light" | "dark");
        setTheme(mapped as "system" | "light" | "dark");
      }

      toast.success("Preferências salvas com sucesso", {
        style: {
          background: "#68D14F",
          color: "white",
          border: "none",
        },
      });
    } catch (e) {
      toast.error("Erro ao salvar preferências", {
        style: {
          background: "#D14F4F",
          color: "white",
          border: "none",
        },
      });
    }
  };

  return (
    <div className="space-y-6 h-full overflow-y-auto">
      <div>
        <h2 className="text-lg font-semibold">Aparencia</h2>
      </div>

      <Separator />

      <div className="space-y-6">
        {/* THEME */}
        <SettingRow>
          <div>
            <Label className="text-base font-medium">Tema</Label>
            <p className="text-xs text-muted-foreground mt-1">
              Escolha o esquema de cores
            </p>
          </div>

          <Select
            defaultValue={settings.theme}
            onValueChange={(v: string) => handleUpdate("theme", v as any)}
          >
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>

            <SelectContent align="end">
              <SelectItem value="Sistema">
                <Monitor className="h-[1.2rem] w-[1.2rem] mr-2 text-muted-foreground" />
                Sistema
              </SelectItem>

              <SelectItem value="light">
                <Sun className="text-yellow-light h-[1.2rem] w-[1.2rem] mr-2" />
                Claro
              </SelectItem>

              <SelectItem value="dark">
                <Moon className="h-[1.2rem] w-[1.2rem] mr-2 text-muted-foreground" />
                Escuro
              </SelectItem>
            </SelectContent>
          </Select>
        </SettingRow>

        <Separator />

        {/* LANGUAGE
        <SettingRow>
          <div>
            <Label className="text-base font-medium">Idioma</Label>
            <p className="text-xs text-muted-foreground mt-1">
              Selecione o idioma da interface
            </p>
          </div>

          <Select
            defaultValue={settings.language}
            onValueChange={(v) => handleUpdate("language", v as any)}
          >
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>

            <SelectContent align="end">
              <SelectItem value="pt">Português</SelectItem>
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="es">Español</SelectItem>
            </SelectContent>
          </Select>
        </SettingRow>

        <Separator /> */}

        {/* AUTO DELETE */}
        {/* <SettingRow>
          <div>
            <Label className="text-base font-medium">Deleção de Chat</Label>
            <p className="text-xs text-muted-foreground mt-1">
              Chats serão automaticamente deletados após
            </p>
          </div>

          <Select
            defaultValue={settings.autoDelete}
            onValueChange={(v) => handleUpdate("autoDelete", v as any)}
          >
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>

            <SelectContent align="end">
              <SelectItem value="7d">7 dias</SelectItem>
              <SelectItem value="15d">15 dias</SelectItem>
              <SelectItem value="30d">30 dias</SelectItem>
              <SelectItem value="Nunca">Nunca</SelectItem>
            </SelectContent>
          </Select>
        </SettingRow> */}
      </div>
    </div>
  );
}
