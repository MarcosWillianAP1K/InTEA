"use client";

import { useState, useEffect } from "react";
import { useInRouterContext, useNavigate } from "react-router-dom";
import { Users, ArrowRight } from "lucide-react";
import { ListaPacientes } from "../components/ListaPacientes";
import { ConteudoCriarPaciente } from "../components/ConteudoCriarPaciente";
import { usePacienteStore } from "../store/paciente.store";
import { Button } from "@/shared/components/ui/button";
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
  const { setSelectedPatientId, fetchPatients } = usePacienteStore();
  const inRouter = useInRouterContext();
  const navigate = inRouter ? useNavigate() : null;

  useEffect(() => {
    void fetchPatients();
  }, [fetchPatients]);

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
      {/* Barra superior de atalho para Todos os Pacientes */}
      <div className="flex items-center justify-between px-1">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            Meus Pacientes Vinculados
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Gerencie prontuários e sessões dos pacientes sob seus cuidados clínicos.
          </p>
        </div>
        {navigate && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/pacientes/todos")}
            className="text-xs font-semibold gap-2 border-primary/30 text-primary hover:bg-primary/10 hover:border-primary cursor-pointer"
          >
            <Users className="h-3.5 w-3.5" />
            <span>Ver todos os pacientes</span>
            <ArrowRight className="h-3 w-3" />
          </Button>
        )}
      </div>

      {/* LISTA / TABELA DE PACIENTES */}
      <ListaPacientes
        onSelectPatient={onSelectPatient}
        onOpenCreate={() => setViewMode("create")}
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
