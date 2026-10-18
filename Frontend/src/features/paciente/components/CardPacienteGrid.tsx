import { useState } from "react";
import { Calendar, User } from "lucide-react";
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
          ? "border-[#00288E] dark:border-blue-500 shadow-md ring-2 ring-[#00288E]/20"
          : "border-slate-200 dark:border-border hover:border-[#00288E]/50 dark:hover:border-blue-500/50 hover:shadow-md"
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
        <div className="relative w-20 h-20 rounded-full bg-[#D3E4FE] dark:bg-blue-950/60 border-4 border-[#F8F9FF] dark:border-card flex items-center justify-center overflow-hidden shadow-xs mt-1 mb-3">
          {patient.photoUrl && !imgError ? (
            <img
              src={patient.photoUrl}
              alt={patient.name}
              onError={() => setImgError(true)}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-xl font-bold text-[#00288E] dark:text-blue-300 select-none">
              {initials || <User className="h-8 w-8 text-[#00288E] dark:text-blue-300" />}
            </span>
          )}
        </div>

        {/* NOME DO PACIENTE (Figma: 'Heading 3') */}
        <h3 className="font-semibold text-xl text-[#0B1C30] dark:text-foreground text-center truncate w-full">
          {patient.name}
        </h3>

        {/* IDADE (Figma: 'Container' > '8 anos') */}
        <p className="text-sm font-normal text-[#444653] dark:text-muted-foreground text-center mt-0.5">
          {patient.age} {patient.age === 1 ? "ano" : "anos"}
        </p>
      </div>

      {/* CONDIÇÃO CLÍNICA / CATEGORIA (Figma: 'Background') */}
      <div className="flex flex-col items-center px-3 py-2 w-full rounded-lg bg-[#D3E4FE]/70 dark:bg-blue-950/40 my-3 text-center">
        <span className="text-2xs font-semibold uppercase tracking-wider text-[#757684] dark:text-blue-300">
          Estado clínico
        </span>
        <span
          title={patient.category || patient.clinicalStatus}
          className="text-sm font-semibold text-[#0B1C30] dark:text-blue-100 truncate w-full mt-0.5"
        >
          {patient.category || patient.clinicalStatus}
        </span>
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
          className="w-full h-9 rounded-md bg-[#FEFCFF] dark:bg-slate-900 border border-[#C4C5D5] dark:border-slate-700 text-[#00288E] dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 font-semibold text-xs transition-colors cursor-pointer"
        >
          Ver Perfil
        </Button>
      </div>
    </div>
  );
}

export const PatientGridCard = CardPacienteGrid;
export default CardPacienteGrid;
