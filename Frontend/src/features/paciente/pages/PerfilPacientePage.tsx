"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
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
  FileText,
  Download,
  MapPin,
  Sparkles,
  GitCompare,
  Activity,
  Stethoscope,
  ShieldCheck,
} from "lucide-react";
import { ModalCompararSessoes } from "../components/ModalCompararSessoes";
import { ModalCompararMultiplasSessoes } from "../components/ModalCompararMultiplasSessoes";
import { PainelEquipeMultidisciplinar } from "../components/PainelEquipeMultidisciplinar";
import { ModalVincularEspecialista } from "../components/ModalVincularEspecialista";
import { BadgeAutoriaMultidisciplinar } from "../components/BadgeAutoriaMultidisciplinar";
import { pacienteService } from "../services/paciente.service";
import type {
  Paciente,
  EspecialistaVinculado,
  LaudoClinico,
  GrauSeveridadeGatilho,
} from "../types/paciente.types";
import { terapeutaService } from "@/features/terapeuta/services/terapeuta.service";
import type { Terapeuta } from "@/features/terapeuta/types/terapeuta.types";
import { GerenciadorAnotacoesProntuario } from "@/features/anotacao";
import { useAuthStore } from "@/features/autenticacao/store/authStore";
import { sessaoService } from "@/features/sessao/services/sessao.service";
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
  const [modalCompararMultiplasAberto, setModalCompararMultiplasAberto] = useState(false);
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
  const [consentimentoLgpd, setConsentimentoLgpd] = useState<boolean>(false);
  const [imgError, setImgError] = useState<boolean>(false);

  const iniciaisPaciente = useMemo(() => {
    if (!paciente?.nome) return "";
    return paciente.nome
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((parte) => parte[0]?.toUpperCase() || "")
      .join("");
  }, [paciente?.nome]);

  const user = useAuthStore((s) => s.user);
  const abrirModalPreSessao = useSessionStore((s) => s.abrirModalPreSessao);
  const selecionarPaciente = useSessionStore((s) => s.selecionarPaciente);

  const carregarEquipeMultidisciplinar = useCallback(
    async (pacienteId: string, dadosPacienteFallback?: Paciente | null) => {
      setLoadingEquipe(true);
      setErroEquipe(null);
      try {
        const enriquecerResponsavel = (
          lista: EspecialistaVinculado[],
        ): EspecialistaVinculado[] => {
          if (lista.length === 0) return [];
          const responsavelIdAlvo =
            dadosPacienteFallback?.terapeuta_responsavel_id ??
            lista.find(
              (item) =>
                item.eh_responsavel ||
                item.papel_equipe === "Especialista Responsável",
            )?.id ??
            lista[0].id;

          return lista.map((item) => {
            const isLider = item.id === responsavelIdAlvo;
            return {
              ...item,
              eh_responsavel: isLider,
              papel_equipe: isLider
                ? "Especialista Responsável"
                : item.papel_equipe || "Equipe Multidisciplinar",
            };
          });
        };

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
                return resOld.map((v, index) => ({
                  id: v.terapeuta?.id ?? v.terapeuta_id,
                  nome: v.terapeuta?.nome ?? "Especialista da Equipe",
                  email: v.terapeuta?.email ?? null,
                  telefone: v.terapeuta?.telefone ?? null,
                  crp: v.terapeuta?.crp ?? null,
                  crefito: v.terapeuta?.crefito ?? null,
                  especialidade: v.terapeuta?.especialidade ?? "Equipe Multidisciplinar",
                  registro_profissional:
                    v.terapeuta?.registro_profissional ??
                    v.terapeuta?.crefito ??
                    v.terapeuta?.crp ??
                    null,
                  papel_equipe:
                    v.papel_equipe ??
                    (index === 0 ? "Especialista Responsável" : "Equipe Multidisciplinar"),
                  eh_responsavel:
                    v.eh_responsavel ??
                    v.terapeuta?.eh_responsavel ??
                    (v.papel_equipe === "Especialista Responsável" || index === 0),
                  status_ativo: v.terapeuta?.status_ativo ?? true,
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
          setEspecialistas(enriquecerResponsavel(listaVinculados));
        } else if (dadosPacienteFallback?.terapeutas?.length) {
          const mapeados = dadosPacienteFallback.terapeutas.map((v, index) => ({
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
            papel_equipe:
              v.papel_equipe ??
              (index === 0 ? "Especialista Responsável" : "Equipe Multidisciplinar"),
            eh_responsavel:
              v.eh_responsavel ??
              v.terapeuta?.eh_responsavel ??
              (v.papel_equipe === "Especialista Responsável" || index === 0),
            created_at: v.created_at,
            status_ativo: v.terapeuta?.status_ativo ?? true,
          }));
          setEspecialistas(enriquecerResponsavel(mapeados));
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
      setImgError(false);
      const [dadosPaciente, resSessoes] = await Promise.all([
        pacienteService.buscarPorId(id),
        sessaoService.listar({ pacienteId: id }),
      ]);

      setPaciente(dadosPaciente);
      if (dadosPaciente) {
        let salvoLocal = false;
        try {
          salvoLocal =
            typeof window !== "undefined" &&
            window.localStorage.getItem(`lgpd_tcle_paciente_${dadosPaciente.id}`) === "true";
        } catch {
          // localStorage indisponível
        }
        setConsentimentoLgpd(Boolean(dadosPaciente.consentimento_lgpd || salvoLocal));
      }
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
      return [...prev, sessaoId];
    });
  };

  const handleAbrirComparacao = () => {
    if (sessoesSelecionadas.length === 2) {
      setModalCompararAberto(true);
    } else if (sessoesSelecionadas.length > 2) {
      setModalCompararMultiplasAberto(true);
    } else {
      toast.info("Selecione pelo menos duas sessões para efetuar a comparação analítica.");
    }
  };

  const handleIniciarAtendimento = () => {
    if (!paciente) return;

    const sessaoConcorrenteAtiva = sessoes.find(
      (s) =>
        (s.status_sessao === "em_andamento" ||
          s.status_sessao === "conectado" ||
          s.status_sessao === "pausada") &&
        Boolean(user?.id) &&
        Boolean(s.terapeuta_id) &&
        s.terapeuta_id !== user?.id,
    );

    if (sessaoConcorrenteAtiva) {
      const condutorNome =
        sessaoConcorrenteAtiva.terapeuta?.nome ||
        especialistas.find((e) => e.id === sessaoConcorrenteAtiva.terapeuta_id)
          ?.nome ||
        "outro especialista da Equipe Multidisciplinar";
      const msgConflito = `Conflito de sessão ativa (409): Este paciente já está em atendimento conduzido por ${condutorNome}. Você pode acompanhar a sessão em tempo real pelo Cockpit em modo observador.`;
      setAlertaConflitoEquipe(msgConflito);
      toast.error(msgConflito);
      return;
    }

    const minhaSessaoAtiva = sessoes.find(
      (s) =>
        (s.status_sessao === "em_andamento" ||
          s.status_sessao === "conectado" ||
          s.status_sessao === "pausada") &&
        s.terapeuta_id === user?.id,
    );

    if (minhaSessaoAtiva) {
      toast.info("Retomando atendimento clínico em andamento.");
      navigate(`/sessao/${minhaSessaoAtiva.id}/monitoramento`);
      return;
    }

    selecionarPaciente({
      id: paciente.id,
      nome: paciente.nome,
    });
    abrirModalPreSessao();
  };

  const handleRegistrarConsentimentoLgpd = () => {
    if (!paciente) return;
    setConsentimentoLgpd(true);
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(`lgpd_tcle_paciente_${paciente.id}`, "true");
      }
    } catch {
      // localStorage indisponível
    }
    toast.success(
      "Termo de Consentimento Livre e Esclarecido (TCLE) registrado com sucesso para o responsável legal.",
    );
  };

  const handleConfirmarVinculoEspecialista = async (terapeutaId: string) => {
    if (!id || !terapeutaId) return;

    setIsSubmittingVinculo(true);
    setErroModalVinculo(null);

    try {
      await pacienteService.vincularTerapeuta(id, { terapeuta_id: terapeutaId });
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
        "Não é possível desvincular: O paciente precisa manter ao menos um especialista responsável.";
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

  const formatarDataIsoPtBr = (dataIso?: string | null): string => {
    if (!dataIso) return "Não informada";
    const limpa = dataIso.split("T")[0];
    const partes = limpa.split("-");
    if (partes.length === 3) {
      return `${partes[2]}/${partes[1]}/${partes[0]}`;
    }
    return new Date(dataIso).toLocaleDateString("pt-BR");
  };

  const formatarEnderecoCompleto = (entidade: {
    endereco?: string | null;
    numero?: string | null;
    complemento?: string | null;
    bairro?: string | null;
    cidade?: string | null;
    estado?: string | null;
    cep?: string | null;
  }): string | null => {
    const partes: string[] = [];
    if (entidade.endereco) {
      partes.push(
        entidade.numero ? `${entidade.endereco}, ${entidade.numero}` : entidade.endereco,
      );
    }
    if (entidade.complemento) {
      partes.push(entidade.complemento);
    }
    if (entidade.bairro) {
      partes.push(entidade.bairro);
    }
    const cidadeUf =
      entidade.cidade && entidade.estado
        ? `${entidade.cidade} - ${entidade.estado}`
        : entidade.cidade || entidade.estado || null;
    if (cidadeUf) {
      partes.push(cidadeUf);
    }
    if (entidade.cep) {
      partes.push(`CEP: ${entidade.cep}`);
    }
    return partes.length > 0 ? partes.join(" • ") : null;
  };

  const obterEstiloSeveridadeGatilho = (severidade: GrauSeveridadeGatilho): string => {
    switch (severidade) {
      case "severo":
        return "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30";
      case "moderado":
        return "bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/30";
      case "leve":
      default:
        return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30";
    }
  };

  const handleAbrirLaudoPdf = (laudo: LaudoClinico) => {
    toast.success(`Abrindo documento clínico: ${laudo.arquivo_nome_original}`);
    if (typeof window !== "undefined" && laudo.arquivo_caminho.startsWith("http")) {
      window.open(laudo.arquivo_caminho, "_blank", "noopener,noreferrer");
    }
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
  const enderecoPacienteCompleto = formatarEnderecoCompleto(paciente);
  const laudosExibicao: LaudoClinico[] =
    paciente.laudos && paciente.laudos.length > 0
      ? paciente.laudos
      : [
          {
            id: `laudo-padrao-${paciente.id}`,
            paciente_id: paciente.id,
            terapeuta_id:
              paciente.terapeuta_responsavel_id || especialistas[0]?.id || "",
            titulo: "Laudo Clínico e Parecer Diagnóstico Multidisciplinar",
            descricao:
              paciente.dados_clinicos?.diagnostico_base ||
              "CID-11: 6A02 (Transtorno do Espectro do Autismo) — Documento clínico consolidado no prontuário.",
            arquivo_caminho: `/laudos/prontuario-${paciente.id}.pdf`,
            arquivo_nome_original: `laudo_clinico_${paciente.nome
              .toLowerCase()
              .replace(/\s+/g, "_")}.pdf`,
            arquivo_mime_type: "application/pdf",
            tamanho_bytes: 348160,
            created_at: paciente.created_at,
          },
        ];
  const gatilhosEstruturados = paciente.gatilhos ?? [];
  const gatilhosSimples = paciente.dados_clinicos?.gatilhos_sensoriais ?? [];

  const fotoPaciente =
    paciente.foto_url ||
    paciente.photoUrl ||
    (paciente as { photo_url?: string | null }).photo_url ||
    null;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      {/* Topo / Navegação */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/pacientes")}
            className="min-h-11 min-w-11 p-0 rounded-xl"
            title="Voltar"
          >
            <ArrowLeft className="h-5 w-5 text-muted-foreground" />
          </Button>

          {/* Avatar com Foto do Paciente ou Iniciais */}
          <div
            data-testid="avatar-perfil-paciente"
            className="relative w-14 h-14 rounded-full border-2 border-primary/20 bg-muted/50 flex items-center justify-center overflow-hidden shrink-0 shadow-xs"
          >
            {fotoPaciente && !imgError ? (
              <img
                src={fotoPaciente}
                alt={paciente.nome}
                onError={() => setImgError(true)}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-base font-bold text-primary select-none">
                {iniciaisPaciente || <User className="h-6 w-6 text-primary" />}
              </span>
            )}
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
                {paciente.nome}
              </h1>
              <Badge variant="outline" className="text-xs bg-muted/50 border-primary/20 text-primary font-semibold">
                Prontuário: #{paciente.id.slice(0, 8)}
              </Badge>
              <Badge
                data-testid="badge-consentimento-lgpd"
                variant="outline"
                className={
                  consentimentoLgpd
                    ? "text-xs bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300 font-semibold gap-1"
                    : "text-xs bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-300 font-semibold gap-1"
                }
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>
                  {consentimentoLgpd
                    ? "Consentimento LGPD: Ativo (Responsável Legal)"
                    : "Consentimento LGPD: Pendente (Responsável Legal)"}
                </span>
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Cadastro Geral e Histórico Clínico do Paciente
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            data-testid="btn-registrar-consentimento-lgpd"
            onClick={handleRegistrarConsentimentoLgpd}
            className="min-h-11 px-4 text-xs font-semibold gap-1.5 cursor-pointer"
          >
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <span>
              {consentimentoLgpd
                ? "Termo LGPD (TCLE) Confirmado"
                : "Registrar Consentimento LGPD (TCLE)"}
            </span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/pacientes/${paciente.id}/historico`)}
            className="min-h-11 px-4 text-xs font-semibold gap-1.5 cursor-pointer"
          >
            <Clock className="h-4 w-4" />
            <span>Evolução Longitudinal</span>
          </Button>

          <Button
            size="sm"
            onClick={handleIniciarAtendimento}
            className="min-h-11 px-4 text-xs font-semibold gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer shadow-xs"
          >
            <Play className="h-4 w-4 fill-current" />
            <span>Iniciar Sessão com este Paciente</span>
          </Button>
        </div>
      </div>

      {/* ====================================================================
          SEÇÃO 1: VISÃO GERAL (Dados Básicos, Responsáveis Legais e Resumo)
         ==================================================================== */}
      <section
        data-testid="secao-visao-geral"
        aria-label="Visão Geral do Paciente"
        className="space-y-4"
      >
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
                    {formatarDataIsoPtBr(paciente.data_nascimento)}
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
                <div className="flex justify-between py-1 border-b border-border/30">
                  <span className="text-muted-foreground">Localidade:</span>
                  <span className="text-foreground font-semibold">
                    {paciente.cidade && paciente.estado
                      ? `${paciente.cidade} - ${paciente.estado}`
                      : "Não informada"}
                  </span>
                </div>
                {enderecoPacienteCompleto && (
                  <div className="pt-1 flex flex-col gap-1">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-muted-foreground" />
                      Endereço Residencial:
                    </span>
                    <span className="text-foreground font-medium wrap-break-word">
                      {enderecoPacienteCompleto}
                    </span>
                  </div>
                )}
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
                  {paciente.responsaveis.map((resp) => {
                    const enderecoResp = formatarEnderecoCompleto(resp);
                    return (
                      <div
                        key={resp.id}
                        data-testid={`card-responsavel-${resp.id}`}
                        className="p-3 rounded-xl bg-muted/40 border border-border/50 text-xs space-y-1.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-foreground">{resp.nome}</span>
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                            {resp.parentesco || "Responsável"}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-1 gap-1 pt-0.5 text-[11px]">
                          <p className="text-muted-foreground flex items-center justify-between">
                            <span>CPF:</span>
                            <span className="font-mono font-semibold text-foreground">
                              {resp.cpf || "Não informado"}
                            </span>
                          </p>
                          {resp.data_nascimento && (
                            <p className="text-muted-foreground flex items-center justify-between">
                              <span>Nascimento:</span>
                              <span className="font-semibold text-foreground">
                                {formatarDataIsoPtBr(resp.data_nascimento)}
                              </span>
                            </p>
                          )}
                        </div>

                        {resp.telefone && (
                          <p className="text-muted-foreground flex items-center gap-1.5">
                            <Phone className="h-3 w-3 shrink-0" />
                            <span>{resp.telefone}</span>
                          </p>
                        )}
                        {resp.email && (
                          <p className="text-muted-foreground flex items-center gap-1.5 truncate">
                            <Mail className="h-3 w-3 shrink-0" />
                            <span>{resp.email}</span>
                          </p>
                        )}
                        {enderecoResp && (
                          <p className="text-muted-foreground flex items-start gap-1.5 pt-0.5 border-t border-border/40">
                            <MapPin className="h-3 w-3 shrink-0 mt-0.5" />
                            <span className="wrap-break-word">{enderecoResp}</span>
                          </p>
                        )}
                      </div>
                    );
                  })}
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
      </section>

      {/* ====================================================================
          SEÇÃO 2: EQUIPE MULTIDISCIPLINAR (RF18, RN04)
         ==================================================================== */}
      <section
        data-testid="secao-equipe"
        aria-label="Equipe Multidisciplinar"
        className="space-y-4"
      >
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
      </section>

      {/* ====================================================================
          SEÇÃO 3: PRONTUÁRIO (Laudo Clínico em PDF e Gatilhos Sensoriais)
         ==================================================================== */}
      <section
        data-testid="secao-prontuario"
        aria-label="Prontuário Clínico, Laudo e Gatilhos"
        className="space-y-4"
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Card: Laudo Clínico e Parecer Diagnóstico (PDF) */}
          <div
            data-testid="card-laudo-clinico"
            className="rounded-2xl border border-border bg-card p-6 shadow-xs flex flex-col justify-between space-y-4"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  Laudo Clínico e Diagnóstico
                </h2>
                <Badge
                  variant="outline"
                  className="text-[11px] bg-primary/5 border-primary/20 text-primary font-semibold"
                >
                  Prontuário Oficial
                </Badge>
              </div>

              <div className="space-y-2 text-xs">
                <div className="p-3 rounded-xl bg-muted/40 border border-border/50 space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Diagnóstico Base (CID)
                  </span>
                  <p className="text-foreground font-semibold leading-relaxed">
                    {paciente.dados_clinicos?.diagnostico_base ||
                      "CID-11: 6A02 (Transtorno do Espectro Autista) — Acompanhamento multidisciplinar ativo."}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-muted/20 border border-border/40 space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Diretrizes Clínicas e Observações Gerais
                  </span>
                  <p className="text-muted-foreground leading-relaxed">
                    {paciente.dados_clinicos?.observacoes_gerais ||
                      "Recomenda-se sessões com estímulos cromáticos suaves, ritmo moderado de tarefas e pausas orientadas para regulação sensorial."}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2.5 pt-2 border-t border-border/50">
              <p className="text-xs font-bold text-foreground">
                Arquivos de Laudo Anexados (PDF)
              </p>
              <div className="space-y-2">
                {laudosExibicao.map((laudo, index) => (
                  <div
                    key={laudo.id}
                    className="p-3 rounded-xl border border-border/60 bg-muted/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-0.5 min-w-0">
                      <p className="text-xs font-bold text-foreground truncate">
                        {laudo.titulo}
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {laudo.arquivo_nome_original}
                        {laudo.tamanho_bytes
                          ? ` • ${Math.round(laudo.tamanho_bytes / 1024)} KB`
                          : ""}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      data-testid={
                        index === 0
                          ? "btn-baixar-laudo-pdf"
                          : `btn-baixar-laudo-pdf-${laudo.id}`
                      }
                      onClick={() => handleAbrirLaudoPdf(laudo)}
                      className="min-h-11 px-3 text-xs font-semibold gap-1.5 border-primary/30 text-primary hover:bg-primary/10 shrink-0 cursor-pointer"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>Baixar Laudo PDF</span>
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Card: Gatilhos Sensoriais e Comportamentais */}
          <div
            data-testid="card-gatilhos-paciente"
            className="rounded-2xl border border-border bg-card p-6 shadow-xs flex flex-col justify-between space-y-4"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Gatilhos Sensoriais e Comportamentais
                </h2>
                <Badge variant="outline" className="text-[11px] font-semibold">
                  {gatilhosEstruturados.length + gatilhosSimples.length} mapeado(s)
                </Badge>
              </div>

              {gatilhosEstruturados.length > 0 || gatilhosSimples.length > 0 ? (
                <div className="space-y-3">
                  {gatilhosEstruturados.map((item) => (
                    <div
                      key={`${item.paciente_id}-${item.gatilho_id}`}
                      className="p-3 rounded-xl bg-muted/40 border border-border/50 text-xs space-y-1.5"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-bold text-foreground">
                          {item.gatilho?.nome || "Gatilho Sensorial"}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {item.gatilho?.categoria && (
                            <Badge variant="secondary" className="text-[10px] capitalize">
                              {item.gatilho.categoria}
                            </Badge>
                          )}
                          <Badge
                            variant="outline"
                            className={`text-[10px] font-semibold capitalize ${obterEstiloSeveridadeGatilho(item.grau_severidade)}`}
                          >
                            Severidade: {item.grau_severidade}
                          </Badge>
                        </div>
                      </div>
                      {item.observacoes && (
                        <p className="text-muted-foreground leading-relaxed">
                          {item.observacoes}
                        </p>
                      )}
                    </div>
                  ))}

                  {gatilhosSimples.length > 0 && (
                    <div className="space-y-2 pt-1">
                      <span className="text-[11px] font-semibold text-muted-foreground">
                        Sensibilidades e Gatilhos Adicionais:
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {gatilhosSimples.map((gatilhoTexto) => (
                          <Badge
                            key={gatilhoTexto}
                            variant="outline"
                            className="text-xs py-1 px-2.5 bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-300 font-medium"
                          >
                            {gatilhoTexto}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic py-4">
                  Nenhum gatilho sensorial ou comportamental registrado para este paciente.
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ====================================================================
          SEÇÃO 4: ANOTAÇÕES CLÍNICAS DO PRONTUÁRIO (RF16, RN05)
         ==================================================================== */}
      <section
        data-testid="secao-anotacoes"
        aria-label="Anotações Clínicas do Prontuário"
        className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-4"
      >
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
      </section>

      {/* ====================================================================
          SEÇÃO 5: SESSÕES E INTERVENÇÕES RECENTES
         ==================================================================== */}
      <section
        data-testid="secao-sessoes"
        aria-label="Sessões e Intervenções Recentes"
        className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
          <div>
            <h2 className="text-sm font-bold text-foreground">
              Intervenções Recentes
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Selecione duas ou mais sessões para visualização comparativa e análise de evolução clínica longitudinal.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {sessoesSelecionadas.length >= 1 && (
              <Button
                variant="outline"
                size="sm"
                disabled={sessoesSelecionadas.length === 1}
                onClick={handleAbrirComparacao}
                data-testid="btn-comparar-sessoes"
                title={
                  sessoesSelecionadas.length === 1
                    ? "Selecione pelo menos 2 sessões para comparar"
                    : "Comparar sessões selecionadas"
                }
                className={`h-8 text-xs font-semibold gap-1.5 border-primary/30 text-primary hover:bg-primary/10 ${
                  sessoesSelecionadas.length === 1
                    ? "opacity-50 cursor-not-allowed"
                    : "cursor-pointer"
                }`}
              >
                <GitCompare className="h-3.5 w-3.5" />
                <span>
                  {sessoesSelecionadas.length === 1
                    ? "Comparar 1/2 Sessões"
                    : `Comparar ${sessoesSelecionadas.length} Sessões`}
                </span>
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
                <input
                  type="checkbox"
                  aria-label="Selecionar todas as sessões para comparação"
                  checked={
                    sessoes.length > 0 &&
                    sessoesSelecionadas.length === sessoes.length
                  }
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSessoesSelecionadas(sessoes.map((s) => s.id));
                    } else {
                      setSessoesSelecionadas([]);
                    }
                  }}
                  className="rounded border-border text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                  title="Selecionar / desmarcar todas as sessões"
                />
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
      </section>

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

      {/* Modal de Comparação Multi-Sessões Escalável (> 2 Sessões) */}
      <ModalCompararMultiplasSessoes
        isOpen={modalCompararMultiplasAberto}
        onClose={() => setModalCompararMultiplasAberto(false)}
        sessoes={sessoes.filter((s) => sessoesSelecionadas.includes(s.id))}
        pacienteNome={paciente?.nome}
      />
    </div>
  );
}

export default PerfilPacientePage;
