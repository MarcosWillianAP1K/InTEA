"use client";

import { useState } from "react";
import {
  Search,
  MoreVertical,
  RotateCcw,
  Eye,
  Check,
  FileText,
  Plus,
  LayoutGrid,
  TableProperties,
  Users,
} from "lucide-react";
import { CardPacienteGrid } from "./CardPacienteGrid";
import { SparklineTendencia } from "./SparklineTendencia";
import { CardAdicionarPaciente } from "./CardAdicionarPaciente";

import { Input } from "@/shared/components/ui/input";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";

import { usePacienteStore, PATIENTS_DICTIONARY } from "../store/paciente.store";
import type { Patient, PatientStatus } from "../store/paciente.store";
import { DialogFormularioPaciente } from "./DialogFormularioPaciente";
import { DialogDetalhesPaciente } from "./DialogDetalhesPaciente";

export { PATIENTS_DICTIONARY };
export type { Patient, PatientStatus };

// ==========================================
// CONFIGURAÇÃO DE STATUS (HARMONIZADO COM NAV BLUE)
// ==========================================
const STATUS_CONFIG: Record<
  PatientStatus,
  { label: string; badgeClass: string }
> = {
  IN_PROGRESS: {
    label: "Em andamento",
    badgeClass:
      "border-primary/40 text-primary dark:text-blue-400 bg-primary/10",
  },
  FINISHED: {
    label: "Finalizado",
    badgeClass:
      "border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/60",
  },
  EVALUATION: {
    label: "Em avaliação",
    badgeClass:
      "border-primary/30 text-primary dark:text-blue-300 bg-primary/5",
  },
  ATTENTION: {
    label: "Atenção",
    badgeClass:
      "border-red-500/30 text-red-600 dark:text-red-400 bg-red-500/10",
  },
};

export interface ListaPacientesProps {
  onSelectPatient?: (patient: Patient) => void;
  onOpenCreate?: () => void;
  onVerPerfil?: (patient: Patient) => void;
  selectedPatientId?: string | null;
  initialVisualMode?: "table" | "grid";
  permitirCadastro?: boolean;
  className?: string;
}
export type PatientsListProps = ListaPacientesProps;

export function ListaPacientes({
  onSelectPatient,
  onOpenCreate,
  onVerPerfil,
  selectedPatientId: propSelectedId,
  initialVisualMode = "grid",
  permitirCadastro = true,
  className = "",
}: ListaPacientesProps) {
  const [visualMode, setVisualMode] = useState<"table" | "grid">(initialVisualMode);
  const [detailModalPatient, setDetailModalPatient] = useState<Patient | null>(
    null,
  );
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const handleAbrirPerfil = (patient: Patient) => {
    if (onVerPerfil) onVerPerfil(patient);
    else setDetailModalPatient(patient);
  };

  const {
    selectedPatientId: storeSelectedId,
    setSelectedPatientId,
    searchTerm,
    setSearchTerm,
    categoryFilter,
    setCategoryFilter,
    statusFilter,
    setStatusFilter,
    sortOrder,
    setSortOrder,
    getFilteredPatients,
    getCategories,
  } = usePacienteStore();

  const activeSelectedId =
    propSelectedId !== undefined ? propSelectedId : storeSelectedId;
  const filteredPatients = getFilteredPatients();
  const categories = getCategories();

  const handleSelect = (patient: Patient) => {
    setSelectedPatientId(patient.id);
    if (onSelectPatient) {
      onSelectPatient(patient);
    }
  };

  return (
    <div className={`flex flex-col gap-6 w-full ${className}`}>
      {/* BARRA SUPERIOR DE BUSCA E FILTROS */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* BUSCA À ESQUERDA */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar paciente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 focus-visible:border-primary focus-visible:ring-primary/30"
          />
        </div>

        {/* FILTROS E ORDENAÇÃO À DIREITA */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* SELECT CATEGORIA / NÍVEL */}
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-47.5 focus:border-primary">
              <SelectValue placeholder="Selecione uma categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as categorias</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* SELECT STATUS */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-37.5 focus:border-primary">
              <SelectValue placeholder="Todos os status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="IN_PROGRESS">Em andamento</SelectItem>
              <SelectItem value="FINISHED">Finalizado</SelectItem>
            </SelectContent>
          </Select>

          {/* SELECT ORDENAÇÃO */}
          <Select value={sortOrder} onValueChange={setSortOrder}>
            <SelectTrigger className="w-35 focus:border-primary">
              <SelectValue placeholder="Mais recentes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Mais recentes</SelectItem>
              <SelectItem value="name-asc">Nome (A-Z)</SelectItem>
              <SelectItem value="age-asc">Menor Idade</SelectItem>
              <SelectItem value="age-desc">Maior Idade</SelectItem>
            </SelectContent>
          </Select>

          {/* ALTERNADOR DE MODO VISUAL: TABELA vs GRID */}
          <div className="flex items-center rounded-lg border border-border bg-muted/40 p-1">
            <button
              type="button"
              data-testid="toggle-view-grid"
              title="Exibir em Grid de Cards"
              onClick={() => setVisualMode("grid")}
              className={`p-1.5 rounded-md transition-all cursor-pointer ${
                visualMode === "grid"
                  ? "bg-card text-primary dark:text-blue-400 shadow-2xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              type="button"
              data-testid="toggle-view-table"
              title="Exibir em Tabela"
              onClick={() => setVisualMode("table")}
              className={`p-1.5 rounded-md transition-all cursor-pointer ${
                visualMode === "table"
                  ? "bg-card text-primary dark:text-blue-400 shadow-2xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <TableProperties className="h-4 w-4" />
            </button>
          </div>

          {/* BOTÃO CADASTRAR PACIENTE ESTILO NOVA SEÇÃO */}
          {permitirCadastro && (
            <Button
              type="button"
              onClick={() => {
                if (onOpenCreate) {
                  onOpenCreate();
                } else {
                  setIsCreateOpen(true);
                }
              }}
              className="h-10 px-4 bg-primary text-primary-foreground hover:bg-primary-hover font-semibold rounded-lg flex items-center gap-2 cursor-pointer shadow-xs transition-all"
            >
              <Plus className="h-4 w-4" />
              <span>Cadastrar Paciente</span>
            </Button>
          )}
        </div>
      </div>

      {/* EXIBIÇÃO: GRID DE CARDS vs TABELA */}
      {visualMode === "grid" ? (
        filteredPatients.length === 0 && !permitirCadastro ? (
          <div
            data-testid="grid-pacientes-vazio"
            className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-dashed border-border bg-card/50 my-2"
          >
            <div className="h-12 w-12 rounded-full bg-muted/60 flex items-center justify-center text-muted-foreground mb-3">
              <Users className="h-6 w-6" />
            </div>
            <p className="text-base font-semibold text-foreground">
              Nenhum paciente vinculado
            </p>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm">
              Você não possui nenhum paciente vinculado aos seus cuidados clínicos no momento.
            </p>
          </div>
        ) : (
          <div
            data-testid="grid-pacientes"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
          >
            {/* PRIMEIRO CARD: ADICIONAR PACIENTE */}
            {permitirCadastro && (
              <CardAdicionarPaciente
                onClick={() => {
                  if (onOpenCreate) {
                    onOpenCreate();
                  } else {
                    setIsCreateOpen(true);
                  }
                }}
              />
            )}

            {/* CARDS DOS PACIENTES FILTRADOS */}
            {filteredPatients.map((patient) => (
              <CardPacienteGrid
                key={patient.id}
                patient={patient}
                isSelected={activeSelectedId === patient.id}
                onSelect={() => handleSelect(patient)}
                onVerPerfil={() => handleAbrirPerfil(patient)}
              />
            ))}
          </div>
        )
      ) : (
        /* TABELA DE PACIENTES */
        <div className="w-full overflow-x-auto rounded-xl border bg-card shadow-xs">
          <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-80">Paciente</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead className="w-35">Progresso</TableHead>
              <TableHead>Desempenho</TableHead>
              <TableHead>Data de Criação</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-40 text-center">Ação</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {filteredPatients.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center py-12 text-muted-foreground text-sm"
                >
                  {!permitirCadastro
                    ? "Nenhum paciente vinculado"
                    : "Nenhum paciente encontrado com os filtros selecionados."}
                </TableCell>
              </TableRow>
            ) : (
              filteredPatients.map((patient) => {
                const statusInfo =
                  STATUS_CONFIG[patient.status] || STATUS_CONFIG.IN_PROGRESS;
                const isSelected = activeSelectedId === patient.id;

                return (
                  <TableRow
                    key={patient.id}
                    onClick={() => handleSelect(patient)}
                    className={`cursor-pointer transition-colors ${
                      isSelected
                        ? "bg-primary/10 hover:bg-primary/15"
                        : "hover:bg-muted/50"
                    }`}
                  >
                    {/* COLUNA: PACIENTE */}
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="relative shrink-0 w-10 h-10 rounded-lg overflow-hidden border bg-muted flex items-center justify-center">
                          <img
                            src={patient.photoUrl}
                            alt={patient.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                            }}
                          />
                          <FileText className="h-4 w-4 text-primary absolute" />
                        </div>

                        <div className="flex flex-col min-w-0">
                          <span
                            className={`font-semibold text-sm leading-snug truncate ${
                              isSelected
                                ? "text-primary dark:text-blue-400 font-bold"
                                : "text-foreground"
                            }`}
                          >
                            {patient.name}
                          </span>
                          <span className="text-xs text-muted-foreground truncate max-w-55">
                            {patient.age} anos • {patient.clinicalStatus}
                          </span>
                        </div>
                      </div>
                    </TableCell>

                    {/* COLUNA: CATEGORIA */}
                    <TableCell>
                      <Badge
                        variant="outline"
                        className="font-normal bg-primary/5 border-primary/20 text-primary dark:text-blue-300"
                      >
                        {patient.category}
                      </Badge>
                    </TableCell>

                    {/* COLUNA: PROGRESSO */}
                    <TableCell>
                      <div className="flex items-center w-full">
                        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full bg-primary transition-all duration-300 rounded-full"
                            style={{ width: `${patient.progress}%` }}
                          />
                        </div>
                      </div>
                    </TableCell>

                    {/* COLUNA: DESEMPENHO (com SparklineTendencia) */}
                    <TableCell className="text-xs font-semibold text-foreground">
                      <div className="flex items-center gap-2">
                        <span className="min-w-[32px]">
                          {patient.performanceScore !== undefined
                            ? `${patient.performanceScore}%`
                            : "—"}
                        </span>
                        <SparklineTendencia
                          data={patient.performanceHistory || (patient.performanceScore !== undefined ? [Math.max(0, patient.performanceScore - 15), Math.max(0, patient.performanceScore - 6), patient.performanceScore] : null)}
                          width={54}
                          height={18}
                        />
                      </div>
                    </TableCell>

                    {/* COLUNA: DATA DE CRIAÇÃO / ÚLTIMA ATIVIDADE */}
                    <TableCell className="text-xs text-muted-foreground font-mono">
                      {patient.lastSessionDate}
                    </TableCell>

                    {/* COLUNA: STATUS */}
                    <TableCell>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusInfo.badgeClass}`}
                      >
                        {statusInfo.label}
                      </span>
                    </TableCell>

                    {/* COLUNA: AÇÃO */}
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        {patient.status === "IN_PROGRESS" ? (
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelect(patient);
                            }}
                            className="h-8 px-4 text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary-hover hover:cursor-pointer shadow-xs"
                          >
                            Continuar
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDetailModalPatient(patient);
                            }}
                            className="h-8 px-4 text-xs hover:bg-primary/10 hover:text-primary hover:border-primary/40 hover:cursor-pointer transition-colors"
                          >
                            Resultado
                          </Button>
                        )}

                        {/* MENU DROPDOWN DE 3 PONTINHOS */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10 hover:cursor-pointer"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => handleAbrirPerfil(patient)}
                              className="hover:cursor-pointer"
                            >
                              <Eye className="mr-2 h-4 w-4 text-muted-foreground" />
                              Ver detalhes clínicos
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleSelect(patient)}
                              className="hover:cursor-pointer"
                            >
                              <Check className="mr-2 h-4 w-4 text-primary" />
                              Definir como paciente ativo
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                handleSelect(patient);
                              }}
                              className="hover:cursor-pointer"
                            >
                              <RotateCcw className="mr-2 h-4 w-4 text-primary" />
                              Iniciar nova sessão
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
      )}

      {/* MODAL DE DETALHES CLÍNICOS DO PACIENTE */}
      <DialogDetalhesPaciente
        patient={detailModalPatient}
        open={!!detailModalPatient}
        onOpenChange={(open) => !open && setDetailModalPatient(null)}
        onSelectPatient={(patient) => {
          handleSelect(patient);
          setDetailModalPatient(null);
        }}
      />

      {/* MODAL DE CADASTRO DE NOVO PACIENTE */}
      {permitirCadastro && (
        <DialogFormularioPaciente open={isCreateOpen} onOpenChange={setIsCreateOpen} />
      )}
    </div>
  );
}

export const PatientsList = ListaPacientes;
export default ListaPacientes;
