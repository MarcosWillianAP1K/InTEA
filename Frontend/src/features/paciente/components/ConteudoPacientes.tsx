"use client";

import { useState } from "react";
import { ListaPacientes } from "./ListaPacientes";
import { ConteudoCriarPaciente } from "./ConteudoCriarPaciente";
import { usePacienteStore } from "../store/paciente.store";
import type { Patient } from "../types/paciente.types";

export interface ConteudoPacientesProps {
  onSelectPatient?: (patient: Patient) => void;
  selectedPatientId?: string | null;
  initialMode?: "list" | "create";
  initialVisualMode?: "table" | "grid";
  className?: string;
}
export type PatientsContentProps = ConteudoPacientesProps;

export function ConteudoPacientes({
  onSelectPatient,
  selectedPatientId,
  initialMode = "list",
  initialVisualMode = "grid",
  className = "",
}: ConteudoPacientesProps) {
  const [viewMode, setViewMode] = useState<"list" | "create">(initialMode);
  const { setSelectedPatientId } = usePacienteStore();


  // MODO: CADASTRO DE PACIENTE (PÁGINA DEDICADA)
  if (viewMode === "create") {
    return (
      <div className={`flex flex-1 flex-col w-full mx-auto ${className}`}>
        <ConteudoCriarPaciente
          onBack={() => setViewMode("list")}
          onSuccess={(newPatient) => {
            setSelectedPatientId(newPatient.id);
            if (onSelectPatient) {
              onSelectPatient(newPatient);
            }
            setViewMode("list");
          }}
        />
      </div>
    );
  }

  // MODO: LISTA / SELEÇÃO DE PACIENTES
  return (
    <div className={`flex flex-1 flex-col gap-6 w-full mx-auto py-2 ${className}`}>
     

      {/* LISTA / TABELA DE PACIENTES */}
      <ListaPacientes
        onSelectPatient={onSelectPatient}
        onOpenCreate={() => setViewMode("create")}
        selectedPatientId={selectedPatientId}
        initialVisualMode={initialVisualMode}
      />
    </div>
  );
}

export const PatientsContent = ConteudoPacientes;
export default ConteudoPacientes;
