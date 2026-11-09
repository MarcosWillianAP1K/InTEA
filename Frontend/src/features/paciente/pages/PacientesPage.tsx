"use client";

import { useEffect } from "react";
import { useInRouterContext, useNavigate } from "react-router-dom";
import { ListaPacientes } from "../components/ListaPacientes";
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
  initialVisualMode = "grid",
  className = "",
}: ConteudoPacientesProps) {
  const { fetchPatients } = usePacienteStore();
  const inRouter = useInRouterContext();
  const navigate = inRouter ? useNavigate() : null;

  useEffect(() => {
    void fetchPatients();
  }, [fetchPatients]);

  // MODO: LISTA / SELEÇÃO DE PACIENTES VINCULADOS
  return (
    <div className={`flex flex-1 flex-col gap-6 w-full mx-auto py-2 ${className}`}>
      {/* Cabeçalho */}
      <div className="flex items-center justify-between px-1">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            Meus Pacientes Vinculados
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Gerencie prontuários e sessões dos pacientes sob seus cuidados clínicos.
          </p>
        </div>
      </div>

      {/* LISTA / TABELA DE PACIENTES */}
      <ListaPacientes
        onSelectPatient={onSelectPatient}
        permitirCadastro={false}
        onVerPerfil={(p) => {
          if (navigate) {
            navigate(`/pacientes/${p.id}`);
          }
        }}
        selectedPatientId={selectedPatientId}
        initialVisualMode={initialVisualMode}
      />
    </div>
  );
}

export const PacientesPage = ConteudoPacientes;
export const PatientsContent = ConteudoPacientes;
export default PacientesPage;
