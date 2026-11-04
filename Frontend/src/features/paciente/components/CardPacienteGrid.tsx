import { useState } from "react";
import { Calendar, User } from "lucide-react";
import { SparklineTendencia } from "./SparklineTendencia";
import { Button } from "@/shared/components/ui/button";
import type { Patient } from "../types/paciente.types";

/**
 * ============================================================================
 * COMPONENTE CARD PACIENTE GRID (InTEA)
 * Figma: 'Card paciente' (Node ID: '67:1592')
 * Conformidade: RF06 (Visualização de Pacientes), RN04 (Visibilidade Clínica)
 * TypeScript Estrito: Sem uso de `any`
 * ============================================================================
 */

export interface CardPacienteGridProps {
  patient: Patient;
  onVerPerfil?: (patient: Patient) => void;
  onSelect?: (patient: Patient) => void;
  isSelected?: boolean;
  className?: string;
}

export function CardPacienteGrid({
  patient,
  onVerPerfil,
  onSelect,
  isSelected = false,
  className = "",
}: CardPacienteGridProps) {
  const [imgError, setImgError] = useState(false);

  const initials = patient.name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase() || "")
    .join("");

  const isAtivo = patient.status === "IN_PROGRESS" || patient.status === "EVALUATION";

  const handleCardClick = () => {
    if (onSelect) {
      onSelect(patient);
    }
  };

  const handleVerPerfilClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onVerPerfil) {
      onVerPerfil(patient);
    } else if (onSelect) {
      onSelect(patient);
    }
  };

  return (
    <div
      data-testid={`card-paciente-grid-${patient.id}`}
      onClick={handleCardClick}
      className={`relative flex flex-col justify-between items-center px-6 py-5 rounded-2xl bg-card border-2 transition-all cursor-pointer ${
        isSelected
          ? "border-primary shadow-md ring-2 ring-primary/20"
          : "border-border hover:border-primary/50 hover:shadow-md"
      } ${className}`}
    >
      {/* BADGE DE STATUS (ATIVO / INATIVO) */}
      <div className="absolute top-4 right-4">
        {isAtivo ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-2xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300/50 dark:border-emerald-800">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Ativo
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-2xs font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-300/50 dark:border-slate-700">
            <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
            Inativo
          </span>
        )}
      </div>

      {/* AVATAR COM FOTO OU INICIAIS (Figma: 'Background+Border+Shadow') */}
      <div className="flex flex-col items-center w-full">
        <div className="relative w-20 h-20 rounded-full bg-card-patient border-4 border-background flex items-center justify-center overflow-hidden shadow-xs mt-1 mb-3">
          {patient.photoUrl && !imgError ? (
            <img
              src={patient.photoUrl}
              alt={patient.name}
              onError={() => setImgError(true)}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-xl font-bold text-primary select-none">
              {initials || <User className="h-8 w-8 text-primary" />}
            </span>
          )}
        </div>

        {/* NOME DO PACIENTE (Figma: 'Heading 3') */}
        <h3 className="font-semibold text-xl text-foreground-heading text-center truncate w-full">
          {patient.name}
        </h3>

        {/* IDADE (Figma: 'Container' > '8 anos') */}
        <p className="text-sm font-normal text-foreground text-center mt-0.5">
          {patient.age} {patient.age === 1 ? "ano" : "anos"}
        </p>
      </div>

      {/* CONDIÇÃO CLÍNICA / CATEGORIA (Figma: 'Background') */}
      <div className="flex flex-col items-center px-3 py-2 w-full rounded-lg bg-card-patient/70 dark:bg-card-patient/30 my-3 text-center">
        <span className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
          Estado clínico
        </span>
        <span
          title={patient.category || patient.clinicalStatus}
          className="text-sm font-semibold text-foreground-heading truncate w-full mt-0.5"
        >
          {patient.category || patient.clinicalStatus}
        </span>
      </div>

      {/* TENDÊNCIA CLÍNICA & DESEMPENHO (SparklineTendencia) */}
      <div className="flex items-center justify-between w-full px-3 py-2 mb-3 rounded-lg bg-card-patient/40 dark:bg-card-patient/20 border border-border/40">
        <div className="flex flex-col text-left">
          <span className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
            Evolução
          </span>
          <span className="text-xs font-bold text-foreground">
            {patient.performanceScore !== undefined
              ? `${patient.performanceScore}%`
              : `${patient.progress}%`}
          </span>
        </div>
        <SparklineTendencia
          data={patient.performanceHistory || (patient.performanceScore !== undefined ? [Math.max(0, patient.performanceScore - 15), Math.max(0, patient.performanceScore - 6), patient.performanceScore] : [Math.max(0, patient.progress - 10), patient.progress])}
          width={60}
          height={20}
        />
      </div>

      {/* ÚLTIMA SESSÃO & BOTÃO DE AÇÃO */}
      <div className="flex flex-col items-center gap-2.5 w-full mt-auto">
        <p className="text-xs text-muted-foreground flex items-center justify-center gap-1 text-center font-mono">
          <Calendar className="h-3 w-3 text-muted-foreground shrink-0" />
          <span>Última sessão: {patient.lastSessionDate || "Sem registros"}</span>
        </p>

        {/* BOTÃO VER PERFIL (Figma: 'Button ver perfil') */}
        <Button
          type="button"
          variant="outline"
          onClick={handleVerPerfilClick}
          className="w-full h-9 rounded-md bg-surface border border-border-neutral text-primary hover:bg-surface-alt font-semibold text-xs transition-colors cursor-pointer"
        >
          Ver Perfil
        </Button>
      </div>
    </div>
  );
}

export const PatientGridCard = CardPacienteGrid;
export default CardPacienteGrid;
