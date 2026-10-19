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
import type {
  DashboardMetricas,
  SessaoRecenteResumo,
  AlertaClinico,
} from "@/features/painel/types/dashboard.types";
import type { Patient } from "@/features/paciente/types/paciente.types";
import { useSessionStore, CardSessaoTimer } from "@/features/sessao";
import { usePacienteStore } from "@/features/paciente/store/paciente.store";
import { ModalPreSessao } from "@/pages/modal";

export function PainelPage() {
  const navigate = useNavigate();
  const [metricas, setMetricas] = useState<DashboardMetricas | null>(null);
  const [sessoesRecentes, setSessoesRecentes] = useState<SessaoRecenteResumo[]>([]);
  const [alertas, setAlertas] = useState<AlertaClinico[]>([]);
  const [loading, setLoading] = useState(true);

  const abrirModalPreSessao = useSessionStore((state) => state.abrirModalPreSessao);
  const { patients, setSelectedPatientId } = usePacienteStore();

  const listaPacientes: Patient[] = Object.values(patients);
  const pacienteDestaque = listaPacientes.find((p) => p.name.includes("Pedro")) || listaPacientes[0];

  useEffect(() => {
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
  }, []);

  function handleVerPerfil(pacienteId?: string) {
    if (pacienteId) {
      setSelectedPatientId(pacienteId);
      navigate("/pacientes");
    }
  }

  function handleNovaSessao() {
    abrirModalPreSessao({
      id: "j-labirinto-01",
      titulo: "Labirinto Espacial",
    });
  }

  return (
    <div className="flex flex-1 flex-col gap-8 w-full max-w-7xl mx-auto pb-12 overflow-x-hidden">
      {/* 1. SESSÃO PACIENTE SUMÁRIO (Figma Frame: 'Sessao paciente sumario') */}
      {pacienteDestaque && (
        <section
          data-testid="sessao-paciente-sumario"
          className="relative overflow-hidden rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50/80 via-indigo-50/50 to-white p-6 shadow-xs dark:border-blue-900/40 dark:from-blue-950/20 dark:to-background"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="relative">
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
                <p className="text-xs text-muted-foreground flex items-center gap-2">
                  <span>Status: <strong className="text-foreground font-medium">{pacienteDestaque.clinicalStatus}</strong></span>
                  <span>•</span>
                  <span>Última sessão: <strong className="text-foreground font-medium">{pacienteDestaque.lastSessionDate || "Hoje"}</strong></span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
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
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl border border-border bg-card flex flex-col gap-2 shadow-xs transition-shadow hover:shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Sessões Realizadas</span>
            <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center dark:bg-primary/20">
              <Calendar className="h-4 w-4" />
            </div>
          </div>
          <span className="text-3xl font-extrabold text-primary">
            {loading ? "..." : (metricas?.sessoesNoMes ?? 24)}
          </span>
          <span className="text-xs text-muted-foreground">
            {metricas?.variacaoSessoesPercentual ? `${metricas.variacaoSessoesPercentual > 0 ? "+" : ""}${metricas.variacaoSessoesPercentual}% em relação ao mês anterior` : "+12% em relação à semana anterior"}
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
            {loading ? "..." : (metricas?.jogosMaisUtilizados?.length ?? 3)}
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
      <section className="flex flex-col gap-4">
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
              status={sessao.status}
              onCockpitClick={() => navigate(`/sessao/${sessao.id}/monitoramento`)}
              onConcluirClick={() => navigate(`/sessao/${sessao.id}/resultado`)}
            />
          ))}
        </div>
      </section>

      {/* 4. SEÇÃO MEUS PACIENTES (Tabela resumida fiel ao Figma 'Tabela de pacientes') */}
      <section className="flex flex-col gap-4">
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

      {/* MODAL GLOBAL DE PRÉ-SESSÃO E PAREAMENTO */}
      <ModalPreSessao />
    </div>
  );
}

export default PainelPage;
