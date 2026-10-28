import {
  Brain,
  VolumeX,
  Sun,
  TimerOff,
  AlertTriangle,
  EyeOff,
  Smartphone,
  Target,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";

export interface FormularioContextoDDAProps {
  nivelEstresse: number;
  onNivelEstresseChange: (n: number) => void;
  gatilhosAtivos: string[];
  onToggleGatilho: (g: string) => void;
  objetivoClinico?: string;
  onObjetivoClinicoChange?: (obj: string) => void;
  usarFallback?: boolean;
  onToggleFallback?: (val: boolean) => void;
  desabilitado?: boolean;
  className?: string;
}

export const GATILHOS_CATALOGADOS = [
  { nome: "Som Alto", icone: VolumeX, descricao: "Efeitos sonoros estridentes ou repentinos" },
  { nome: "Luz Intensa", icone: Sun, descricao: "Flashes brilhantes ou saturação visual excessiva" },
  { nome: "Pressão de Tempo", icone: TimerOff, descricao: "Contadores regressivos acelerados" },
  { nome: "Mudança Brusca", icone: AlertTriangle, descricao: "Transições repentinas de cenário ou mecânica" },
  { nome: "Estímulo Visual Excessivo", icone: EyeOff, descricao: "Múltiplos elementos simultâneos na tela" },
  { nome: "Vibração / Háptica", icone: Smartphone, descricao: "Feedback háptico contínuo ou vigoroso" },
] as const;

export const OBJETIVOS_CLINICOS = [
  { valor: "Foco Atencional", rotulo: "Foco Atencional", descricao: "Sustentação e alternância de atenção" },
  { valor: "Regulação Emocional", rotulo: "Regulação Emocional", descricao: "Tolerância à frustração e autorregulação" },
  { valor: "Coordenação Motora", rotulo: "Coordenação Motora", descricao: "Destreza fina, ritmo e tempo de resposta" },
  { valor: "Interação Social", rotulo: "Interação Social", descricao: "Engajamento, trocas de turno e cooperação" },
  { valor: "Comunicação e Linguagem", rotulo: "Comunicação e Linguagem", descricao: "Reconhecimento léxico e intenção comunicativa" },
] as const;

/**
 * ============================================================================
 * COMPONENTE: FormularioContextoDDA
 * Conformidade: RF12 (Ciclo da Sessão), RF17 (Injeção de Contexto DDA),
 *              RN03 (Injeção Pré-Sessão Obrigatória), Figura 5 e Figura 11
 *              RNF07 (Acessibilidade e Alvos de Toque >= 44x44px)
 * TypeScript Estrito: Sem uso de `any`
 * ============================================================================
 */
export function FormularioContextoDDA({
  nivelEstresse,
  onNivelEstresseChange,
  gatilhosAtivos,
  onToggleGatilho,
  objetivoClinico = "Foco Atencional",
  onObjetivoClinicoChange,
  usarFallback = false,
  onToggleFallback,
  desabilitado = false,
  className = "",
}: FormularioContextoDDAProps) {
  const camposDesabilitados = desabilitado || usarFallback;

  // Classificação semântica do nível de estresse
  function getSemanticaEstresse(nivel: number): {
    rotulo: string;
    cor: string;
    badgeVariant: "default" | "secondary" | "destructive" | "outline";
  } {
    if (nivel <= 2) {
      return { rotulo: "Baixo", cor: "text-emerald-500", badgeVariant: "secondary" };
    }
    if (nivel === 3) {
      return { rotulo: "Médio", cor: "text-amber-500", badgeVariant: "outline" };
    }
    return { rotulo: "Alto", cor: "text-destructive", badgeVariant: "destructive" };
  }

  const semantica = getSemanticaEstresse(nivelEstresse);

  return (
    <div
      data-testid="formulario-contexto-dda"
      className={`flex flex-col gap-5 rounded-2xl border border-border bg-card/60 p-5 shadow-xs ${className}`}
    >
      {/* Cabeçalho do Bloco DDA */}
      <div className="flex items-center justify-between border-b border-border/60 pb-3">
        <div className="flex items-center gap-2.5 text-primary">
          <Brain className="h-5 w-5 stroke-[2.2]" />
          <h3 className="text-base font-bold text-foreground tracking-tight">
            Contexto Clínico DDA (Pré-Sessão)
          </h3>
        </div>

        {/* Alternador / Fallback Parametrizado (Figura 5) */}
        {onToggleFallback && (
          <label className="flex items-center gap-2 text-xs font-semibold text-foreground cursor-pointer select-none">
            <input
              type="checkbox"
              data-testid="toggle-fallback-dda"
              checked={usarFallback}
              onChange={(e) => onToggleFallback(e.target.checked)}
              disabled={desabilitado}
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary cursor-pointer disabled:cursor-not-allowed"
            />
            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
            <span>Usar Parâmetros Padrão Homologados</span>
          </label>
        )}
      </div>

      {usarFallback && (
        <div
          data-testid="banner-fallback-ativo"
          className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-foreground flex items-center gap-2"
        >
          <Sparkles className="h-4 w-4 text-amber-600 shrink-0" />
          <span>
            <strong>Fallback Homologado Ativo:</strong> O motor DDA assumirá nível de estresse 1 (Baixo), herdará os gatilhos cadastrados no prontuário do paciente e o objetivo padrão do jogo.
          </span>
        </div>
      )}

      {/* 1. SELETOR DE NÍVEL DE ESTRESSE INICIAL (1 A 5) */}
      <div className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 font-bold text-foreground">
            <span>Nível de Estresse Inicial</span>
            <span className="text-muted-foreground font-normal">
              (Informa o estado autorregulatório prévio)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Classificação:</span>
            <Badge variant={semantica.badgeVariant} className="font-bold">
              {semantica.rotulo}
            </Badge>
            <span
              data-testid="valor-estresse"
              className="font-bold text-primary px-2.5 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-xs min-w-7 text-center"
            >
              {nivelEstresse}
            </span>
          </div>
        </div>

        {/* Botões de 1 a 5 com alvos de toque ergonômicos (RNF07) */}
        <div className="grid grid-cols-5 gap-2">
          {[1, 2, 3, 4, 5].map((lvl) => {
            const selecionado = nivelEstresse === lvl;
            return (
              <button
                key={lvl}
                type="button"
                onClick={() => onNivelEstresseChange(lvl)}
                disabled={camposDesabilitados}
                className={`min-h-11 min-w-11 flex flex-col items-center justify-center rounded-xl border text-sm font-bold transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${
                  selecionado
                    ? "bg-primary text-primary-foreground border-primary shadow-sm scale-[1.02]"
                    : "bg-background text-muted-foreground border-border hover:bg-accent hover:text-foreground"
                }`}
                aria-pressed={selecionado}
                aria-label={`Definir nível de estresse para ${lvl}`}
              >
                <span>{lvl}</span>
                <span className="text-[10px] font-normal opacity-80">
                  {lvl <= 2 ? "Baixo" : lvl === 3 ? "Médio" : "Alto"}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. CHIPS INTERATIVOS DE GATILHOS SENSORIAIS A EVITAR */}
      <div className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 font-bold text-foreground">
            <span>Gatilhos a Evitar</span>
            <span className="text-muted-foreground font-normal">
              (Estímulos que o Agente de IA deve suprimir em tempo real)
            </span>
          </div>
          <span className="text-xs text-muted-foreground">
            {gatilhosAtivos.length} selecionado(s)
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
          {GATILHOS_CATALOGADOS.map(({ nome, icone: Icone, descricao }) => {
            const ativo = gatilhosAtivos.includes(nome);
            return (
              <button
                key={nome}
                type="button"
                onClick={() => onToggleGatilho(nome)}
                disabled={camposDesabilitados}
                className={`min-h-11 min-w-11 flex items-center gap-2.5 p-3 rounded-xl border text-xs text-left transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${
                  ativo
                    ? "bg-destructive/15 text-destructive border-destructive/30 font-semibold shadow-xs"
                    : "bg-background text-muted-foreground border-border hover:bg-accent hover:text-foreground"
                }`}
                aria-pressed={ativo}
                title={descricao}
              >
                <div
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                    ativo ? "bg-destructive/20 text-destructive" : "bg-muted text-muted-foreground"
                  }`}
                >
                  <Icone className="h-4 w-4" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="truncate">{nome}</span>
                  <span className="text-[10px] text-muted-foreground truncate">{descricao}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. SELETOR DE OBJETIVO CLÍNICO DA SESSÃO */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs">
          <label
            htmlFor="select-objetivo-clinico"
            className="flex items-center gap-1.5 font-bold text-foreground cursor-pointer"
          >
            <Target className="h-3.5 w-3.5 text-primary" />
            <span>Objetivo Clínico da Sessão</span>
          </label>
          <span className="text-xs text-muted-foreground">
            Orienta os relatórios e métricas de DDA
          </span>
        </div>

        <div className="relative">
          <select
            id="select-objetivo-clinico"
            data-testid="select-objetivo-clinico"
            value={objetivoClinico}
            onChange={(e) => onObjetivoClinicoChange?.(e.target.value)}
            disabled={camposDesabilitados}
            className="w-full min-h-11 rounded-xl border border-border bg-background px-3.5 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
          >
            {OBJETIVOS_CLINICOS.map((obj) => (
              <option key={obj.valor} value={obj.valor}>
                {obj.rotulo} — {obj.descricao}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

export default FormularioContextoDDA;
