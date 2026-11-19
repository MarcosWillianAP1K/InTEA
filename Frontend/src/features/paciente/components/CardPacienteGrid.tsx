import { Calendar } from "lucide-react";
import { AvatarClinico } from "@/shared/components/AvatarClinico";
import { Button } from "@/shared/components/ui/button";
import {
  ESTADO_CLINICO_NAO_INFORMADO,
  ULTIMA_SESSAO_VAZIA,
} from "../constants/condicoesClinicas";
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
      {/* BADGE DISCRETA APENAS PARA INATIVO */}
      {!isAtivo && (
        <div className="absolute top-4 right-4">
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-2xs font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-300/50 dark:border-slate-700">
            <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
            Inativo
          </span>
        </div>
      )}

      {/* AVATAR COM FOTO OU INICIAIS */}
      <div className="flex flex-col items-center w-full">
        <AvatarClinico
          nome={patient.name}
          src={patient.photoUrl || null}
          size="xl"
          className="border-4 border-background shadow-xs mt-1 mb-3"
        />

        {/* NOME DO PACIENTE (Figma: 'Heading 3') */}
        <h3 className="font-semibold text-xl text-foreground-heading text-center truncate w-full">
          {patient.name}
        </h3>

        {/* IDADE */}
        <p className="text-sm font-normal text-foreground text-center mt-0.5">
          {patient.age > 0
            ? `${patient.age} ${patient.age === 1 ? "ano" : "anos"}`
            : "Idade não informada"}
        </p>
      </div>

      {/* ESTADO CLÍNICO / CONDIÇÃO */}
      <div className="flex flex-col items-center px-3 py-2 w-full rounded-lg bg-card-patient/70 dark:bg-card-patient/30 my-3 text-center">
        <span className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
          Estado clínico
        </span>
        <span
          title={patient.category || patient.clinicalStatus || ESTADO_CLINICO_NAO_INFORMADO}
          className="text-sm font-semibold text-foreground-heading truncate w-full mt-0.5"
        >
          {patient.category || patient.clinicalStatus || ESTADO_CLINICO_NAO_INFORMADO}
        </span>
      </div>

      {/* ÚLTIMA SESSÃO & BOTÃO DE AÇÃO */}
      <div className="flex flex-col items-center gap-2.5 w-full mt-auto">
        <p className="text-xs text-muted-foreground flex items-center justify-center gap-1 text-center font-mono">
          <Calendar className="h-3 w-3 text-muted-foreground shrink-0" />
          <span>
            Última sessão: {patient.lastSessionDate || ULTIMA_SESSAO_VAZIA}
          </span>
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
