"use client";

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ShieldCheck,
  ShieldAlert,
  FileText,
  Users,
  Activity,
  RotateCw,
  Lock,
  ArrowLeft,
  CheckCircle2,
} from "lucide-react";
import { auditoriaAdminService } from "../services/auditoriaAdmin.service";
import type { EventoAuditoria, EstatisticasAuditoria } from "../types/admin.types";
import { TabelaAuditoria } from "../components/TabelaAuditoria";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { useAuthStore } from "@/features/autenticacao/store/authStore";
import { toast } from "sonner";

/**
 * ============================================================================
 * TELA: AUDITORIA E CONFORMIDADE CLÍNICA (InTEA)
 * Rota: /admin/auditoria
 * Padrão Visual: Alinhado a PainelPage, TodosPacientesPage e HistoricoSessoesPage
 * Atores: SuperAdmin da clínica / instituição
 * Conformidade: RF07 (Gestão SuperAdmin), RF08 (Auditoria de Vínculos e Acessos),
 *               RN04 (Isolamento Institucional), RN05 (Imutabilidade Forense).
 * ============================================================================
 */
export function AuditoriaAdminPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const [eventos, setEventos] = useState<EventoAuditoria[]>([]);
  const [estatisticas, setEstatisticas] = useState<EstatisticasAuditoria>({
    totalEventos: 0,
    acessosProntuario: 0,
    sessoesEIntervencoes: 0,
    alertasSeguranca: 0,
  });
  const [loading, setLoading] = useState(true);

  const carregarDados = async () => {
    try {
      setLoading(true);
      const [respostaEventos, dadosStats] = await Promise.all([
        auditoriaAdminService.listar({ limit: 100 }),
        auditoriaAdminService.buscarEstatisticas(),
      ]);

      setEventos(respostaEventos.data || []);
      setEstatisticas(dadosStats);
    } catch (err) {
      console.error("[AuditoriaAdminPage] Erro ao carregar dados de auditoria:", err);
      toast.error("Falha ao carregar registros da trilha de auditoria.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void carregarDados();
  }, []);

  return (
    <div className="flex flex-1 flex-col gap-6 w-full max-w-7xl mx-auto py-2 pb-12 overflow-x-hidden">
      {/* Botão de Navegação Voltar ao Painel */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/painel")}
          className="gap-2 text-xs text-muted-foreground hover:text-foreground cursor-pointer -ml-2 rounded-lg"
          data-testid="botao-voltar-painel"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Voltar para o Painel Principal</span>
        </Button>
      </div>

      {/* Cabeçalho Principal da Página (Figma standard 2xl card) */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card border border-border p-6 rounded-2xl shadow-xs">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Auditoria e Conformidade Clínica
            </h1>
            <Badge className="bg-primary/10 text-primary border-primary/20 text-xs font-semibold gap-1">
              <ShieldCheck className="h-3.5 w-3.5" />
              Painel SuperAdmin
            </Badge>
            <Badge variant="outline" className="text-xs text-muted-foreground">
              RF07 / RF08
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1 max-w-2xl leading-relaxed">
            Fiscalização institucional de acessos a prontuários, trilha forense imutável de
            intervenções e governança clínica em conformidade com a LGPD (RN04, RN05, RNF06).
          </p>
        </div>

        {/* Botão de Atualização Manual com Feedback de Loading */}
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={carregarDados}
            disabled={loading}
            className="h-10 text-xs font-semibold gap-2 border-border hover:bg-surface-alt rounded-xl cursor-pointer"
            data-testid="botao-atualizar-auditoria"
          >
            <RotateCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-primary" : ""}`} />
            <span>Atualizar</span>
          </Button>
        </div>
      </div>

      {/* Grid de Cards de Métricas e Indicadores de Governança (Padrão PainelPage) */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total de Eventos */}
        <div className="p-5 rounded-2xl border border-border bg-card flex flex-col gap-2 shadow-xs transition-shadow hover:shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Total de Eventos Auditados
            </span>
            <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center dark:bg-blue-950/40 dark:text-blue-400">
              <FileText className="h-4 w-4" />
            </div>
          </div>
          <span className="text-3xl font-extrabold text-foreground">
            {loading ? "..." : estatisticas.totalEventos}
          </span>
          <span className="text-xs text-muted-foreground flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            Trilha append-only imutável
          </span>
        </div>

        {/* Card 2: Acessos a Prontuários (RF08) */}
        <div className="p-5 rounded-2xl border border-border bg-card flex flex-col gap-2 shadow-xs transition-shadow hover:shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Acessos a Prontuários (RF08)
            </span>
            <div className="h-8 w-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center dark:bg-emerald-950/40 dark:text-emerald-400">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <span className="text-3xl font-extrabold text-foreground">
            {loading ? "..." : estatisticas.acessosProntuario}
          </span>
          <span className="text-xs text-muted-foreground">
            Consultas e evoluções de pacientes
          </span>
        </div>

        {/* Card 3: Sessões & Intervenções DDA */}
        <div className="p-5 rounded-2xl border border-border bg-card flex flex-col gap-2 shadow-xs transition-shadow hover:shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Sessões & DDA (RF13)
            </span>
            <div className="h-8 w-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center dark:bg-purple-950/40 dark:text-purple-400">
              <Activity className="h-4 w-4" />
            </div>
          </div>
          <span className="text-3xl font-extrabold text-foreground">
            {loading ? "..." : estatisticas.sessoesEIntervencoes}
          </span>
          <span className="text-xs text-muted-foreground">
            Pareamento, telemetria e IA em tempo real
          </span>
        </div>

        {/* Card 4: Bloqueios Preventivos (RN04) */}
        <div className="p-5 rounded-2xl border border-border bg-card flex flex-col gap-2 shadow-xs transition-shadow hover:shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Bloqueios de Acesso (RN04)
            </span>
            <div className="h-8 w-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center dark:bg-rose-950/40 dark:text-rose-400">
              <ShieldAlert className="h-4 w-4" />
            </div>
          </div>
          <span className="text-3xl font-extrabold text-foreground">
            {loading ? "..." : estatisticas.alertasSeguranca}
          </span>
          <span className="text-xs text-rose-600 dark:text-rose-400 font-medium">
            {estatisticas.alertasSeguranca > 0
              ? "Tentativas bloqueadas (403 Forbidden)"
              : "Nenhuma violação institucional"}
          </span>
        </div>
      </section>

      {/* Tabela Interativa de Auditoria com Busca, Filtros e Exportação */}
      <TabelaAuditoria
        eventos={eventos}
        loading={loading}
        onRecarregar={carregarDados}
      />

      {/* Aviso de Conformidade e Governança LGPD / CFM */}
      <div className="flex items-start sm:items-center gap-3.5 p-5 rounded-2xl bg-surface-alt dark:bg-surface-highlight border border-border text-xs text-muted-foreground shadow-xs">
        <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <Lock className="w-4 h-4" />
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="font-bold text-foreground text-xs">
            Invariante de Imutabilidade e Governança Clínica (RN05 / RNF06)
          </span>
          <p className="leading-relaxed">
            Os registros desta trilha são imutáveis e auditados continuamente. Operações de exclusão
            física (<code className="font-mono text-[11px] bg-background px-1.5 py-0.5 rounded-md border border-border">DELETE</code>)
            ou mutação manual de dados clínicos são estritamente bloqueadas por triggers no banco de
            dados em conformidade com as resoluções do CFM e o Art. 6º da Lei Geral de Proteção de Dados (LGPD).
          </p>
        </div>
      </div>
    </div>
  );
}

export default AuditoriaAdminPage;
