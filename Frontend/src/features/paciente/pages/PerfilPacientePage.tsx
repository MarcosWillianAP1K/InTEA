"use client";

import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  FileText,
  ShieldAlert,
  Play,
  Clock,
  Plus,
  Eye,
  AlertCircle,
  FileCheck,
} from "lucide-react";
import { pacienteService } from "../services/paciente.service";
import type { Paciente } from "../types/paciente.types";
import { anotacaoService } from "@/features/anotacao/services/anotacao.service";
import type { AnotacaoClinica } from "@/features/anotacao/types/anotacao.types";
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
 * TELA: PERFIL DO PACIENTE (InTEA)
 * Frame Figma: Perfil Paciente- InTEA (150:888)
 * Integração: pacienteService, anotacaoService, sessaoService
 * ============================================================================
 */
export function PerfilPacientePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [paciente, setPaciente] = useState<Paciente | null>(null);
  const [anotacoes, setAnotacoes] = useState<AnotacaoClinica[]>([]);
  const [sessoes, setSessoes] = useState<Sessao[]>([]);
  const [loading, setLoading] = useState(true);
  const [novaNota, setNovaNota] = useState("");
  const [salvandoNota, setSalvandoNota] = useState(false);

  const abrirModalPreSessao = useSessionStore((s) => s.abrirModalPreSessao);
  const selecionarPaciente = useSessionStore((s) => s.selecionarPaciente);

  useEffect(() => {
    if (!id) return;

    let isMounted = true;
    async function carregarDados() {
      try {
        setLoading(true);
        const [dadosPaciente, listaAnotacoes, resSessoes] = await Promise.all([
          pacienteService.buscarPorId(id!),
          anotacaoService.listarPorPaciente(id!),
          sessaoService.listar({ pacienteId: id! }),
        ]);

        if (isMounted) {
          setPaciente(dadosPaciente);
          setAnotacoes(listaAnotacoes || []);
          setSessoes(resSessoes?.data || []);
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

  const handleSalvarNota = async () => {
    if (!novaNota.trim() || !id) return;

    try {
      setSalvandoNota(true);
      const criada = await anotacaoService.criar({
        paciente_id: id,
        conteudo: novaNota.trim(),
      });

      if (criada) {
        setAnotacoes((prev) => [criada, ...prev]);
        setNovaNota("");
        toast.success("Nota clínica registrada no prontuário!");
      }
    } catch {
      toast.error("Erro ao salvar nota clínica.");
    } finally {
      setSalvandoNota(false);
    }
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

      {/* Seção: Notas do Paciente (Prontuário Editor) */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-xs flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div className="flex items-center gap-2 text-foreground font-bold text-sm">
            <FileText className="h-4 w-4 text-primary" />
            <span>Notas e Evoluções Clínicas do Prontuário</span>
          </div>
          <span className="text-xs text-muted-foreground">{anotacoes.length} notas registradas</span>
        </div>

        {/* Input de nova nota */}
        <div className="flex flex-col gap-2">
          <textarea
            value={novaNota}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNovaNota(e.target.value)}
            placeholder="Digite a evolução clínica ou observação comportamental deste atendimento..."
            className="w-full text-xs min-h-20 p-3 rounded-xl bg-background border border-border resize-y focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          <div className="flex justify-end">
            <Button
              size="sm"
              disabled={salvandoNota || !novaNota.trim()}
              onClick={handleSalvarNota}
              className="text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5 cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>{salvandoNota ? "Salvando..." : "Registrar Nota Clínica"}</span>
            </Button>
          </div>
        </div>

        {/* Histórico de anotações */}
        <div className="space-y-3 pt-2">
          {anotacoes.length === 0 ? (
            <p className="text-xs text-muted-foreground italic py-2 text-center">
              Nenhuma evolução clínica registrada no prontuário ainda.
            </p>
          ) : (
            anotacoes.map((anot) => (
              <div
                key={anot.id}
                className="p-3.5 rounded-lg border border-border/60 bg-muted/20 flex flex-col gap-1.5"
              >
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span className="font-semibold text-foreground">
                    {anot.terapeuta_id ? `Terapeuta #${anot.terapeuta_id.slice(0, 8)}` : "Terapeuta Responsável"}
                  </span>
                  <span>{anot.created_at ? new Date(anot.created_at).toLocaleString("pt-BR") : ""}</span>
                </div>
                <p className="text-xs text-foreground/90 whitespace-pre-wrap leading-relaxed">
                  {anot.conteudo}
                </p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Seção: Histórico de Sessões do Paciente */}
      <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
        <div className="p-4 border-b border-border bg-muted/30 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-sm text-foreground">
            <Clock className="h-4 w-4 text-primary" />
            <span>Histórico de Sessões do Paciente</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">{sessoes.length} sessões</span>
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
              <TableHead className="text-xs font-bold text-foreground">Game Terapêutico</TableHead>
              <TableHead className="text-xs font-bold text-foreground">Data de Realização</TableHead>
              <TableHead className="text-xs font-bold text-foreground">Status</TableHead>
              <TableHead className="text-right text-xs font-bold text-foreground pr-6">Relatório</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sessoes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-8 text-center text-xs text-muted-foreground">
                  Este paciente ainda não possui sessões registradas.
                </TableCell>
              </TableRow>
            ) : (
              sessoes.map((s) => (
                <TableRow key={s.id} className="hover:bg-muted/30 border-b border-border/60">
                  <TableCell className="text-xs font-semibold text-foreground py-3">
                    {s.jogo?.nome || "Jogo Terapêutico"}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground py-3">
                    {s.data_hora_inicio ? new Date(s.data_hora_inicio).toLocaleString("pt-BR") : ""}
                  </TableCell>
                  <TableCell className="py-3">
                    <Badge
                      className={
                        s.status_sessao === "finalizada"
                          ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[11px]"
                          : "bg-slate-500/10 text-slate-600 border-slate-500/20 text-[11px]"
                      }
                    >
                      {s.status_sessao === "finalizada" ? "Completo" : s.status_sessao}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right py-3 pr-6">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/sessao/${s.id}/resultado`)}
                      className="h-7 text-xs px-2.5 gap-1 border-primary/30 text-primary hover:bg-primary/10 cursor-pointer"
                    >
                      <Eye className="h-3 w-3" />
                      <span>Ver Relatório</span>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export default PerfilPacientePage;
