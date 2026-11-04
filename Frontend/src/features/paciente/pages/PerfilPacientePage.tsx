"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  ShieldAlert,
  Play,
  Clock,
  Eye,
  AlertCircle,
  FileCheck,
  GitCompare,
  Activity,
  Stethoscope,
} from "lucide-react";
import { ModalCompararSessoes } from "../components/ModalCompararSessoes";
import { PainelEquipeMultidisciplinar } from "../components/PainelEquipeMultidisciplinar";
import { ModalVincularEspecialista } from "../components/ModalVincularEspecialista";
import { BadgeAutoriaMultidisciplinar } from "../components/BadgeAutoriaMultidisciplinar";
import { pacienteService } from "../services/paciente.service";
import type { Paciente, EspecialistaVinculado } from "../types/paciente.types";
import { terapeutaService } from "@/features/terapeuta/services/terapeuta.service";
import type { Terapeuta } from "@/features/terapeuta/types/terapeuta.types";
import { GerenciadorAnotacoesProntuario } from "@/features/anotacao";
import { useAuthStore } from "@/features/autenticacao/store/authStore";
import { sessaoService } from "@/features/sessao/services/sessaoService";
import type { Sessao } from "@/features/sessao/types/sessao.types";
import { useSessionStore } from "@/features/sessao/store/sessionStore";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Skeleton } from "@/shared/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { toast } from "sonner";

/**
 * ============================================================================
 * PAGE: PATIENT PROFILE (InTEA)
 * Integration: pacienteService, anotacaoService, sessaoService
 * Compliance: RF06, RF10, RF15, RF18, RF21, RN04, RN05, RNF07
 * ============================================================================
 */
export function PerfilPacientePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [paciente, setPaciente] = useState<Paciente | null>(null);
  const [sessoes, setSessoes] = useState<Sessao[]>([]);
  const [sessoesSelecionadas, setSessoesSelecionadas] = useState<string[]>([]);
  const [modalCompararAberto, setModalCompararAberto] = useState(false);
  const [loading, setLoading] = useState(true);
  const [erroProntuario, setErroProntuario] = useState<string | null>(null);

  // Estados da Equipe Multidisciplinar (RF18, RN04)
  const [especialistas, setEspecialistas] = useState<EspecialistaVinculado[]>([]);
  const [terapeutasClinica, setTerapeutasClinica] = useState<Terapeuta[]>([]);
  const [loadingEquipe, setLoadingEquipe] = useState<boolean>(false);
  const [erroEquipe, setErroEquipe] = useState<string | null>(null);
  const [alertaConflitoEquipe, setAlertaConflitoEquipe] = useState<string | null>(null);
  const [modalVincularAberto, setModalVincularAberto] = useState<boolean>(false);
  const [isSubmittingVinculo, setIsSubmittingVinculo] = useState<boolean>(false);
  const [erroModalVinculo, setErroModalVinculo] = useState<string | null>(null);
  const [removendoEspecialistaId, setRemovendoEspecialistaId] = useState<string | null>(null);

  const user = useAuthStore((s) => s.user);
  const abrirModalPreSessao = useSessionStore((s) => s.abrirModalPreSessao);
  const selecionarPaciente = useSessionStore((s) => s.selecionarPaciente);

  const carregarEquipeMultidisciplinar = useCallback(
    async (pacienteId: string, dadosPacienteFallback?: Paciente | null) => {
      setLoadingEquipe(true);
      setErroEquipe(null);
      try {
        const buscaVinculados = async () => {
          if (typeof pacienteService.listarTerapeutasVinculados === "function") {
            try {
              const res = await pacienteService.listarTerapeutasVinculados(pacienteId);
              if (res && res.length > 0) return res;
            } catch {
              // fallback
            }
          }
          if (typeof pacienteService.listarTerapeutas === "function") {
            try {
              const resOld = await pacienteService.listarTerapeutas(pacienteId);
              if (resOld && resOld.length > 0) {
                return resOld.map((v) => ({
                  id: (v.terapeuta as unknown as { id?: string })?.id ?? v.terapeuta_id,
                  nome: (v.terapeuta as unknown as { nome?: string })?.nome ?? "Especialista da Equipe",
                  email: (v.terapeuta as unknown as { email?: string })?.email ?? null,
                  especialidade: (v.terapeuta as unknown as { especialidade?: string })?.especialidade ?? "Equipe Multidisciplinar",
                  registro_profissional:
                    (v.terapeuta as unknown as { registro_profissional?: string })?.registro_profissional ??
                    (v.terapeuta as unknown as { crefito?: string })?.crefito ??
                    null,
                  status_ativo: true,
                })) as EspecialistaVinculado[];
              }
            } catch {
              // fallback
            }
          }
          return [];
        };

        const [listaVinculados, listaClinica] = await Promise.all([
          buscaVinculados(),
          terapeutaService.listar
            ? terapeutaService.listar().catch(() => [] as Terapeuta[])
            : Promise.resolve([] as Terapeuta[]),
        ]);

        setTerapeutasClinica(listaClinica);

        if (listaVinculados && listaVinculados.length > 0) {
          setEspecialistas(listaVinculados);
        } else if (dadosPacienteFallback?.terapeutas?.length) {
          setEspecialistas(
            dadosPacienteFallback.terapeutas.map((v) => ({
              id: v.terapeuta?.id ?? v.terapeuta_id,
              nome: v.terapeuta?.nome ?? "Especialista da Equipe",
              email: v.terapeuta?.email ?? null,
              telefone: v.terapeuta?.telefone ?? null,
              crp: v.terapeuta?.crp ?? null,
              crefito: v.terapeuta?.crefito ?? null,
              registro_profissional:
                v.terapeuta?.registro_profissional ??
                v.terapeuta?.crefito ??
                v.terapeuta?.crp ??
                null,
              especialidade:
                v.terapeuta?.especialidade ?? "Equipe Multidisciplinar",
              papel_equipe: v.papel_equipe ?? "Equipe Multidisciplinar",
              created_at: v.created_at,
              status_ativo: v.terapeuta?.status_ativo ?? true,
            })),
          );
        } else {
          setEspecialistas([]);
        }
      } catch (err) {
        const msg =
          err instanceof Error
            ? err.message
            : "Falha ao carregar os especialistas vinculados ao paciente.";
        setErroEquipe(msg);
      } finally {
        setLoadingEquipe(false);
      }
    },
    [],
  );

  const carregarDados = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      setErroProntuario(null);
      const [dadosPaciente, resSessoes] = await Promise.all([
        pacienteService.buscarPorId(id),
        sessaoService.listar({ pacienteId: id }),
      ]);

      setPaciente(dadosPaciente);
      setSessoes(
        (resSessoes?.data || []).filter(
          (s) => s.status_sessao !== "aguardando_pareamento",
        ),
      );
      await carregarEquipeMultidisciplinar(id, dadosPaciente);
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "Erro inesperado ao consultar prontuário do paciente.";
      setErroProntuario(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [id, carregarEquipeMultidisciplinar]);

  useEffect(() => {
    void carregarDados();
  }, [carregarDados]);

  const toggleSelecaoSessao = (sessaoId: string) => {
    setSessoesSelecionadas((prev) => {
      if (prev.includes(sessaoId)) {
        return prev.filter((s) => s !== sessaoId);
      }
      if (prev.length >= 2) {
        toast.info("Você já selecionou duas sessões. Desmarque uma para escolher outra.");
        return prev;
      }
      return [...prev, sessaoId];
    });
  };

  const handleIniciarAtendimento = () => {
    if (!paciente) return;

    const sessaoEmAndamento = sessoes.find(
      (s) =>
        s.status_sessao === "em_andamento" ||
        s.status_sessao === "conectado" ||
        s.status_sessao === "pausada",
    );

    if (sessaoEmAndamento) {
      const condutorOutro =
        sessaoEmAndamento.terapeuta_id &&
        sessaoEmAndamento.terapeuta_id !== user?.id;
      const nomeCondutor =
        sessaoEmAndamento.terapeuta?.nome ||
        especialistas.find((e) => e.id === sessaoEmAndamento.terapeuta_id)?.nome ||
        "outro especialista da equipe";

      if (condutorOutro) {
        setAlertaConflitoEquipe(
          `Conflito 409: O paciente já possui um atendimento ativo conduzido por ${nomeCondutor}. Você pode acompanhar a sessão em tempo real pelo Cockpit em modo observador.`,
        );
        toast.warning(
          `Atendimento ativo em andamento por ${nomeCondutor}. Redirecionando para o Cockpit em modo observador.`,
        );
        navigate(`/sessao/${sessaoEmAndamento.id}/monitoramento`);
        return;
      }

      toast.info("Retomando atendimento clínico em andamento.");
      navigate(`/sessao/${sessaoEmAndamento.id}/monitoramento`);
      return;
    }

    selecionarPaciente({
      id: paciente.id,
      nome: paciente.nome,
    });
    abrirModalPreSessao();
  };

  const handleConfirmarVinculoEspecialista = async (terapeutaId: string) => {
    if (!id || !terapeutaId) return;

    setIsSubmittingVinculo(true);
    setErroModalVinculo(null);

    try {
      await pacienteService.vincularTerapeuta(id, terapeutaId);
      toast.success("Especialista vinculado à equipe multidisciplinar com sucesso!");
      setModalVincularAberto(false);
      await carregarEquipeMultidisciplinar(id, paciente);
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "Erro ao vincular especialista. Verifique as permissões clínicas.";
      setErroModalVinculo(msg);
      toast.error(msg);
    } finally {
      setIsSubmittingVinculo(false);
    }
  };

  const handleDesvincularEspecialista = async (terapeutaId: string) => {
    if (!id || !terapeutaId) return;

    if (especialistas.length <= 1) {
      const msgBloqueio =
        "Regra Anti-Órfão (RN04): O paciente não pode ficar sem nenhum especialista responsável.";
      setAlertaConflitoEquipe(msgBloqueio);
      toast.warning(msgBloqueio);
      return;
    }

    setRemovendoEspecialistaId(terapeutaId);
    try {
      await pacienteService.desvincularTerapeuta(id, terapeutaId);
      toast.success("Especialista desvinculado da equipe do paciente com sucesso.");
      await carregarEquipeMultidisciplinar(id, paciente);
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "Falha ao desvincular especialista da equipe.";
      setAlertaConflitoEquipe(msg);
      toast.error(msg);
    } finally {
      setRemovendoEspecialistaId(null);
    }
  };

  const calcularIdade = (dataNasc?: string) => {
    if (!dataNasc) return null;
    const nasc = new Date(dataNasc);
    const hoje = new Date();
    let idade = hoje.getFullYear() - nasc.getFullYear();
    const m = hoje.getMonth() - nasc.getMonth();
    if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) {
      idade--;
    }
    return idade;
  };

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-24 rounded-lg" />
          <Skeleton className="h-8 w-64 rounded-lg" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-64 w-full rounded-2xl" />
          <Skeleton className="h-64 w-full rounded-2xl md:col-span-2" />
        </div>
        <Skeleton className="h-72 w-full rounded-2xl" />
      </div>
    );
  }

  if (erroProntuario && !paciente) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center flex flex-col items-center gap-4">
          <AlertCircle className="h-10 w-10 text-destructive" />
          <h2 className="text-lg font-bold text-destructive">Falha ao Carregar Prontuário</h2>
          <p className="text-sm text-muted-foreground max-w-md">{erroProntuario}</p>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => navigate("/pacientes")}>
              Voltar para Pacientes
            </Button>
            <Button onClick={() => void carregarDados()}>Tentar Novamente</Button>
          </div>
        </div>
      </div>
    );
  }

  if (!paciente) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="rounded-2xl border border-border bg-card p-8 text-center flex flex-col items-center gap-4">
          <User className="h-10 w-10 text-muted-foreground" />
          <h2 className="text-lg font-bold">Paciente não localizado</h2>
          <p className="text-sm text-muted-foreground">
            O identificador informado não corresponde a nenhum paciente ativo cadastrado no sistema.
          </p>
          <Button variant="outline" onClick={() => navigate("/pacientes")}>
            Voltar para Pacientes
          </Button>
        </div>
      </div>
    );
  }

  const idade = calcularIdade(paciente.data_nascimento);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      {/* Topo / Navegação */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/pacientes")}
            className="h-9 w-9 p-0 rounded-xl"
            title="Voltar"
          >
            <ArrowLeft className="h-5 w-5 text-muted-foreground" />
          </Button>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
                {paciente.nome}
              </h1>
              <Badge variant="outline" className="text-xs bg-muted/50 border-primary/20 text-primary font-semibold">
                Prontuário: #{paciente.id.slice(0, 8)}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Cadastro Geral e Histórico Clínico do Paciente
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/pacientes/${paciente.id}/historico`)}
            className="min-h-11 px-4 text-xs font-semibold gap-1.5 cursor-pointer"
          >
            <Clock className="h-4 w-4" />
            <span>Histórico de Sessões</span>
          </Button>

          <Button
            size="sm"
            onClick={handleIniciarAtendimento}
            className="min-h-11 px-4 text-xs font-semibold gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer shadow-xs"
          >
            <Play className="h-4 w-4 fill-current" />
            <span>Iniciar Sessão Clínica</span>
          </Button>
        </div>
      </div>

      {/* Grid de Informações Principais */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Card: Dados Básicos */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-xs flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                <User className="h-4 w-4 text-primary" />
                Dados Básicos
              </h2>
              <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[11px]">
                Cadastro Ativo
              </Badge>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between py-1 border-b border-border/30">
                <span className="text-muted-foreground">Idade:</span>
                <span className="font-semibold text-foreground">
                  {idade !== null ? `${idade} anos` : "Não informada"}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/30">
                <span className="text-muted-foreground">Data de Nascimento:</span>
                <span className="font-semibold text-foreground">
                  {paciente.data_nascimento
                    ? new Date(paciente.data_nascimento).toLocaleDateString("pt-BR")
                    : "Não informada"}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/30">
                <span className="text-muted-foreground">CPF:</span>
                <span className="font-mono text-foreground font-semibold">
                  {paciente.cpf || "Não informado"}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/30">
                <span className="text-muted-foreground">Telefone:</span>
                <span className="text-foreground font-semibold flex items-center gap-1">
                  <Phone className="h-3 w-3 text-muted-foreground" />
                  {paciente.telefone || "Não informado"}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground">Localidade:</span>
                <span className="text-foreground font-semibold">
                  {paciente.cidade && paciente.estado
                    ? `${paciente.cidade} - ${paciente.estado}`
                    : "Não informada"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Card: Responsáveis Legais */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-xs flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-primary" />
                Responsáveis Legais
              </h2>
              <Badge variant="outline" className="text-[11px] font-semibold">
                {paciente.responsaveis?.length || 0} vinculado(s)
              </Badge>
            </div>

            {paciente.responsaveis && paciente.responsaveis.length > 0 ? (
              <div className="space-y-3">
                {paciente.responsaveis.map((resp) => (
                  <div
                    key={resp.id}
                    className="p-3 rounded-xl bg-muted/40 border border-border/50 text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-foreground">{resp.nome}</span>
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                        {resp.parentesco || "Responsável"}
                      </Badge>
                    </div>
                    {resp.telefone && (
                      <p className="text-muted-foreground flex items-center gap-1.5">
                        <Phone className="h-3 w-3" />
                        {resp.telefone}
                      </p>
                    )}
                    {resp.email && (
                      <p className="text-muted-foreground flex items-center gap-1.5 truncate">
                        <Mail className="h-3 w-3" />
                        {resp.email}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic py-4">
                Nenhum responsável legal cadastrado.
              </p>
            )}
          </div>
        </div>

        {/* Card: Resumo de Atendimento Clínico */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-xs flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                <FileCheck className="h-4 w-4 text-primary" />
                Resumo Longitudinal
              </h2>
            </div>

            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/10 flex items-center justify-between">
                <div>
                  <p className="text-[11px] text-muted-foreground">Total de Intervenções</p>
                  <p className="text-xl font-extrabold text-primary">{sessoes.length}</p>
                </div>
                <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                  <Clock className="h-5 w-5" />
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-muted/40 border border-border/50 flex items-center justify-between">
                <div>
                  <p className="text-[11px] text-muted-foreground">Especialistas Vinculados</p>
                  <p className="text-xl font-extrabold text-foreground">{especialistas.length}</p>
                </div>
                <div className="p-2.5 rounded-xl bg-muted text-muted-foreground">
                  <User className="h-5 w-5" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Observações Clínicas Relevantes */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-2">
        <h2 className="text-sm font-bold text-foreground">Diretrizes Sensoriais e Comportamentais</h2>
        <p className="text-xs text-muted-foreground leading-relaxed">
          CID-11: 6A02 (Transtorno do Espectro Autista). Paciente com acompanhamento multidisciplinar ativo.
          Recomenda-se sessões com estímulos cromáticos suaves, ritmo moderado de tarefas e pausas orientadas para regulação sensorial.
        </p>
      </div>

      {/* Seção: Equipe Multidisciplinar (Especialistas Vinculados) — RF18, RN04 */}
      {alertaConflitoEquipe && (
        <div
          role="alert"
          data-testid="alerta-conflito-equipe"
          className="rounded-2xl border border-amber-300 bg-amber-50 p-4 flex items-start justify-between gap-3 text-amber-900 text-xs font-semibold shadow-2xs"
        >
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>{alertaConflitoEquipe}</span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setAlertaConflitoEquipe(null)}
            className="h-7 px-2 text-xs text-amber-800 hover:bg-amber-100"
          >
            Fechar
          </Button>
        </div>
      )}

      <PainelEquipeMultidisciplinar
        especialistas={especialistas}
        usuarioLogadoId={user?.id}
        loading={loadingEquipe}
        erro={erroEquipe}
        removendoId={removendoEspecialistaId}
        onAbrirModalVincular={() => {
          setErroModalVinculo(null);
          setModalVincularAberto(true);
        }}
        onDesvincularEspecialista={handleDesvincularEspecialista}
        onRetry={() => {
          if (id) void carregarEquipeMultidisciplinar(id, paciente);
        }}
      />

      {/* Seção: Anotações Clínicas do Prontuário (RF16, RN05) */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-4">
        <div className="border-b border-border/60 pb-3">
          <h2 className="text-sm font-bold text-foreground">
            Anotações Clínicas e Evolução Comportamental
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Registro indelével da evolução longitudinal do paciente, com salvamento local automático de rascunhos.
          </p>
        </div>

        <GerenciadorAnotacoesProntuario
          pacienteId={paciente.id}
          usuarioLogadoId={user?.id}
        />
      </div>

      {/* Seção: Histórico Recente de Sessões */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
          <div>
            <h2 className="text-sm font-bold text-foreground">
              Intervenções Recentes
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Selecione até duas sessões para visualização comparativa lado a lado (RF15).
            </p>
          </div>

          <div className="flex items-center gap-2">
            {sessoesSelecionadas.length === 2 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setModalCompararAberto(true)}
                className="h-8 text-xs font-semibold gap-1.5 border-primary/30 text-primary hover:bg-primary/10"
              >
                <GitCompare className="h-3.5 w-3.5" />
                <span>Comparar 2 Sessões</span>
              </Button>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/pacientes/${paciente.id}/historico`)}
              className="h-8 text-xs font-semibold text-muted-foreground hover:text-foreground"
            >
              Ver todas as sessões
            </Button>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-b border-border/60">
              <TableHead className="w-12 text-center text-xs font-bold text-foreground">
                Sel.
              </TableHead>
              <TableHead className="text-xs font-bold text-foreground">Game Terapêutico</TableHead>
              <TableHead className="text-xs font-bold text-foreground">Especialista (Equipe Multidisciplinar)</TableHead>
              <TableHead className="text-xs font-bold text-foreground">Data de Realização</TableHead>
              <TableHead className="text-xs font-bold text-foreground">Status</TableHead>
              <TableHead className="text-right text-xs font-bold text-foreground pr-6">Relatório</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sessoes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-xs text-muted-foreground">
                  Nenhuma sessão clínica registrada até o momento.
                </TableCell>
              </TableRow>
            ) : (
              sessoes.map((s) => {
                const espVinculado = especialistas.find(
                  (e) => e.id === s.terapeuta_id,
                );
                const nomeEspecialistaSessao =
                  s.terapeuta?.nome ||
                  espVinculado?.nome ||
                  "Especialista da Equipe";
                const especialidadeSessao =
                  espVinculado?.especialidade ||
                  s.terapeuta?.registro_profissional ||
                  "Equipe Multidisciplinar";

                return (
                <TableRow key={s.id} className="hover:bg-muted/30 border-b border-border/60">
                  <TableCell className="text-center py-3">
                    <input
                      type="checkbox"
                      checked={sessoesSelecionadas.includes(s.id)}
                      onChange={() => toggleSelecaoSessao(s.id)}
                      className="rounded border-border text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                      title="Selecionar para comparação"
                    />
                  </TableCell>
                  <TableCell className="text-xs font-semibold text-foreground py-3">
                    {s.jogo?.nome || s.jogo?.titulo || "Jogo Terapêutico"}
                  </TableCell>
                  <TableCell
                    data-testid={`autoria-sessao-${s.id}`}
                    className="text-xs py-3"
                  >
                    <div className="flex flex-col gap-1">
                      <span className="font-bold text-foreground flex items-center gap-1.5">
                        <Stethoscope className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                        {nomeEspecialistaSessao}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {especialidadeSessao}
                      </span>
                      <BadgeAutoriaMultidisciplinar
                        autorId={s.terapeuta_id}
                        autorNome={nomeEspecialistaSessao}
                        usuarioLogadoId={user?.id}
                        size="sm"
                      />
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground py-3">
                    {s.data_hora_inicio ? new Date(s.data_hora_inicio).toLocaleString("pt-BR") : ""}
                  </TableCell>
                  <TableCell className="py-3">
                    {s.status_sessao === "pausada" ? (
                      <Badge className="bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-700 text-[11px] font-semibold gap-1">
                        <span>Em Pausa</span>
                      </Badge>
                    ) : s.status_sessao === "em_andamento" || s.status_sessao === "conectado" ? (
                      <Badge className="bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-700 text-[11px] font-semibold gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                        <span>Em Andamento</span>
                      </Badge>
                    ) : (
                      <Badge
                        className={
                          s.status_sessao === "finalizada"
                            ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[11px]"
                            : "bg-slate-500/10 text-slate-600 border-slate-500/20 text-[11px]"
                        }
                      >
                        {s.status_sessao === "finalizada" ? "Completo" : s.status_sessao}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right py-3 pr-6">
                    {s.status_sessao === "em_andamento" || s.status_sessao === "conectado" || s.status_sessao === "pausada" ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/sessao/${s.id}/monitoramento`)}
                        className="h-7 text-xs px-2.5 gap-1 border-amber-400 text-amber-800 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-700 hover:bg-amber-100 cursor-pointer"
                      >
                        <Activity className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                        <span>Cockpit</span>
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/sessao/${s.id}/resultado`)}
                        className="h-7 text-xs px-2.5 gap-1 border-primary/30 text-primary hover:bg-primary/10 cursor-pointer"
                      >
                        <Eye className="h-3 w-3" />
                        <span>Ver Relatório</span>
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Modal de Vinculação de Especialista da Clínica à Equipe Multidisciplinar (RF18, RF19, RN04) */}
      <ModalVincularEspecialista
        isOpen={modalVincularAberto}
        onClose={() => setModalVincularAberto(false)}
        terapeutasDisponiveis={terapeutasClinica}
        idsJaVinculados={especialistas.map((e) => e.id)}
        onConfirmarVinculo={handleConfirmarVinculoEspecialista}
        isSubmitting={isSubmittingVinculo}
        erro={erroModalVinculo}
        pacienteNome={paciente?.nome}
      />

      {/* Modal de Comparação Lado a Lado de Sessões (RF15 / RF19) */}
      <ModalCompararSessoes
        isOpen={modalCompararAberto}
        onClose={() => setModalCompararAberto(false)}
        sessaoA={sessoes.find((s) => s.id === sessoesSelecionadas[0]) || null}
        sessaoB={sessoes.find((s) => s.id === sessoesSelecionadas[1]) || null}
        pacienteNome={paciente?.nome}
      />
    </div>
  );
}

export default PerfilPacientePage;
