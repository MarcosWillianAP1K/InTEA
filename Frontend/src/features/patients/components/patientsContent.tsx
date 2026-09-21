"use client";

import React, { useState } from "react";
import { PatientsList } from "./patientsList";
import { PatientCreateContent } from "./patientCreateContent";
import { usePatientsStore } from "../store/patients.store";
import type { Patient } from "../store/patients.store";
import { CheckCircle2, Users } from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";

interface PatientsContentProps {
  onSelectPatient?: (patient: Patient) => void;
  selectedPatientId?: string | null;
  initialMode?: "list" | "create";
  className?: string;
}

export function PatientsContent({
  onSelectPatient,
  selectedPatientId,
  initialMode = "list",
  className = "",
}: PatientsContentProps) {
  const [viewMode, setViewMode] = useState<"list" | "create">(initialMode);
  const { getSelectedPatient, setSelectedPatientId, patients } = usePatientsStore();
  const totalPatients = Object.keys(patients).length;
  const activePatient = getSelectedPatient();

  // MODO: CADASTRO DE PACIENTE (PÁGINA DEDICADA)
  if (viewMode === "create") {
    return (
      <div className={`flex flex-1 flex-col w-full mx-auto ${className}`}>
        <PatientCreateContent
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
      {/* HEADER PRINCIPAL DE PACIENTES */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-5 rounded-2xl border shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#0b3294]/10 text-[#0b3294]">
              <Users className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Seleção de Pacientes
            </h1>
            <Badge
              variant="outline"
              className="bg-[#0b3294]/10 text-[#0b3294] border-[#0b3294]/20 font-semibold"
            >
              {totalPatients} pacientes
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Gerencie e selecione os pacientes cadastrados para acompanhamento terapêutico e jogos clínicos.
          </p>
        </div>

        {activePatient && (
          <div className="flex items-center gap-3 bg-[#0b3294]/5 border border-[#0b3294]/20 p-2.5 px-4 rounded-xl shrink-0">
            <img
              src={activePatient.photoUrl}
              alt={activePatient.name}
              className="w-10 h-10 rounded-full object-cover border-2 border-[#0b3294]"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
            <div className="text-xs">
              <span className="text-muted-foreground block text-[11px]">Paciente Selecionado:</span>
              <span className="font-bold text-[#0b3294] dark:text-blue-400 text-sm leading-tight block">
                {activePatient.name}
              </span>
            </div>
            <CheckCircle2 className="w-5 h-5 text-[#0b3294] ml-1 shrink-0" />
          </div>
        )}
      </div>

      {/* LISTA / TABELA DE PACIENTES */}
      <PatientsList
        onSelectPatient={onSelectPatient}
        onOpenCreate={() => setViewMode("create")}
        selectedPatientId={selectedPatientId}
      />
    </div>
  );
}

export default PatientsContent;
