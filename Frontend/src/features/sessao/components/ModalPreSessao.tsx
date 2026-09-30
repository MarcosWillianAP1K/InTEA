import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Label } from "@/shared/components/ui/label";
import { useSessionStore } from "../store/sessionStore";
import { useSessionSync } from "../hooks/useSessionSync";
import { usePatientsStore } from "@/features/patients/store/patients.store";
import { toast } from "sonner";
import {
  Gamepad2,
  User,
  Clock,
  Copy,
  Check,
  CheckCircle2,
  Radio,
  AlertCircle,
  Play,
  RotateCcw,
} from "lucide-react";

/**
 * ============================================================================
 * MODAL DE PRÉ-SESSÃO E PAREAMENTO REMOTO (InTEA — Sprint 8)
 * Requisitos: RF09 (Catálogo de Jogos), RF10 (Pareamento Remoto), RF12 (Ciclo)
 * Padrão: Composição acessível de primitivos Radix UI com feedback reativo
 * ============================================================================
 */
export function ModalPreSessao() {
  // Sincronização em tempo real entre WebSocket e store global
  useSessionSync();

  const isModalAberto = useSessionStore((state) => state.isModalAberto);
  const status = useSessionStore((state) => state.status);
  const config = useSessionStore((state) => state.config);
  const pareamento = useSessionStore((state) => state.pareamento);
  const erro = useSessionStore((state) => state.erro);

  const fecharModal = useSessionStore((state) => state.fecharModal);
  const selecionarPaciente = useSessionStore((state) => state.selecionarPaciente);
  const configurarParametros = useSessionStore((state) => state.configurarParametros);
  const iniciarPareamento = useSessionStore((state) => state.iniciarPareamento);
  const iniciarIntervencao = useSessionStore((state) => state.iniciarIntervencao);
  const cancelarSessao = useSessionStore((state) => state.cancelarSessao);

  const patientsRecord = usePatientsStore((state) => state.patients);
  const listaPacientes = Object.values(patientsRecord);

  const [copiado, setCopiado] = useState(false);

  // Gera token amigável de demonstração no padrão alfanumérico InTEA
  function gerarPINAmigavel(): string {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let pin = "TEA-";
    for (let i = 0; i < 4; i++) {
      pin += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pin;
  }

  function handleAvancarParaPareamento() {
    if (!config?.pacienteId) {
      toast.error("Selecione um paciente para continuar.");
      return;
    }

    const token = gerarPINAmigavel();
    iniciarPareamento({
      sessionToken: token,
      tempoValidadeSegundos: 900, // 15 minutos (RNF03)
    });
    toast.info(`PIN de pareamento gerado: ${token}`);
  }

  async function handleCopiarPIN() {
    if (!pareamento?.sessionToken) return;

    try {
      await navigator.clipboard.writeText(pareamento.sessionToken);
      setCopiado(true);
      toast.success("Código de pareamento copiado!");
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      toast.error("Não foi possível copiar o código.");
    }
  }

  function handleIniciarJogo() {
    iniciarIntervencao();
    toast.success(`Intervenção clínica iniciada com "${config?.jogoTitulo}"!`);
  }

  function handleCancelar() {
    cancelarSessao("Sessão cancelada pelo terapeuta");
    toast.info("Configuração de sessão cancelada.");
  }

  if (!config) return null;

  const isPareandoOuAguardando =
    status === "aguardando_pareamento" ||
    status === "pareando" ||
    status === "pareado" ||
    status === "em_andamento";

  return (
    <Dialog open={isModalAberto} onOpenChange={(open) => !open && fecharModal()}>
      <DialogContent
        data-testid="modal-pre-sessao"
        className="sm:max-w-[540px] gap-5 p-6 rounded-2xl"
      >
        <DialogHeader className="gap-1.5">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
              <Gamepad2 className="h-4 w-4" />
            </span>
            <DialogTitle className="text-lg font-bold text-slate-800">
              {isPareandoOuAguardando
                ? "Pareamento Remoto da Sessão"
                : "Configuração Pré-Sessão Clínica"}
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-slate-500">
            {isPareandoOuAguardando
              ? "Digite o código abaixo no tablet ou dispositivo VR do paciente para conectar."
              : "Defina o paciente atendido e as diretrizes clínicas antes de iniciar a conexão."}
          </DialogDescription>
        </DialogHeader>

        {/* Badge Informativo do Jogo Selecionado */}
        <div className="flex items-center justify-between rounded-xl bg-slate-50 border border-slate-200/80 p-3.5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 text-white font-bold text-sm shadow-xs">
              ♟
            </div>
            <div>
              <p
                data-testid="sessao-jogo-titulo"
                className="text-sm font-bold text-slate-800"
              >
                {config.jogoTitulo}
              </p>
              <p
                data-testid="sessao-jogo-id"
                className="text-xs text-slate-500 font-mono"
              >
                ID: {config.jogoId}
              </p>
            </div>
          </div>
          <Badge variant="outline" className="bg-white text-blue-700 border-blue-200 text-xs">
            Sessão Clínica
          </Badge>
        </div>

        {/* ETAPA 1: Seleção de Paciente e Parâmetros */}
        {!isPareandoOuAguardando && (
          <div className="flex flex-col gap-4">
            {/* Campo de Seleção do Paciente */}
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-slate-500" />
                Paciente Atendido <span className="text-rose-500">*</span>
              </Label>
              <select
                data-testid="select-paciente"
                value={config.pacienteId}
                onChange={(e) => {
                  const pac = listaPacientes.find((p) => p.id === e.target.value);
                  if (pac) {
                    selecionarPaciente({ id: pac.id, nome: pac.name });
                  }
                }}
                className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 shadow-2xs focus:border-blue-600 focus:outline-hidden"
              >
                <option value="">Selecione o paciente cadastrado...</option>
                {listaPacientes.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.category})
                  </option>
                ))}
              </select>
            </div>

            {/* Duração Planejada */}
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-slate-500" />
                Duração Estimada
              </Label>
              <div className="grid grid-cols-4 gap-2">
                {[15, 30, 45, 60].map((min) => (
                  <button
                    key={min}
                    type="button"
                    onClick={() =>
                      configurarParametros({ duracaoPlanejadaMinutos: min })
                    }
                    className={`rounded-lg py-2 text-xs font-semibold transition border ${
                      config.duracaoPlanejadaMinutos === min
                        ? "bg-blue-50 border-blue-500 text-blue-700 shadow-2xs"
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {min} min
                  </button>
                ))}
              </div>
            </div>

            {/* Gatilhos Sensoriais a Evitar (RN03) */}
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
                Gatilhos a Evitar no DDA (RN03)
              </Label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  "Luzes estroboscópicas",
                  "Sons agudos",
                  "Vibração tátil",
                  "Tempo limite restrito",
                ].map((gatilho) => {
                  const ativo = config.gatilhosEvitar?.includes(gatilho);
                  return (
                    <button
                      key={gatilho}
                      type="button"
                      onClick={() => {
                        const atuais = config.gatilhosEvitar || [];
                        const novos = ativo
                          ? atuais.filter((g) => g !== gatilho)
                          : [...atuais, gatilho];
                        configurarParametros({ gatilhosEvitar: novos });
                      }}
                      className={`rounded-full px-3 py-1 text-2xs font-medium transition border ${
                        ativo
                          ? "bg-amber-100 text-amber-800 border-amber-300"
                          : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200"
                      }`}
                    >
                      {ativo ? "✓ " : "+ "}
                      {gatilho}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ETAPA 2: Exibição do Token e Status em Tempo Real */}
        {isPareandoOuAguardando && (
          <div className="flex flex-col items-center gap-5 py-2">
            {/* Bloco Destaque do PIN */}
            <div className="flex flex-col items-center gap-2 w-full">
              <span className="text-2xs font-bold uppercase tracking-wider text-slate-400">
                Código de Pareamento Remoto (PIN)
              </span>
              <div
                data-testid="pin-display"
                className="flex items-center justify-center gap-2 rounded-2xl bg-blue-50/70 border-2 border-dashed border-blue-200 px-6 py-4 w-full"
              >
                <span className="font-mono text-3xl font-extrabold tracking-widest text-blue-900">
                  {pareamento?.sessionToken || "----"}
                </span>
                <button
                  type="button"
                  onClick={handleCopiarPIN}
                  className="ml-3 flex h-9 w-9 items-center justify-center rounded-xl bg-white text-slate-600 shadow-xs border border-slate-200 transition hover:bg-slate-50 hover:text-blue-700"
                  title="Copiar Código"
                >
                  {copiado ? (
                    <Check className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
              </div>
              <p className="text-2xs text-slate-400">
                Válido por 15 minutos • Uso único por sessão
              </p>
            </div>

            {/* Indicador de Status Reativo */}
            <div
              data-testid="status-pareamento"
              className={`flex items-center gap-2.5 rounded-xl px-4 py-3 w-full text-xs font-semibold transition ${
                status === "pareado" || status === "em_andamento"
                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                  : "bg-amber-50 text-amber-800 border border-amber-200"
              }`}
            >
              {status === "pareado" || status === "em_andamento" ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <div className="flex-1">
                    <p className="font-bold">Dispositivo Pareado com Sucesso!</p>
                    {pareamento?.dispositivo && (
                      <p className="text-2xs text-emerald-700 font-normal">
                        Dispositivo: {pareamento.dispositivo.modelo || pareamento.dispositivo.deviceId} • Bateria:{" "}
                        {pareamento.dispositivo.bateria ? `${pareamento.dispositivo.bateria}%` : "100%"}
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <Radio className="h-4 w-4 text-amber-600 animate-pulse shrink-0" />
                  <div className="flex-1">
                    <p className="font-bold">Aguardando Conexão do Tablet/VR...</p>
                    <p className="text-2xs text-amber-700 font-normal">
                      Abra o aplicativo no dispositivo do paciente e digite o PIN.
                    </p>
                  </div>
                </>
              )}
            </div>

            {erro && (
              <div className="rounded-lg bg-rose-50 border border-rose-200 p-2.5 text-xs text-rose-700 w-full text-center">
                {erro}
              </div>
            )}
          </div>
        )}

        <DialogFooter className="flex items-center justify-between sm:justify-between w-full gap-2 pt-2 border-t border-slate-100">
          <Button
            type="button"
            variant="ghost"
            onClick={handleCancelar}
            className="text-xs text-slate-500 hover:text-slate-800"
          >
            Cancelar
          </Button>

          {!isPareandoOuAguardando ? (
            <Button
              type="button"
              onClick={handleAvancarParaPareamento}
              disabled={!config.pacienteId}
              className="bg-blue-900 hover:bg-blue-950 text-white text-xs font-semibold shadow-xs"
            >
              Gerar Código de Pareamento →
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleIniciarJogo}
              disabled={status !== "pareado"}
              className={`text-xs font-semibold shadow-xs flex items-center gap-1.5 ${
                status === "pareado"
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white animate-bounce-short"
                  : "bg-slate-200 text-slate-400 cursor-not-allowed"
              }`}
            >
              <Play className="h-3.5 w-3.5 fill-current" />
              Iniciar Intervenção Clínica
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
