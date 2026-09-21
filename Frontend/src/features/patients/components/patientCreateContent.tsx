"use client";

import React, { useState, useRef } from "react";
import {
  Upload,
  Plus,
  Check,
  User,
  FileText,
  Trash2,
  ArrowLeft,
  Users,
} from "lucide-react";

import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import { usePatientsStore } from "../store/patients.store";
import type { Patient } from "../store/patients.store";

interface PatientCreateContentProps {
  onBack?: () => void;
  onSuccess?: (newPatient: Patient) => void;
}

const DEFAULT_TRIGGERS = [
  "Som Alto",
  "Brilho Intenso",
  "Interações Sociais",
  "Gatilho",
  "Gatilho",
  "Gatilho",
  "Gatilho",
  "Gatilho",
  "Gatilho",
];

const AVATAR_PLACEHOLDERS = [
  "https://images.unsplash.com/photo-1543332164-6e82f355badc?auto=format&fit=crop&q=80&w=400",
  "https://images.unsplash.com/photo-1595454223600-91fbdd77ae09?auto=format&fit=crop&q=80&w=400",
  "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&q=80&w=400",
  "https://images.unsplash.com/photo-1517677129300-07b130802f46?auto=format&fit=crop&q=80&w=400",
  "https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?auto=format&fit=crop&q=80&w=400",
  "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=400",
  "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&q=80&w=400",
];

export function PatientCreateContent({ onBack, onSuccess }: PatientCreateContentProps) {
  const { addPatient } = usePatientsStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const laudoInputRef = useRef<HTMLInputElement>(null);

  // Estados dos Dados Básicos
  const [photoPreview, setPhotoPreview] = useState<string>("");
  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [phone, setPhone] = useState("");
  const [cpf, setCpf] = useState("");
  const [cep, setCep] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [address, setAddress] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [number, setNumber] = useState("");

  // Estados do Responsável 1
  const [respName, setRespName] = useState("");
  const [respBirthDate, setRespBirthDate] = useState("");
  const [respPhone, setRespPhone] = useState("");
  const [respCpf, setRespCpf] = useState("");
  const [respCep, setRespCep] = useState("");
  const [respCity, setRespCity] = useState("");
  const [respState, setRespState] = useState("");
  const [respAddress, setRespAddress] = useState("");
  const [respNeighborhood, setRespNeighborhood] = useState("");
  const [respNumber, setRespNumber] = useState("");
  const [respSameAddress, setRespSameAddress] = useState(false);

  // Estados do Responsável Extra
  const [respExtraName, setRespExtraName] = useState("");
  const [respExtraBirthDate, setRespExtraBirthDate] = useState("");
  const [respExtraPhone, setRespExtraPhone] = useState("");
  const [respExtraCpf, setRespExtraCpf] = useState("");
  const [respExtraCep, setRespExtraCep] = useState("");
  const [respExtraCity, setRespExtraCity] = useState("");
  const [respExtraState, setRespExtraState] = useState("");
  const [respExtraAddress, setRespExtraAddress] = useState("");
  const [respExtraNeighborhood, setRespExtraNeighborhood] = useState("");
  const [respExtraNumber, setRespExtraNumber] = useState("");
  const [respExtraSameAddress, setRespExtraSameAddress] = useState(false);

  // Gatilhos
  const [selectedTriggers, setSelectedTriggers] = useState<string[]>([]);
  const [customTrigger, setCustomTrigger] = useState("");

  // Laudo
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);

  // Toggle gatilho
  const handleToggleTrigger = (trigger: string, index: number) => {
    const key = `${trigger}-${index}`;
    setSelectedTriggers((prev) =>
      prev.includes(key) ? prev.filter((t) => t !== key) : [...prev, key]
    );
  };

  const handleAddCustomTrigger = () => {
    if (customTrigger.trim() && !selectedTriggers.includes(customTrigger.trim())) {
      setSelectedTriggers((prev) => [...prev, customTrigger.trim()]);
      setCustomTrigger("");
    }
  };

  // Upload foto
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setPhotoPreview(url);
    }
  };

  // Upload laudo
  const handleLaudoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFileName(file.name);
    }
  };

  // Submeter formulário
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      alert("Por favor, preencha ao menos o nome do paciente.");
      return;
    }

    let calculatedAge = 7;
    if (birthDate.includes("/")) {
      const parts = birthDate.split("/");
      const year = parseInt(parts[2] || parts[0], 10);
      if (!isNaN(year)) {
        calculatedAge = Math.max(1, new Date().getFullYear() - year);
      }
    }

    const randomPhoto =
      AVATAR_PLACEHOLDERS[Math.floor(Math.random() * AVATAR_PLACEHOLDERS.length)];

    const cleanedTriggers = selectedTriggers.map((t) => t.split("-")[0]);

    const newPatient: Patient = {
      id: `pac-${Date.now().toString().slice(-4)}`,
      name: name.trim(),
      age: calculatedAge,
      gender: "M",
      birthDate: birthDate || "01/01/2019",
      photoUrl: photoPreview || randomPhoto,
      category: "Em Avaliação",
      clinicalStatus: cleanedTriggers.length > 0
        ? `Gatilhos relatados: ${cleanedTriggers.join(", ")}`
        : "Paciente recém-cadastrado em processo de acolhimento e anamnese",
      progress: 0,
      performanceScore: undefined,
      lastSessionDate: "Cadastrado Hoje",
      status: "IN_PROGRESS",
      responsibleName: respName ? `${respName} (Responsável)` : "Responsável não informado",
      responsiblePhone: respPhone || "(Não informado)",
      therapist: "Dr. Hermeson Dantas",
      communicationStyle: "Em avaliação clínica",
      sensorySensitivities: cleanedTriggers.length > 0 ? cleanedTriggers : ["Nenhum gatilho severo relatado"],
      notes: uploadedFileName ? `Laudo anexado: ${uploadedFileName}` : "Sem observações adicionais",
    };

    addPatient(newPatient);

    if (onSuccess) {
      onSuccess(newPatient);
    } else if (onBack) {
      onBack();
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-5xl mx-auto py-2">
      {/* CABEÇALHO COM BOTÃO VOLTAR */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {onBack && (
            <Button
              variant="outline"
              size="icon"
              onClick={onBack}
              className="h-10 w-10 rounded-xl hover:bg-[#0b3294]/10 hover:text-[#0b3294] hover:border-[#0b3294]/30 cursor-pointer"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Cadastrar Paciente
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Preencha os dados clínicos e de contato para inclusão no sistema InTEA.
            </p>
          </div>
        </div>

        {onBack && (
          <Button
            variant="ghost"
            onClick={onBack}
            className="text-xs text-muted-foreground hover:text-foreground cursor-pointer"
          >
            Cancelar e Voltar
          </Button>
        )}
      </div>

      {/* CONTAINER DO FORMULÁRIO (CARD COMPLETO) */}
      <div className="bg-card rounded-2xl border p-8 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-8 text-sm">
          {/* =========================================
              1. DADOS BÁSICOS DO PACIENTE
             ========================================= */}
          <div>
            <div className="border-b-2 border-[#0b3294] pb-1.5 mb-5">
              <h2 className="text-[#0b3294] dark:text-blue-400 font-bold text-base">
                Dados Basicos do Paciente
              </h2>
            </div>

            <div className="flex flex-col md:flex-row gap-6 items-start">
              {/* AVATAR / FOTO UPLOAD */}
              <div className="flex flex-col items-center gap-2 shrink-0 self-center md:self-start">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="w-32 h-32 rounded-full border-2 border-dashed border-[#0b3294]/40 bg-muted/40 hover:bg-[#0b3294]/5 flex flex-col items-center justify-center cursor-pointer overflow-hidden transition-all group relative shadow-xs"
                  title="Clique para adicionar foto"
                >
                  {photoPreview ? (
                    <img
                      src={photoPreview}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center text-muted-foreground group-hover:text-[#0b3294]">
                      <User className="w-16 h-16 stroke-[1.2]" />
                    </div>
                  )}
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handlePhotoUpload}
                    accept="image/*"
                    className="hidden"
                  />
                </div>
                <span className="text-xs text-muted-foreground">Foto (opcional)</span>
              </div>

              {/* CAMPOS EM GRID */}
              <div className="flex-1 w-full space-y-3.5">
                {/* LINHA 1 */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  <div className="sm:col-span-6">
                    <Input
                      placeholder="Nome completo"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      className="h-11 bg-muted/30 focus-visible:border-[#0b3294]"
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <Input
                      placeholder="Data Nasc"
                      value={birthDate}
                      onChange={(e) => setBirthDate(e.target.value)}
                      className="h-11 bg-muted/30 focus-visible:border-[#0b3294]"
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <Input
                      placeholder="Telefone de Contato"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="h-11 bg-muted/30 focus-visible:border-[#0b3294]"
                    />
                  </div>
                </div>

                {/* LINHA 2 */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  <div className="sm:col-span-3">
                    <Input
                      placeholder="CPF"
                      value={cpf}
                      onChange={(e) => setCpf(e.target.value)}
                      className="h-11 bg-muted/30 focus-visible:border-[#0b3294]"
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <Input
                      placeholder="CEP"
                      value={cep}
                      onChange={(e) => setCep(e.target.value)}
                      className="h-11 bg-muted/30 focus-visible:border-[#0b3294]"
                    />
                  </div>
                  <div className="sm:col-span-4">
                    <Input
                      placeholder="Cidade"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="h-11 bg-muted/30 focus-visible:border-[#0b3294]"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Input
                      placeholder="Estado"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      className="h-11 bg-muted/30 focus-visible:border-[#0b3294]"
                    />
                  </div>
                </div>

                {/* LINHA 3 */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  <div className="sm:col-span-6">
                    <Input
                      placeholder="Endereço"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="h-11 bg-muted/30 focus-visible:border-[#0b3294]"
                    />
                  </div>
                  <div className="sm:col-span-4">
                    <Input
                      placeholder="Bairro"
                      value={neighborhood}
                      onChange={(e) => setNeighborhood(e.target.value)}
                      className="h-11 bg-muted/30 focus-visible:border-[#0b3294]"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Input
                      placeholder="Nº"
                      value={number}
                      onChange={(e) => setNumber(e.target.value)}
                      className="h-11 bg-muted/30 focus-visible:border-[#0b3294]"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* =========================================
              2. DADOS DO RESPONSÁVEL
             ========================================= */}
          <div>
            <div className="border-b-2 border-[#0b3294] pb-1.5 mb-5">
              <h2 className="text-[#0b3294] dark:text-blue-400 font-bold text-base">
                Dados do Responsavel
              </h2>
            </div>

            <div className="space-y-3.5">
              {/* LINHA 1 */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                <div className="sm:col-span-5">
                  <Input
                    placeholder="Nome completo"
                    value={respName}
                    onChange={(e) => setRespName(e.target.value)}
                    className="h-11 bg-muted/30 focus-visible:border-[#0b3294]"
                  />
                </div>
                <div className="sm:col-span-2">
                  <Input
                    placeholder="Data Nasc"
                    value={respBirthDate}
                    onChange={(e) => setRespBirthDate(e.target.value)}
                    className="h-11 bg-muted/30 focus-visible:border-[#0b3294]"
                  />
                </div>
                <div className="sm:col-span-3">
                  <Input
                    placeholder="Telefone de Contato"
                    value={respPhone}
                    onChange={(e) => setRespPhone(e.target.value)}
                    className="h-11 bg-muted/30 focus-visible:border-[#0b3294]"
                  />
                </div>
                <div className="sm:col-span-2">
                  <Input
                    placeholder="CPF"
                    value={respCpf}
                    onChange={(e) => setRespCpf(e.target.value)}
                    className="h-11 bg-muted/30 focus-visible:border-[#0b3294]"
                  />
                </div>
              </div>

              {/* LINHA 2 */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                <div className="sm:col-span-2">
                  <Input
                    placeholder="CEP"
                    value={respSameAddress ? cep : respCep}
                    onChange={(e) => setRespCep(e.target.value)}
                    disabled={respSameAddress}
                    className="h-11 bg-muted/30 focus-visible:border-[#0b3294]"
                  />
                </div>
                <div className="sm:col-span-3">
                  <Input
                    placeholder="Cidade"
                    value={respSameAddress ? city : respCity}
                    onChange={(e) => setRespCity(e.target.value)}
                    disabled={respSameAddress}
                    className="h-11 bg-muted/30 focus-visible:border-[#0b3294]"
                  />
                </div>
                <div className="sm:col-span-1">
                  <Input
                    placeholder="Estado"
                    value={respSameAddress ? state : respState}
                    onChange={(e) => setRespState(e.target.value)}
                    disabled={respSameAddress}
                    className="h-11 bg-muted/30 focus-visible:border-[#0b3294]"
                  />
                </div>
                <div className="sm:col-span-3">
                  <Input
                    placeholder="Endereço"
                    value={respSameAddress ? address : respAddress}
                    onChange={(e) => setRespAddress(e.target.value)}
                    disabled={respSameAddress}
                    className="h-11 bg-muted/30 focus-visible:border-[#0b3294]"
                  />
                </div>
                <div className="sm:col-span-2">
                  <Input
                    placeholder="Bairro"
                    value={respSameAddress ? neighborhood : respNeighborhood}
                    onChange={(e) => setRespNeighborhood(e.target.value)}
                    disabled={respSameAddress}
                    className="h-11 bg-muted/30 focus-visible:border-[#0b3294]"
                  />
                </div>
                <div className="sm:col-span-1">
                  <Input
                    placeholder="Nº"
                    value={respSameAddress ? number : respNumber}
                    onChange={(e) => setRespNumber(e.target.value)}
                    disabled={respSameAddress}
                    className="h-11 bg-muted/30 focus-visible:border-[#0b3294]"
                  />
                </div>
              </div>

              {/* CHECKBOX */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="respSameAddress"
                  checked={respSameAddress}
                  onChange={(e) => setRespSameAddress(e.target.checked)}
                  className="rounded border-border accent-[#0b3294] h-4 w-4 cursor-pointer"
                />
                <label
                  htmlFor="respSameAddress"
                  className="text-xs text-muted-foreground cursor-pointer select-none"
                >
                  Residente no mesmo local do paciente.
                </label>
              </div>
            </div>
          </div>

          {/* =========================================
              3. DADOS DO RESPONSÁVEL EXTRA (OPCIONAL)
             ========================================= */}
          <div>
            <div className="border-b-2 border-[#0b3294] pb-1.5 mb-5">
              <h2 className="text-[#0b3294] dark:text-blue-400 font-bold text-base">
                Dados do Responsavel Extra <span className="text-xs font-normal text-muted-foreground">(Opcional)</span>
              </h2>
            </div>

            <div className="space-y-3.5">
              {/* LINHA 1 */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                <div className="sm:col-span-5">
                  <Input
                    placeholder="Nome completo"
                    value={respExtraName}
                    onChange={(e) => setRespExtraName(e.target.value)}
                    className="h-11 bg-muted/30 focus-visible:border-[#0b3294]"
                  />
                </div>
                <div className="sm:col-span-2">
                  <Input
                    placeholder="Data Nasc"
                    value={respExtraBirthDate}
                    onChange={(e) => setRespExtraBirthDate(e.target.value)}
                    className="h-11 bg-muted/30 focus-visible:border-[#0b3294]"
                  />
                </div>
                <div className="sm:col-span-3">
                  <Input
                    placeholder="Telefone de Contato"
                    value={respExtraPhone}
                    onChange={(e) => setRespExtraPhone(e.target.value)}
                    className="h-11 bg-muted/30 focus-visible:border-[#0b3294]"
                  />
                </div>
                <div className="sm:col-span-2">
                  <Input
                    placeholder="CPF"
                    value={respExtraCpf}
                    onChange={(e) => setRespExtraCpf(e.target.value)}
                    className="h-11 bg-muted/30 focus-visible:border-[#0b3294]"
                  />
                </div>
              </div>

              {/* LINHA 2 */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                <div className="sm:col-span-2">
                  <Input
                    placeholder="CEP"
                    value={respExtraSameAddress ? cep : respExtraCep}
                    onChange={(e) => setRespExtraCep(e.target.value)}
                    disabled={respExtraSameAddress}
                    className="h-11 bg-muted/30 focus-visible:border-[#0b3294]"
                  />
                </div>
                <div className="sm:col-span-3">
                  <Input
                    placeholder="Cidade"
                    value={respExtraSameAddress ? city : respExtraCity}
                    onChange={(e) => setRespExtraCity(e.target.value)}
                    disabled={respExtraSameAddress}
                    className="h-11 bg-muted/30 focus-visible:border-[#0b3294]"
                  />
                </div>
                <div className="sm:col-span-1">
                  <Input
                    placeholder="Estado"
                    value={respExtraSameAddress ? state : respExtraState}
                    onChange={(e) => setRespExtraState(e.target.value)}
                    disabled={respExtraSameAddress}
                    className="h-11 bg-muted/30 focus-visible:border-[#0b3294]"
                  />
                </div>
                <div className="sm:col-span-3">
                  <Input
                    placeholder="Endereço"
                    value={respExtraSameAddress ? address : respExtraAddress}
                    onChange={(e) => setRespExtraAddress(e.target.value)}
                    disabled={respExtraSameAddress}
                    className="h-11 bg-muted/30 focus-visible:border-[#0b3294]"
                  />
                </div>
                <div className="sm:col-span-2">
                  <Input
                    placeholder="Bairro"
                    value={respExtraSameAddress ? neighborhood : respExtraNeighborhood}
                    onChange={(e) => setRespExtraNeighborhood(e.target.value)}
                    disabled={respExtraSameAddress}
                    className="h-11 bg-muted/30 focus-visible:border-[#0b3294]"
                  />
                </div>
                <div className="sm:col-span-1">
                  <Input
                    placeholder="Nº"
                    value={respExtraSameAddress ? number : respExtraNumber}
                    onChange={(e) => setRespExtraNumber(e.target.value)}
                    disabled={respExtraSameAddress}
                    className="h-11 bg-muted/30 focus-visible:border-[#0b3294]"
                  />
                </div>
              </div>

              {/* CHECKBOX */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="respExtraSameAddress"
                  checked={respExtraSameAddress}
                  onChange={(e) => setRespExtraSameAddress(e.target.checked)}
                  className="rounded border-border accent-[#0b3294] h-4 w-4 cursor-pointer"
                />
                <label
                  htmlFor="respExtraSameAddress"
                  className="text-xs text-muted-foreground cursor-pointer select-none"
                >
                  Residente no mesmo local do paciente.
                </label>
              </div>
            </div>
          </div>

          {/* =========================================
              4. POSSÍVEIS GATILHOS
             ========================================= */}
          <div>
            <div className="border-b-2 border-[#0b3294] pb-1.5 mb-5">
              <h2 className="text-[#0b3294] dark:text-blue-400 font-bold text-base">
                Possiveis Gatilhos
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {DEFAULT_TRIGGERS.map((trigger, idx) => {
                const key = `${trigger}-${idx}`;
                const isSelected = selectedTriggers.includes(key);

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleToggleTrigger(trigger, idx)}
                    className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer border ${
                      isSelected
                        ? "bg-[#0b3294] text-white border-[#0b3294] shadow-xs"
                        : "bg-muted/40 text-foreground/80 border-border hover:bg-muted"
                    }`}
                  >
                    {isSelected ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                    {trigger}
                  </button>
                );
              })}

              {/* GATILHOS PERSONALIZADOS */}
              {selectedTriggers
                .filter((t) => !t.includes("-"))
                .map((custom) => (
                  <button
                    key={custom}
                    type="button"
                    onClick={() => {
                      setSelectedTriggers((prev) => prev.filter((t) => t !== custom));
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium bg-[#0b3294] text-white border border-[#0b3294] shadow-xs"
                  >
                    <Check className="w-3.5 h-3.5" />
                    {custom}
                  </button>
                ))}

              {/* INPUT PARA NOVO GATILHO */}
              <div className="flex items-center gap-1.5">
                <Input
                  placeholder="+ Outro gatilho..."
                  value={customTrigger}
                  onChange={(e) => setCustomTrigger(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddCustomTrigger();
                    }
                  }}
                  className="h-9 w-36 text-xs bg-muted/30"
                />
                {customTrigger && (
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleAddCustomTrigger}
                    className="h-9 px-3 text-xs bg-[#0b3294] hover:bg-[#0b3294]/90 text-white"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* =========================================
              5. LAUDO MÉDICO (OPCIONAL)
             ========================================= */}
          <div>
            <div className="border-b-2 border-[#0b3294] pb-1.5 mb-5">
              <h2 className="text-[#0b3294] dark:text-blue-400 font-bold text-base">
                Laudo Medico <span className="text-xs font-normal text-muted-foreground">(Opcional)</span>
              </h2>
            </div>

            <div
              onClick={() => laudoInputRef.current?.click()}
              className="border-2 border-dashed border-[#0b3294]/30 rounded-2xl p-8 bg-muted/20 hover:bg-[#0b3294]/5 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors text-center"
            >
              <input
                type="file"
                ref={laudoInputRef}
                onChange={handleLaudoUpload}
                accept=".pdf,.doc,.docx,.png,.jpg"
                className="hidden"
              />
              {uploadedFileName ? (
                <div className="flex items-center gap-2 text-foreground font-medium">
                  <FileText className="h-6 w-6 text-[#0b3294]" />
                  <span>{uploadedFileName}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      setUploadedFileName(null);
                    }}
                    className="h-8 w-8 text-destructive hover:bg-destructive/10 cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <>
                  <Upload className="h-8 w-8 text-[#0b3294]" />
                  <span className="text-xs text-muted-foreground font-medium">
                    Arraste o arquivo. (PDF, DOCX...) ou clique para selecionar
                  </span>
                </>
              )}
            </div>
          </div>

          {/* =========================================
              BOTÃO SUBMIT: + ADICIONAR PACIENTE
             ========================================= */}
          <div className="pt-4">
            <Button
              type="submit"
              className="w-full bg-[#0b3294] hover:bg-[#0b3294]/90 text-white font-bold h-12 text-base rounded-xl shadow-md cursor-pointer transition-all flex items-center justify-center gap-2"
            >
              <Plus className="w-5 h-5 stroke-[2.5]" />
              Adicionar Paciente
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default PatientCreateContent;
