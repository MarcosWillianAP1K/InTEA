"use client";

import { useState } from "react";
import {
  Search,
  MoreVertical,
  RotateCcw,
  Eye,
  Check,
  FileText,
  Calendar,
  Phone,
  Brain,
  Sparkles,
  HeartPulse,
  Info,
  Plus,
} from "lucide-react";

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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";

import { usePatientsStore, PATIENTS_DICTIONARY } from "../store/patients.store";
import type { Patient, PatientStatus } from "../store/patients.store";
import { PatientFormDialog } from "./patientFormDialog";

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
      "border-[#0b3294]/40 text-[#0b3294] dark:text-blue-400 bg-[#0b3294]/10",
  },
  FINISHED: {
    label: "Finalizado",
    badgeClass:
      "border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/60",
  },
  EVALUATION: {
    label: "Em avaliação",
    badgeClass:
      "border-[#0b3294]/30 text-[#0b3294] dark:text-blue-300 bg-[#0b3294]/5",
  },
  ATTENTION: {
    label: "Atenção",
    badgeClass:
      "border-red-500/30 text-red-600 dark:text-red-400 bg-red-500/10",
  },
};

interface PatientsListProps {
  onSelectPatient?: (patient: Patient) => void;
  onOpenCreate?: () => void;
  selectedPatientId?: string | null;
  className?: string;
}

export function PatientsList({
  onSelectPatient,
  onOpenCreate,
  selectedPatientId: propSelectedId,
  className = "",
}: PatientsListProps) {
  const [detailModalPatient, setDetailModalPatient] = useState<Patient | null>(
    null,
  );
  const [isCreateOpen, setIsCreateOpen] = useState(false);

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
  } = usePatientsStore();

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
            className="pl-9 focus-visible:border-[#0b3294] focus-visible:ring-[#0b3294]/30"
          />
        </div>

        {/* FILTROS E ORDENAÇÃO À DIREITA */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* SELECT CATEGORIA / NÍVEL */}
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-47.5 focus:border-[#0b3294]">
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
            <SelectTrigger className="w-37.5 focus:border-[#0b3294]">
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
            <SelectTrigger className="w-35 focus:border-[#0b3294]">
              <SelectValue placeholder="Mais recentes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Mais recentes</SelectItem>
              <SelectItem value="name-asc">Nome (A-Z)</SelectItem>
              <SelectItem value="age-asc">Menor Idade</SelectItem>
              <SelectItem value="age-desc">Maior Idade</SelectItem>
            </SelectContent>
          </Select>

          {/* BOTÃO CADASTRAR PACIENTE ESTILO NOVA SEÇÃO */}
          <Button
            type="button"
            onClick={() => {
              if (onOpenCreate) {
                onOpenCreate();
              } else {
                setIsCreateOpen(true);
              }
            }}
            className="h-10 px-4 bg-[#0b3294] text-white hover:bg-[#0b3294]/90 font-semibold rounded-lg flex items-center gap-2 cursor-pointer shadow-xs transition-all"
          >
            <Plus className="h-4 w-4" />
            <span>Cadastrar Paciente</span>
          </Button>
        </div>
      </div>

      {/* TABELA DE PACIENTES */}
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
                  Nenhum paciente encontrado com os filtros selecionados.
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
                        ? "bg-[#0b3294]/10 hover:bg-[#0b3294]/15"
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
                          <FileText className="h-4 w-4 text-[#0b3294] absolute" />
                        </div>

                        <div className="flex flex-col min-w-0">
                          <span
                            className={`font-semibold text-sm leading-snug truncate ${
                              isSelected
                                ? "text-[#0b3294] dark:text-blue-400 font-bold"
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
                        className="font-normal bg-[#0b3294]/5 border-[#0b3294]/20 text-[#0b3294] dark:text-blue-300"
                      >
                        {patient.category}
                      </Badge>
                    </TableCell>

                    {/* COLUNA: PROGRESSO */}
                    <TableCell>
                      <div className="flex items-center w-full">
                        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full bg-[#0b3294] transition-all duration-300 rounded-full"
                            style={{ width: `${patient.progress}%` }}
                          />
                        </div>
                      </div>
                    </TableCell>

                    {/* COLUNA: DESEMPENHO */}
                    <TableCell className="text-xs font-semibold text-foreground">
                      {patient.performanceScore !== undefined
                        ? `${patient.performanceScore}%`
                        : "—"}
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
                            className="h-8 px-4 text-xs font-semibold bg-[#0b3294] text-white hover:bg-[#0b3294]/90 hover:cursor-pointer shadow-xs"
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
                            className="h-8 px-4 text-xs hover:bg-[#0b3294]/10 hover:text-[#0b3294] hover:border-[#0b3294]/40 hover:cursor-pointer transition-colors"
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
                              className="h-8 w-8 text-muted-foreground hover:text-[#0b3294] hover:bg-[#0b3294]/10 hover:cursor-pointer"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => setDetailModalPatient(patient)}
                              className="hover:cursor-pointer"
                            >
                              <Eye className="mr-2 h-4 w-4 text-muted-foreground" />
                              Ver detalhes clínicos
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleSelect(patient)}
                              className="hover:cursor-pointer"
                            >
                              <Check className="mr-2 h-4 w-4 text-[#0b3294]" />
                              Definir como paciente ativo
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                handleSelect(patient);
                              }}
                              className="hover:cursor-pointer"
                            >
                              <RotateCcw className="mr-2 h-4 w-4 text-[#0b3294]" />
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

      {/* MODAL DE DETALHES CLÍNICOS DO PACIENTE */}
      <Dialog
        open={!!detailModalPatient}
        onOpenChange={(open) => !open && setDetailModalPatient(null)}
      >
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          {detailModalPatient && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-4">
                  <img
                    src={detailModalPatient.photoUrl}
                    alt={detailModalPatient.name}
                    className="w-14 h-14 rounded-xl object-cover border-2 border-[#0b3294]/30 shadow-sm"
                  />
                  <div>
                    <DialogTitle className="text-lg font-bold">
                      {detailModalPatient.name}
                    </DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                      {detailModalPatient.age} anos • Nasc:{" "}
                      {detailModalPatient.birthDate} •{" "}
                      {detailModalPatient.gender === "M"
                        ? "Masculino"
                        : "Feminino"}
                    </DialogDescription>
                    <div className="flex gap-2 mt-2">
                      <Badge
                        variant="outline"
                        className="bg-[#0b3294]/10 text-[#0b3294] border-[#0b3294]/30"
                      >
                        {detailModalPatient.category}
                      </Badge>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_CONFIG[detailModalPatient.status]?.badgeClass}`}
                      >
                        {STATUS_CONFIG[detailModalPatient.status]?.label}
                      </span>
                    </div>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-4 py-3 text-sm">
                {/* QUADRO CLÍNICO */}
                <div className="bg-[#0b3294]/5 p-3.5 rounded-xl border border-[#0b3294]/15">
                  <div className="flex items-center gap-2 font-semibold text-[#0b3294] dark:text-blue-400 mb-1 text-xs uppercase tracking-wider">
                    <Brain className="h-4 w-4 text-[#0b3294]" />
                    Quadro Clínico e Funcional
                  </div>
                  <p className="text-foreground/90 leading-relaxed text-xs">
                    {detailModalPatient.clinicalStatus}
                  </p>
                </div>

                {/* COMUNICAÇÃO E SENSIBILIDADES */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl border bg-card">
                    <div className="flex items-center gap-1.5 font-semibold text-xs text-muted-foreground mb-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-[#0b3294]" />
                      Estilo de Comunicação
                    </div>
                    <p className="text-xs text-foreground/90 leading-relaxed">
                      {detailModalPatient.communicationStyle}
                    </p>
                  </div>

                  <div className="p-3 rounded-xl border bg-card">
                    <div className="flex items-center gap-1.5 font-semibold text-xs text-muted-foreground mb-1.5">
                      <HeartPulse className="h-3.5 w-3.5 text-[#0b3294]" />
                      Sensibilidades Sensoriais
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {detailModalPatient.sensorySensitivities.map(
                        (sens, idx) => (
                          <Badge
                            key={idx}
                            variant="secondary"
                            className="text-[10px] font-normal"
                          >
                            {sens}
                          </Badge>
                        ),
                      )}
                    </div>
                  </div>
                </div>

                {/* RESPONSÁVEIS E TERAPEUTA */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-muted/30 p-3 rounded-xl border">
                  <div>
                    <span className="text-muted-foreground block">
                      Responsável Legal:
                    </span>
                    <span className="font-semibold text-foreground">
                      {detailModalPatient.responsibleName}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">
                      Contato:
                    </span>
                    <span className="font-semibold text-foreground flex items-center gap-1">
                      <Phone className="h-3 w-3 text-[#0b3294]" />
                      {detailModalPatient.responsiblePhone}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">
                      Terapeuta Responsável:
                    </span>
                    <span className="font-semibold text-foreground">
                      {detailModalPatient.therapist}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">
                      Última Atividade:
                    </span>
                    <span className="font-semibold text-foreground flex items-center gap-1 font-mono">
                      <Calendar className="h-3 w-3 text-[#0b3294]" />
                      {detailModalPatient.lastSessionDate}
                    </span>
                  </div>
                </div>

                {/* OBSERVAÇÕES */}
                <div className="p-3 rounded-xl border bg-card">
                  <div className="flex items-center gap-1.5 font-semibold text-xs text-muted-foreground mb-1">
                    <Info className="h-3.5 w-3.5 text-[#0b3294]" />
                    Observações Clínicas
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {detailModalPatient.notes}
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDetailModalPatient(null)}
                >
                  Fechar
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    handleSelect(detailModalPatient);
                    setDetailModalPatient(null);
                  }}
                  className="bg-[#0b3294] hover:bg-[#0b3294]/90 text-white font-semibold"
                >
                  <Check className="h-3.5 w-3.5 mr-1" />
                  Selecionar este Paciente
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* MODAL DE CADASTRO DE NOVO PACIENTE */}
      <PatientFormDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />
    </div>
  );
}

export default PatientsList;
