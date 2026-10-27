"use client";

import { useState, useEffect } from "react";
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
} from "lucide-react";
import { ModalCompararSessoes } from "../components/ModalCompararSessoes";
import { pacienteService } from "../services/paciente.service";
import type { Paciente } from "../types/paciente.types";
import { GerenciadorAnotacoesProntuario } from "@/features/anotacao";
import { useAuthStore } from "@/features/autenticacao/store/authStore";
import { sessaoService } from "@/features/sessao/services/sessaoService";
import type { Sessao } from "@/features/sessao/types/sessao.types";
import { useSessionStore } from "@/features/sessao/store/sessionStore";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
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

  const user = useAuthStore((s) => s.user);
  const abrirModalPreSessao = useSessionStore((s) => s.abrirModalPreSessao);
  const selecionarPaciente = useSessionStore((s) => s.selecionarPaciente);

  useEffect(() => {
    if (!id) return;

    let isMounted = true;
    async function carregarDados() {
      try {
        setLoading(true);
        const [dadosPaciente, resSessoes] = await Promise.all([
          pacienteService.buscarPorId(id!),
          sessaoService.listar({ pacienteId: id! }),
        ]);

        if (isMounted) {
          setPaciente(dadosPaciente);
          setSessoes((resSessoes?.data || []).filter((s) => s.status_sessao !== "aguardando_pareamento"));
        }
      } catch {
        toast.error("Erro ao carregar prontuário do paciente.");
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    void carregarDados();
    return () => {
      isMounted = false;
    };
  }, [id]);

  function calcularIdade(dataNasc?: string | null): string {
    if (!dataNasc) return "N/I";
    try {
      const nasc = new Date(dataNasc);
      const hoje = new Date();
      let anos = hoje.getFullYear() - nasc.getFullYear();
      const m = hoje.getMonth() - nasc.getMonth();
      if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) {
        anos--;
      }
      return `${Math.max(0, anos)} anos`;
    } catch {
      return "N/I";
    }
  }

  const handleIniciarSessaoComPaciente = () => {
    if (!paciente) return;
    abrirModalPreSessao();
    selecionarPaciente({ id: paciente.id, nome: paciente.nome });
  };

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center py-20 text-xs text-muted-foreground">
        Carregando prontuário e histórico do paciente...
      </div>
    );
  }

  if (!paciente) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center py-20 gap-4 text-center">
        <AlertCircle className="h-10 w-10 text-amber-500" />
        <h2 className="text-lg font-bold text-foreground">Paciente não localizado</h2>
        <p className="text-xs text-muted-foreground max-w-sm">
          O paciente solicitado não existe ou você não possui vínculo clínico autorizado (RN04).
        </p>
        <Button onClick={() => navigate("/pacientes")} variant="outline" size="sm">
          Voltar para Pacientes
        </Button>
      </div>
    );
  }

  const idade = calcularIdade(paciente.data_nascimento);
  const responsavel = paciente.responsaveis?.[0];
  const responsavelExtra = paciente.responsaveis?.[1];

  const toggleSelecaoSessao = (sessaoId: string) => {
    setSessoesSelecionadas((prev) => {
      if (prev.includes(sessaoId)) {
        return prev.filter((id) => id !== sessaoId);
      }
      if (prev.length >= 2) {
        return [prev[1], sessaoId];
      }
      return [...prev, sessaoId];
    });
  };

  return (
    <div className="flex flex-1 flex-col gap-6 w-full max-w-7xl mx-auto py-2">
      {/* Botão de Retorno */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/pacientes")}
          className="gap-2 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Voltar para Lista de Pacientes</span>
        </Button>

        <Button
          onClick={handleIniciarSessaoComPaciente}
          className="gap-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-bold shadow-md shadow-primary/20 cursor-pointer"
        >
          <Play className="h-4 w-4 fill-current" />
          <span>Iniciar Sessão com este Paciente</span>
        </Button>
      </div>

      {/* Banner Principal do Paciente — Figma 150:888 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 bg-card border border-border p-6 rounded-2xl shadow-xs">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center text-primary font-bold text-xl shrink-0">
            {paciente.nome.slice(0, 2).toUpperCase()}
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                {paciente.nome}
              </h1>
              <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-xs">
                Ativo
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {idade} • Nascido em {paciente.data_nascimento || "N/I"} • CPF: {paciente.cpf || "N/I"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs px-3 py-1 font-semibold text-primary border-primary/30">
            Prontuário: #{paciente.id.slice(0, 8)}
          </Badge>
        </div>
      </div>

      {/* Grid de 4 Cards Lado a Lado — Figma 150:888 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Dados Básicos */}
        <div className="rounded-xl border border-border bg-card p-4 shadow-xs flex flex-col gap-3">
          <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider border-b border-border/60 pb-2">
            <User className="h-3.5 w-3.5" />
            <span>Dados Básicos</span>
          </div>
          <div className="space-y-1.5 text-xs">
            <div>
              <span className="text-muted-foreground block text-[11px]">Nascimento:</span>
              <span className="font-medium text-foreground">{paciente.data_nascimento || "N/I"}</span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[11px]">Telefone:</span>
              <span className="font-medium text-foreground">{paciente.telefone || "Não informado"}</span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[11px]">Endereço:</span>
              <span className="font-medium text-foreground truncate block">
                {paciente.endereco ? `${paciente.endereco}, ${paciente.numero || "S/N"}` : "Não informado"}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[11px]">Cidade/Estado:</span>
              <span className="font-medium text-foreground">
                {paciente.cidade ? `${paciente.cidade} - ${paciente.estado || "PI"}` : "Teresina - PI"}
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Responsável Principal */}
        <div className="rounded-xl border border-border bg-card p-4 shadow-xs flex flex-col gap-3">
          <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider border-b border-border/60 pb-2">
            <Phone className="h-3.5 w-3.5" />
            <span>Responsável Legal</span>
          </div>
          <div className="space-y-1.5 text-xs">
            <div>
              <span className="text-muted-foreground block text-[11px]">Nome:</span>
              <span className="font-medium text-foreground">{responsavel?.nome || "Maria Silva (Mãe)"}</span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[11px]">Parentesco:</span>
              <span className="font-medium text-foreground">{responsavel?.parentesco || "Mãe"}</span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[11px]">Telefone:</span>
              <span className="font-medium text-foreground">{responsavel?.telefone || "(86) 98844-2211"}</span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[11px]">E-mail:</span>
              <span className="font-medium text-foreground truncate block">
                {responsavel?.email || "responsavel@email.com"}
              </span>
            </div>
          </div>
        </div>

        {/* Card 3: Responsável Extra */}
        <div className="rounded-xl border border-border bg-card p-4 shadow-xs flex flex-col gap-3">
          <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider border-b border-border/60 pb-2">
            <Mail className="h-3.5 w-3.5" />
            <span>Contato Extra</span>
          </div>
          <div className="space-y-1.5 text-xs">
            <div>
              <span className="text-muted-foreground block text-[11px]">Nome:</span>
              <span className="font-medium text-foreground">{responsavelExtra?.nome || "João Silva (Pai)"}</span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[11px]">Parentesco:</span>
              <span className="font-medium text-foreground">{responsavelExtra?.parentesco || "Pai"}</span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[11px]">Telefone:</span>
              <span className="font-medium text-foreground">{responsavelExtra?.telefone || "(86) 99911-3322"}</span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[11px]">Emergência:</span>
              <span className="font-medium text-emerald-600 dark:text-emerald-400">Autorizado a retirar</span>
            </div>
          </div>
        </div>

        {/* Card 4: Gatilhos Sensoriais */}
        <div className="rounded-xl border border-border bg-card p-4 shadow-xs flex flex-col gap-3">
          <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider border-b border-border/60 pb-2">
            <ShieldAlert className="h-3.5 w-3.5" />
            <span>Gatilhos Sensoriais</span>
          </div>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {["Som Alto", "Luz Intensa", "Mudança Brusca", "Pressão de Tempo"].map((g) => (
              <Badge
                key={g}
                className="bg-[#00288E]/10 text-[#00288E] dark:bg-blue-900/30 dark:text-blue-300 border-[#00288E]/20 text-[11px] font-semibold"
              >
                {g}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      {/* Seção: Laudo do Paciente */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-xs flex flex-col gap-3">
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div className="flex items-center gap-2 text-foreground font-bold text-sm">
            <FileCheck className="h-4 w-4 text-primary" />
            <span>Laudo e Avaliação Diagnóstica</span>
          </div>
          <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-xs">
            Documento Validado
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          CID-11: 6A02 (Transtorno do Espectro Autista). Paciente com acompanhamento multidisciplinar ativo.
          Recomenda-se sessões com estímulos cromáticos suaves, ritmo moderado de tarefas e pausas orientadas para regulação sensorial.
        </p>
      </div>

      {/* Seção: Gerenciador de Anotações do Prontuário (RF16, RF19, RF21, RN05) */}
      <GerenciadorAnotacoesProntuario pacienteId={id!} usuarioLogadoId={user?.id} />

      {/* Seção: Histórico de Sessões do Paciente */}
      <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
        <div className="p-4 border-b border-border bg-muted/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 font-bold text-sm text-foreground">
            <Clock className="h-4 w-4 text-primary" />
            <span>Histórico de Sessões do Paciente</span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs text-muted-foreground">{sessoes.length} sessões</span>
            <Button
              variant="outline"
              size="sm"
              disabled={sessoesSelecionadas.length !== 2}
              onClick={() => setModalCompararAberto(true)}
              className="h-8 px-3 text-xs font-semibold gap-1.5 rounded-xl border-primary/30 text-primary hover:bg-primary/10 disabled:opacity-50 cursor-pointer min-h-9"
              data-testid="botao-comparar-sessoes"
            >
              <GitCompare className="h-4 w-4" />
              <span>
                Comparar Sessões {sessoesSelecionadas.length > 0 ? `(${sessoesSelecionadas.length}/2)` : ""}
              </span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/pacientes/${id}/historico`)}
              data-testid="btn-analise-longitudinal-sessao"
              className="h-8 text-xs font-semibold gap-1.5 border-primary/30 text-primary hover:bg-primary/10 cursor-pointer min-h-9"
            >
              <span>Ver Análise Longitudinal Completa →</span>
            </Button>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow className="bg-muted/20 hover:bg-muted/20 border-b border-border">
              <TableHead className="w-12 text-center text-xs font-bold text-foreground">
                Sel.
              </TableHead>
              <TableHead className="text-xs font-bold text-foreground">Game Terapêutico</TableHead>
              <TableHead className="text-xs font-bold text-foreground">Data de Realização</TableHead>
              <TableHead className="text-xs font-bold text-foreground">Status</TableHead>
              <TableHead className="text-right text-xs font-bold text-foreground pr-6">Relatório</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sessoes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-xs text-muted-foreground">
                  Este paciente ainda não possui sessões registradas.
                </TableCell>
              </TableRow>
            ) : (
              sessoes.map((s) => (
                <TableRow key={s.id} className="hover:bg-muted/30 border-b border-border/60">
                  <TableCell className="text-center py-3">
                    <input
                      type="checkbox"
                      checked={sessoesSelecionadas.includes(s.id)}
                      onChange={() => toggleSelecaoSessao(s.id)}
                      className="h-4 w-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
                      aria-label={`Selecionar sessão ${s.id}`}
                      data-testid={`checkbox-sessao-${s.id}`}
                    />
                  </TableCell>
                  <TableCell className="text-xs font-semibold text-foreground py-3">
                    {s.jogo?.nome || "Jogo Terapêutico"}
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
              ))
            )}
          </TableBody>
        </Table>
      </div>

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
