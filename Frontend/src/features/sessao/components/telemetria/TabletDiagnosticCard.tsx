import { Card, CardHeader, CardTitle, CardContent } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import {
  Wifi,
  WifiOff,
  Battery,
  BatteryMedium,
  BatteryLow,
  BatteryWarning,
  Activity,
  Tablet,
  AlertTriangle,
} from "lucide-react";

export interface TabletDiagnosticCardProps {
  latenciaMs?: number;
  bateria?: number;
  qualidadeSinal?: "excelente" | "bom" | "fraco" | "offline" | string;
  isConectado?: boolean;
  dispositivoNome?: string;
  reconnectando?: boolean;
}

/**
 * ============================================================================
 * COMPONENTE: TabletDiagnosticCard (Front-end 2 — Luma Maiara / Card 4.2)
 * Requisitos: RF12, RNF04
 * Monitora saúde do tablet: latência de rede, bateria, sinal e alertas de queda
 * ============================================================================
 */
export function TabletDiagnosticCard({
  latenciaMs = 42,
  bateria = 88,
  qualidadeSinal = "bom",
  isConectado = true,
  dispositivoNome = "Galaxy Tab S9 FE+",
  reconnectando = false,
}: TabletDiagnosticCardProps) {
  // Código semafórico de cores de latência
  let corLatencia = "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800";
  let textoLatencia = "Excelente";

  if (latenciaMs > 300) {
    corLatencia = "text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800";
    textoLatencia = "Instável (>300ms)";
  } else if (latenciaMs >= 100) {
    corLatencia = "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800";
    textoLatencia = "Atenção (100-300ms)";
  }

  // Ícone dinâmico de bateria
  const renderIconeBateria = () => {
    if (bateria <= 15) return <BatteryWarning className="h-4 w-4 text-rose-500 animate-bounce" />;
    if (bateria <= 30) return <BatteryLow className="h-4 w-4 text-amber-500" />;
    if (bateria <= 60) return <BatteryMedium className="h-4 w-4 text-emerald-500" />;
    return <Battery className="h-4 w-4 text-emerald-600" />;
  };

  return (
    <Card
      data-testid="tablet-diagnostic-card"
      className="rounded-2xl border border-border bg-card shadow-xs"
    >
      <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <Tablet className="h-4 w-4 text-[#0b3294] dark:text-blue-400" />
          <span>Diagnóstico do Tablet</span>
        </CardTitle>

        <Badge
          data-testid="status-conexao-badge"
          variant="outline"
          className={`text-2xs font-semibold ${
            isConectado && !reconnectando
              ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800"
              : "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-300 dark:border-rose-800"
          }`}
        >
          {isConectado && !reconnectando ? "Online" : "Desconectado"}
        </Badge>
      </CardHeader>

      <CardContent className="p-4 pt-2 flex flex-col gap-3">
        {/* Alerta em destaque se conexão cair */}
        {(!isConectado || reconnectando) && (
          <div
            data-testid="alerta-desconexao-tablet"
            className="flex items-center gap-2 rounded-xl bg-destructive/10 border border-destructive/30 p-2.5 text-xs text-destructive font-medium"
          >
            <AlertTriangle className="h-4 w-4 shrink-0 animate-pulse" />
            <span>
              {reconnectando
                ? "Tentando reconectar ao tablet do paciente..."
                : "Atenção: Comunicação interrompida com o tablet!"}
            </span>
          </div>
        )}

        <div className="text-xs font-semibold text-foreground truncate">
          {dispositivoNome}
        </div>

        {/* Linhas de métricas de saúde */}
        <div className="grid grid-cols-3 gap-2 pt-1 border-t border-border">
          {/* Latência RTT */}
          <div className="flex flex-col gap-1">
            <span className="text-2xs text-muted-foreground font-medium flex items-center gap-1">
              <Activity className="h-3 w-3" /> Latência
            </span>
            <div className="flex items-center gap-1.5">
              <span
                data-testid="valor-latencia"
                className="text-xs font-bold font-mono text-foreground"
              >
                {latenciaMs} ms
              </span>
            </div>
            <span
              data-testid="badge-latencia"
              className={`text-[10px] font-medium px-1.5 py-0.5 rounded-md border w-fit ${corLatencia}`}
            >
              {textoLatencia}
            </span>
          </div>

          {/* Bateria */}
          <div className="flex flex-col gap-1">
            <span className="text-2xs text-muted-foreground font-medium flex items-center gap-1">
              {renderIconeBateria()} Bateria
            </span>
            <span
              data-testid="valor-bateria"
              className="text-xs font-bold font-mono text-foreground"
            >
              {bateria}%
            </span>
            <span className="text-[10px] text-muted-foreground">
              {bateria <= 20 ? "Nível Crítico" : "Carregado"}
            </span>
          </div>

          {/* Sinal Wi-Fi */}
          <div className="flex flex-col gap-1">
            <span className="text-2xs text-muted-foreground font-medium flex items-center gap-1">
              {isConectado ? <Wifi className="h-3 w-3 text-[#0b3294] dark:text-blue-400" /> : <WifiOff className="h-3 w-3 text-destructive" />} Sinal
            </span>
            <span
              data-testid="valor-sinal"
              className="text-xs font-bold capitalize text-foreground"
            >
              {qualidadeSinal}
            </span>
            <span className="text-[10px] text-muted-foreground">
              Wi-Fi 5 GHz
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
