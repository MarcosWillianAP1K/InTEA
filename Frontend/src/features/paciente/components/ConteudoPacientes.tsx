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
