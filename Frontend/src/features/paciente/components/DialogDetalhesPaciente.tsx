"use client";

import {
  Brain,
  Sparkles,
  HeartPulse,
  Phone,
  Calendar,
  Info,
  Check,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import type { Patient, PatientStatus } from "@/features/paciente/store/paciente.store";

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

export interface DialogDetalhesPacienteProps {
  patient: Patient | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectPatient?: (patient: Patient) => void;
}
export type PatientDetailsDialogProps = DialogDetalhesPacienteProps;

export function DialogDetalhesPaciente({
  patient,
  open,
  onOpenChange,
  onSelectPatient,
}: DialogDetalhesPacienteProps) {
  if (!patient) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-4">
            <img
              src={patient.photoUrl}
              alt={patient.name}
              className="w-14 h-14 rounded-xl object-cover border-2 border-primary/30 shadow-sm"
            />
            <div>
              <DialogTitle className="text-lg font-bold">
                {patient.name}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                {patient.age} anos • Nasc: {patient.birthDate} •{" "}
                {patient.gender === "M" ? "Masculino" : "Feminino"}
              </DialogDescription>
              <div className="flex gap-2 mt-2">
                <Badge
                  variant="outline"
                  className="bg-primary/10 text-primary border-primary/30"
                >
                  {patient.category}
                </Badge>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_CONFIG[patient.status]?.badgeClass}`}
                >
                  {STATUS_CONFIG[patient.status]?.label}
                </span>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-3 text-sm">
          {/* QUADRO CLÍNICO */}
          <div className="bg-primary/5 p-3.5 rounded-xl border border-primary/15">
            <div className="flex items-center gap-2 font-semibold text-primary dark:text-blue-400 mb-1 text-xs uppercase tracking-wider">
              <Brain className="h-4 w-4 text-primary" />
              Quadro Clínico e Funcional
            </div>
            <p className="text-foreground/90 leading-relaxed text-xs">
              {patient.clinicalStatus}
            </p>
          </div>

          {/* COMUNICAÇÃO E SENSIBILIDADES */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 rounded-xl border bg-card">
              <div className="flex items-center gap-1.5 font-semibold text-xs text-muted-foreground mb-1.5">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                Estilo de Comunicação
              </div>
              <p className="text-xs text-foreground/90 leading-relaxed">
                {patient.communicationStyle}
              </p>
            </div>

            <div className="p-3 rounded-xl border bg-card">
              <div className="flex items-center gap-1.5 font-semibold text-xs text-muted-foreground mb-1.5">
                <HeartPulse className="h-3.5 w-3.5 text-primary" />
                Sensibilidades Sensoriais
              </div>
              <div className="flex flex-wrap gap-1">
                {patient.sensorySensitivities.map((sens, idx) => (
                  <Badge
                    key={idx}
                    variant="secondary"
                    className="text-[10px] font-normal"
                  >
                    {sens}
                  </Badge>
                ))}
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
                {patient.responsibleName}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block">Contato:</span>
              <span className="font-semibold text-foreground flex items-center gap-1">
                <Phone className="h-3 w-3 text-primary" />
                {patient.responsiblePhone}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block">
                Terapeuta Responsável:
              </span>
              <span className="font-semibold text-foreground">
                {patient.therapist}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block">
                Última Atividade:
              </span>
              <span className="font-semibold text-foreground flex items-center gap-1 font-mono">
                <Calendar className="h-3 w-3 text-primary" />
                {patient.lastSessionDate}
              </span>
            </div>
          </div>

          {/* OBSERVAÇÕES */}
          <div className="p-3 rounded-xl border bg-card">
            <div className="flex items-center gap-1.5 font-semibold text-xs text-muted-foreground mb-1">
              <Info className="h-3.5 w-3.5 text-primary" />
              Observações Clínicas
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {patient.notes}
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            Fechar
          </Button>
          <Button
            size="sm"
            onClick={() => {
              if (onSelectPatient) {
                onSelectPatient(patient);
              }
              onOpenChange(false);
            }}
            className="bg-primary hover:bg-primary-hover text-primary-foreground font-semibold"
          >
            <Check className="h-3.5 w-3.5 mr-1" />
            Selecionar este Paciente
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export const PatientDetailsDialog = DialogDetalhesPaciente;
export default DialogDetalhesPaciente;
