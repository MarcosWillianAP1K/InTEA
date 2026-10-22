"use client";

import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Plus, ArrowLeft, Eye, CheckCircle2, Clock } from "lucide-react";
import { pacienteService } from "../services/paciente.service";
import type { Paciente } from "../types/paciente.types";
import { DialogFormularioPaciente } from "../components/DialogFormularioPaciente";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Badge } from "@/shared/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { toast } from "sonner";

/**
 * ============================================================================
 * PAGE: ALL PATIENTS (InTEA)
 * Permission: Unrestricted access for administrators (GET /api/paciente?all=true)
 * ============================================================================
 */
export function TodosPacientesPage() {
  const navigate = useNavigate();
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<string>("todos");
  const [modalCadastroAberto, setModalCadastroAberto] = useState(false);

  const carregarPacientes = async () => {
    try {
      setLoading(true);
      const dados = await pacienteService.listar({ all: true });
      setPacientes(dados || []);
    } catch {
      toast.error("Erro ao carregar lista completa de pacientes.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void carregarPacientes();
  }, []);

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

  const pacientesFiltrados = useMemo(() => {
    return pacientes.filter((p) => {
      const matchBusca =
        !busca ||
        p.nome.toLowerCase().includes(busca.toLowerCase()) ||
        (p.cpf && p.cpf.includes(busca));

      const matchStatus =
        filtroStatus === "todos" ||
        (filtroStatus === "ativo" && p.status_ativo !== false) ||
        (filtroStatus === "inativo" && p.status_ativo === false);

      return matchBusca && matchStatus;
    });
  }, [pacientes, busca, filtroStatus]);

  return (
    <div className="flex flex-1 flex-col gap-6 w-full max-w-7xl mx-auto py-2">
      {/* Botão Voltar */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/pacientes")}
          className="gap-2 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Voltar para Meus Pacientes</span>
        </Button>
      </div>

      {/* Cabeçalho do Frame Figma 94:1176 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card border border-border p-6 rounded-2xl shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Lista de pacientes cadastrados
            </h1>
            <Badge className="bg-primary/10 text-primary border-primary/20 text-xs">
              Todos os Pacientes
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Visualização administrativa consolidada de todos os pacientes da clínica.
          </p>
        </div>

        <Button
          onClick={() => setModalCadastroAberto(true)}
          className="gap-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-bold shadow-md shadow-primary/20 cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>Cadastrar um novo paciente</span>
        </Button>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-card border border-border p-4 rounded-xl shadow-xs">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar paciente por nome ou CPF..."
            className="pl-9 h-10 text-xs rounded-lg bg-background border-border"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Select value={filtroStatus} onValueChange={setFiltroStatus}>
            <SelectTrigger className="w-full sm:w-44 h-10 text-xs rounded-lg bg-background border-border">
              <SelectValue placeholder="Status clínico" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os status</SelectItem>
              <SelectItem value="ativo">Ativos</SelectItem>
              <SelectItem value="inativo">Inativos</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tabela de Pacientes — Figma Row paciente completo (94:1147) */}
      <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40 border-b border-border">
              <TableHead className="w-80 text-xs font-bold text-foreground">Paciente</TableHead>
              <TableHead className="text-xs font-bold text-foreground">Idade</TableHead>
              <TableHead className="text-xs font-bold text-foreground">ID / Prontuário</TableHead>
              <TableHead className="text-xs font-bold text-foreground">Estado clínico</TableHead>
              <TableHead className="text-right text-xs font-bold text-foreground pr-6">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="py-12 text-center text-xs text-muted-foreground">
                  Carregando lista geral de pacientes...
                </TableCell>
              </TableRow>
            ) : pacientesFiltrados.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-12 text-center text-xs text-muted-foreground">
                  Nenhum paciente localizado com os filtros selecionados.
                </TableCell>
              </TableRow>
            ) : (
              pacientesFiltrados.map((p) => {
                const ativo = p.status_ativo !== false;
                const idade = calcularIdade(p.data_nascimento);

                return (
                  <TableRow
                    key={p.id}
                    className="hover:bg-muted/30 transition-colors border-b border-border/60"
                  >
                    {/* COLUNA 1: PACIENTE */}
                    <TableCell className="py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                          {p.nome.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="font-semibold text-xs text-foreground truncate max-w-64">
                            {p.nome}
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            {p.cpf ? `CPF: ${p.cpf}` : "CPF não informado"}
                          </span>
                        </div>
                      </div>
                    </TableCell>

                    {/* COLUNA 2: IDADE */}
                    <TableCell className="text-xs text-foreground font-medium py-3.5">
                      {idade}
                    </TableCell>

                    {/* COLUNA 3: ID */}
                    <TableCell className="text-xs font-mono text-muted-foreground py-3.5">
                      {p.id.slice(0, 8)}...
                    </TableCell>

                    {/* COLUNA 4: ESTADO CLÍNICO */}
                    <TableCell className="py-3.5">
                      {ativo ? (
                        <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[11px] font-medium gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          <span>Ativo em tratamento</span>
                        </Badge>
                      ) : (
                        <Badge className="bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20 text-[11px] font-medium gap-1">
                          <Clock className="h-3 w-3" />
                          <span>Inativo</span>
                        </Badge>
                      )}
                    </TableCell>

                    {/* COLUNA 5: AÇÕES */}
                    <TableCell className="text-right py-3.5 pr-6">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/pacientes/${p.id}`)}
                        className="h-8 px-3 text-xs font-semibold gap-1.5 border-primary/30 text-primary hover:bg-primary/10 hover:border-primary cursor-pointer"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>Ver Perfil</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Modal de Cadastro de Paciente */}
      <DialogFormularioPaciente
        open={modalCadastroAberto}
        onOpenChange={(open) => {
          setModalCadastroAberto(open);
          if (!open) {
            void carregarPacientes();
          }
        }}
      />
    </div>
  );
}

export default TodosPacientesPage;
