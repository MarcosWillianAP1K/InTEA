import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Users,
  Gamepad2,
  Calendar,
  Activity,
  Plus,
  ArrowRight,
  ChevronRight,
} from "lucide-react";
import { dashboardService } from "@/features/painel/services/dashboard.service";
import { USE_MOCK_DATA } from "@/core/api/http-client";
import type {
  DashboardMetricas,
  SessaoRecenteResumo,
  AlertaClinico,
} from "@/features/painel/types/dashboard.types";
import type { Patient } from "@/features/paciente/types/paciente.types";
import {
  useSessionStore,
  CardSessaoTimer,
  CardSessaoAtiva,
  ModalAnotacaoSessaoAtiva,
  sessaoService,
} from "@/features/sessao";
import { usePacienteStore } from "@/features/paciente/store/paciente.store";
import { SessionSocketManager } from "@/core/web.socket";
import { toast } from "sonner";


export function PainelPage() {
  const navigate = useNavigate();
  const [metricas, setMetricas] = useState<DashboardMetricas | null>(null);
  const [sessoesRecentes, setSessoesRecentes] = useState<SessaoRecenteResumo[]>([]);
  const [alertas, setAlertas] = useState<AlertaClinico[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalAnotacaoAtivaAberto, setModalAnotacaoAtivaAberto] = useState(false);

  const abrirModalPreSessao = useSessionStore((state) => state.abrirModalPreSessao);
  const { patients, setSelectedPatientId, fetchPatients } = usePacienteStore();

  const sessaoEmAndamento = sessoesRecentes.find(
    (s) =>
      s.status === "em_andamento" ||
      s.status === "conectado" ||
      s.status === "pausada"
  );

  const listaPacientes: Patient[] = Object.values(patients);
  const sessaoMaisRecente = sessoesRecentes[0];
  const pacienteDestaque =
    (sessaoMaisRecente
      ? listaPacientes.find(
          (p) => p.id === sessaoMaisRecente.pacienteId || p.name === sessaoMaisRecente.pacienteNome,
        )
      : undefined) ||
    listaPacientes.find((p) => p.name.includes("Pedro")) ||
    listaPacientes[0];

  useEffect(() => {
    void fetchPatients();
    async function carregarDados() {
      try {
        setLoading(true);
        const [m, s, a] = await Promise.all([
          dashboardService.obterMetricas(),
          dashboardService.listarSessoesRecentes(4),
          dashboardService.listarAlertas(),
        ]);
        setMetricas(m);
        setSessoesRecentes(s);
        setAlertas(a);
      } catch (err) {
        console.error("Erro ao carregar dados do dashboard:", err);
      } finally {
        setLoading(false);
      }
    }

    void carregarDados();
  }, [fetchPatients]);

  function handleVerPerfil(pacienteId?: string) {
    if (pacienteId) {
      setSelectedPatientId(pacienteId);
      navigate(`/pacientes/${pacienteId}`);
    }
  }

  function handleNovaSessao() {
    abrirModalPreSessao();
  }

  const handleTogglePausa = async (sessaoId: string, statusAtual: string) => {
    const isPausada = statusAtual === "pausada";
    const novoStatus: StatusSessaoResumo = isPausada ? "em_andamento" : "pausada";

    // 1. Atualização otimista e reativa na lista de sessões recentes
    setSessoesRecentes((prev) =>
      prev.map((s) => (s.id === sessaoId ? { ...s, status: novoStatus } : s))
    );

    // 2. Notifica store Zustand e socket WebSocket para o jogo
    if (isPausada) {
      useSessionStore.getState().retomarSessao();
      SessionSocketManager.getInstance().enviarComando({
        tipo: "retomar",
        sessionToken: sessaoId,
      });
      toast.success("Intervenção retomada.");
    } else {
      useSessionStore.getState().pausarSessao();
      SessionSocketManager.getInstance().enviarComando({
        tipo: "pausar",
        sessionToken: sessaoId,
      });
      toast.info("Intervenção pausada.");
    }

    // 3. Persistência no Banco de Dados (RF12, RF21)
    try {
      await sessaoService.atualizarStatus(sessaoId, novoStatus);
    } catch (err) {
      console.error("Erro ao sincronizar status de pausa no backend:", err);
    }
  };

  function formatarDuracao(segundos?: number): string {
    if (!segundos) return "14:00";
    const m = Math.floor(segundos / 60);
    const s = segundos % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }

  return (
    <div className="flex flex-1 flex-col gap-8 w-full max-w-7xl mx-auto pb-12">
      {/* SESSÃO ATIVA EM TEMPO REAL COM ACESSO DIRETO AO COCKPIT E ANOTAÇÕES (RF12, RF16) */}
      {sessaoEmAndamento && (
        <section aria-label="Sessão Clínica em Andamento" className="shrink-0">
          <CardSessaoAtiva
            sessaoId={sessaoEmAndamento.id}
            pacienteNome={sessaoEmAndamento.pacienteNome}
            pacienteId={sessaoEmAndamento.pacienteId}
            jogoTitulo={sessaoEmAndamento.jogoNome}
            dataHoraInicio={sessaoEmAndamento.dataHora}
            status={sessaoEmAndamento.status}
            onAcessarCockpit={() =>
              navigate(`/sessao/${encodeURIComponent(sessaoEmAndamento.id)}/monitoramento`)
            }
            onAbrirAnotacoes={() => setModalAnotacaoAtivaAberto(true)}
          />
        </section>
      )}

      {/* 1. SESSÃO PACIENTE SUMÁRIO (Figma Frame: 'Sessao paciente sumario') */}
      {pacienteDestaque && (
        <section
          data-testid="sessao-paciente-sumario"
          className="relative shrink-0 rounded-2xl border border-blue-100 bg-linear-to-r from-blue-50/80 via-indigo-50/50 to-white p-6 shadow-xs dark:border-blue-900/40 dark:from-blue-950/20 dark:to-background"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="relative shrink-0">
                <div className="h-14 w-14 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center font-bold text-xl shadow-md">
                  {pacienteDestaque.name.slice(0, 2).toUpperCase()}
                </div>
                <span className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-white bg-emerald-500 dark:border-background" />
              </div>

              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl font-bold tracking-tight text-foreground">
                    {pacienteDestaque.name}
                  </h2>
                  <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary dark:bg-primary/20 dark:text-primary-foreground">
                    {pacienteDestaque.category}
                  </span>
                  <span className="text-xs text-muted-foreground">• {pacienteDestaque.age} anos</span>
                </div>
                <p className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
                  <span>Status: <strong className="text-foreground font-medium">{pacienteDestaque.clinicalStatus}</strong></span>
                  <span>•</span>
                  <span>Última sessão: <strong className="text-foreground font-medium">{pacienteDestaque.lastSessionDate || "Hoje"}</strong></span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={() => handleVerPerfil(pacienteDestaque.id)}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-white px-4 py-2.5 text-xs font-semibold text-foreground shadow-xs transition-colors hover:bg-slate-50 dark:bg-muted dark:hover:bg-muted/80 cursor-pointer"
              >
                Ver Perfil
                <ArrowRight className="h-3.5 w-3.5" />
              </button>

              <button
                type="button"
                onClick={handleNovaSessao}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground shadow-xs transition-colors hover:bg-primary-hover cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                Iniciar Sessão
              </button>
            </div>
          </div>
        </section>
      )}

      {/* 2. CARDS DE MÉTRICAS CONSOLIDADAS DO PAINEL */}
      <section className="shrink-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl border border-border bg-card flex flex-col gap-2 shadow-xs transition-shadow hover:shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Sessões Realizadas</span>
            <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center dark:bg-primary/20">
              <Calendar className="h-4 w-4" />
            </div>
          </div>
          <span className="text-3xl font-extrabold text-primary">
            {loading ? "..." : (metricas?.sessoesNoMes ?? (USE_MOCK_DATA ? 24 : 0))}
          </span>
          <span className="text-xs text-muted-foreground">
            {metricas?.variacaoSessoesPercentual ? `${metricas.variacaoSessoesPercentual > 0 ? "+" : ""}${metricas.variacaoSessoesPercentual}% em relação ao mês anterior` : (USE_MOCK_DATA ? "+12% em relação à semana anterior" : "Métricas da API em tempo real")}
          </span>
        </div>

        <div className="p-5 rounded-2xl border border-border bg-card flex flex-col gap-2 shadow-xs transition-shadow hover:shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Pacientes Ativos</span>
            <div className="h-8 w-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center dark:bg-emerald-950/40 dark:text-emerald-400">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <span className="text-3xl font-extrabold text-foreground">
            {loading ? "..." : (metricas?.pacientesAtivos ?? listaPacientes.length)}
          </span>
          <span className="text-xs text-muted-foreground">
            Todos com planos terapêuticos ativos
          </span>
        </div>

        <div className="p-5 rounded-2xl border border-border bg-card flex flex-col gap-2 shadow-xs transition-shadow hover:shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Jogos Integrados</span>
            <div className="h-8 w-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center dark:bg-purple-950/40 dark:text-purple-400">
              <Gamepad2 className="h-4 w-4" />
            </div>
          </div>
          <span className="text-3xl font-extrabold text-foreground">
            {loading ? "..." : (metricas?.jogosMaisUtilizados?.length ?? (USE_MOCK_DATA ? 3 : 0))}
          </span>
          <span className="text-xs text-muted-foreground">
            Catálogo DDA e telemetria WebSocket
          </span>
        </div>

        <div className="p-5 rounded-2xl border border-border bg-card flex flex-col gap-2 shadow-xs transition-shadow hover:shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Alertas Clínicos</span>
            <div className="h-8 w-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center dark:bg-amber-950/40 dark:text-amber-400">
              <Activity className="h-4 w-4" />
            </div>
          </div>
          <span className="text-3xl font-extrabold text-foreground">
            {loading ? "..." : alertas.length}
          </span>
          <span className="text-xs text-muted-foreground">
            {alertas.length > 0 ? "Avisos DDA aguardando revisão" : "Nenhum sinal crítico recente"}
          </span>
        </div>
      </section>

      {/* 3. SEÇÃO SESSÕES RECENTES (Figma Frame: 'Sessões' & 'sessão - InTEA') */}
      <section className="shrink-0 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold tracking-tight text-foreground">
              Sessões Clínicas Recentes
            </h3>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700 dark:bg-muted dark:text-muted-foreground">
              {sessoesRecentes.length}
            </span>
          </div>

          <button
            type="button"
            onClick={handleNovaSessao}
            className="text-xs font-semibold text-primary hover:underline flex items-center gap-1 cursor-pointer"
          >
            Nova Intervenção
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="flex flex-col gap-3">
          {sessoesRecentes.map((sessao) => (
            <CardSessaoTimer
              key={sessao.id}
              sessaoId={sessao.id}
              pacienteNome={sessao.pacienteNome}
              jogoTitulo={sessao.jogoNome}
              duracaoSegundos={sessao.duracaoSegundos}
              dataHoraInicio={sessao.dataHora}
              status={sessao.status}
              onTogglePausa={() => handleTogglePausa(sessao.id, sessao.status)}
              onCockpitClick={() => navigate(`/sessao/${sessao.id}/monitoramento`)}
              onConcluirClick={() => navigate(`/sessao/${sessao.id}/resultado`)}
              onVerRelatorioClick={() => navigate(`/sessao/${sessao.id}/resultado`)}
            />
          ))}
        </div>
      </section>

      {/* 4. SEÇÃO MEUS PACIENTES (Tabela resumida fiel ao Figma 'Tabela de pacientes') */}
      <section className="shrink-0 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold tracking-tight text-foreground">
              Meus Pacientes
            </h3>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700 dark:bg-muted dark:text-muted-foreground">
              {listaPacientes.length}
            </span>
          </div>

          <Link
            to="/pacientes"
            className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
          >
            Ver todos os pacientes
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/75 border-b border-border text-muted-foreground font-semibold dark:bg-muted/50">
                <tr>
                  <th className="px-6 py-3.5">Nome do Paciente</th>
                  <th className="px-6 py-3.5">Diagnóstico / Plano</th>
                  <th className="px-6 py-3.5">Última Sessão</th>
                  <th className="px-6 py-3.5">Status Clínico</th>
                  <th className="px-6 py-3.5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {listaPacientes.slice(0, 5).map((p) => (
                  <tr key={p.id} className="transition-colors hover:bg-slate-50/50 dark:hover:bg-muted/30">
                    <td className="px-6 py-4 font-semibold text-foreground flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs dark:bg-primary/20 dark:text-primary-foreground">
                        {p.name.slice(0, 2).toUpperCase()}
                      </div>
                      <span>{p.name}</span>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 font-medium text-slate-800 dark:bg-slate-800 dark:text-slate-200">
                        {p.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {p.lastSessionDate || "Sem registros recentes"}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-2xs font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        {p.clinicalStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleVerPerfil(p.id)}
                        className="rounded-lg border border-border bg-white px-3 py-1 text-2xs font-semibold text-foreground hover:bg-slate-50 dark:bg-muted dark:hover:bg-muted/80 shadow-2xs cursor-pointer"
                      >
                        Ver Perfil
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Modal de Anotação Clínica da Sessão Ativa */}
      {sessaoEmAndamento && (
        <ModalAnotacaoSessaoAtiva
          aberto={modalAnotacaoAtivaAberto}
          onFechar={() => setModalAnotacaoAtivaAberto(false)}
          sessaoId={sessaoEmAndamento.id}
          pacienteId={sessaoEmAndamento.pacienteId}
          pacienteNome={sessaoEmAndamento.pacienteNome}
          isModoLivre={!sessaoEmAndamento.pacienteId}
        />
      )}
    </div>
  );
}

export default PainelPage;
