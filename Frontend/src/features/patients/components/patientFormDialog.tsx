"use client";

import React, { useState, useRef } from "react";
import {
  Upload,
  Plus,
  Check,
  User,
  FileText,
  Trash2,
  Loader2,
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import { usePatientsStore } from "../store/patients.store";
import type { Patient } from "../store/patients.store";

interface PatientFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}


function formatCpfCnpj(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 14);

  if (digits.length <= 11) {
    return digits
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  }

  return digits
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
}

function formatCep(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  return digits.replace(/(\d{5})(\d)/, "$1-$2");
}

function formatPhone(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 10) {
    return digits
      .replace(/(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  }
  return digits
    .replace(/(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2");
}

function formatDate(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  return digits
    .replace(/(\d{2})(\d)/, "$1/$2")
    .replace(/(\d{2})(\d)/, "$1/$2");
}

async function fetchAddressByCep(cepValue: string) {
  const clean = cepValue.replace(/\D/g, "");
  if (clean.length !== 8) return null;

  try {
    const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
    const data = await res.json();
    if (data.erro) return null;
    return {
      address: data.logradouro || "",
      neighborhood: data.bairro || "",
      city: data.localidade || "",
      state: data.uf || "",
    };
  } catch (err) {
    console.error("Erro ao consultar ViaCEP:", err);
    return null;
  }
}

const DEFAULT_TRIGGERS = [
  "Som Alto",
  "Brilho Intenso",
  "Interações Sociais",
  "Texturas Pastosas",
  "Mudança de Rotina",
  "Aglomerações",
  "Toque Leve",
  "Odores Fortes",
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

export function PatientFormDialog({ open, onOpenChange }: PatientFormDialogProps) {
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
  const [loadingCep, setLoadingCep] = useState(false);

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
  const [loadingRespCep, setLoadingRespCep] = useState(false);

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
  const [loadingRespExtraCep, setLoadingRespExtraCep] = useState(false);

  // Gatilhos
  const [selectedTriggers, setSelectedTriggers] = useState<string[]>([]);
  const [customTrigger, setCustomTrigger] = useState("");

  // Laudo
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);

  // Handlers CEP com ViaCEP
  const handlePatientCepChange = async (val: string) => {
    const formatted = formatCep(val);
    setCep(formatted);
    const clean = formatted.replace(/\D/g, "");
    if (clean.length === 8) {
      setLoadingCep(true);
      const addr = await fetchAddressByCep(clean);
      setLoadingCep(false);
      if (addr) {
        if (addr.address) setAddress(addr.address);
        if (addr.neighborhood) setNeighborhood(addr.neighborhood);
        if (addr.city) setCity(addr.city);
        if (addr.state) setState(addr.state);
      }
    }
  };

  const handleRespCepChange = async (val: string) => {
    const formatted = formatCep(val);
    setRespCep(formatted);
    const clean = formatted.replace(/\D/g, "");
    if (clean.length === 8) {
      setLoadingRespCep(true);
      const addr = await fetchAddressByCep(clean);
      setLoadingRespCep(false);
      if (addr) {
        if (addr.address) setRespAddress(addr.address);
        if (addr.neighborhood) setRespNeighborhood(addr.neighborhood);
        if (addr.city) setRespCity(addr.city);
        if (addr.state) setRespState(addr.state);
      }
    }
  };

  const handleRespExtraCepChange = async (val: string) => {
    const formatted = formatCep(val);
    setRespExtraCep(formatted);
    const clean = formatted.replace(/\D/g, "");
    if (clean.length === 8) {
      setLoadingRespExtraCep(true);
      const addr = await fetchAddressByCep(clean);
      setLoadingRespExtraCep(false);
      if (addr) {
        if (addr.address) setRespExtraAddress(addr.address);
        if (addr.neighborhood) setRespExtraNeighborhood(addr.neighborhood);
        if (addr.city) setRespExtraCity(addr.city);
        if (addr.state) setRespExtraState(addr.state);
      }
    }
  };

  // Toggle gatilho
  const handleToggleTrigger = (trigger: string) => {
    setSelectedTriggers((prev) =>
      prev.includes(trigger)
        ? prev.filter((t) => t !== trigger)
        : [...prev, trigger]
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

    const newPatient: Patient = {
      id: `pac-${Date.now().toString().slice(-4)}`,
      name: name.trim(),
      age: calculatedAge,
      gender: "M",
      birthDate: birthDate || "01/01/2019",
      photoUrl: photoPreview || randomPhoto,
      category: "Em Avaliação",
      clinicalStatus: selectedTriggers.length > 0
        ? `Gatilhos relatados: ${selectedTriggers.join(", ")}`
        : "Paciente recém-cadastrado em processo de acolhimento e anamnese",
      progress: 0,
      performanceScore: undefined,
      lastSessionDate: "Cadastrado Hoje",
      status: "IN_PROGRESS",
      responsibleName: respName ? `${respName} (Responsável)` : "Responsável não informado",
      responsiblePhone: respPhone || "(Não informado)",
      therapist: "Dr. Hermeson Dantas",
      communicationStyle: "Em avaliação clínica",
      sensorySensitivities: selectedTriggers.length > 0 ? selectedTriggers : ["Nenhum gatilho severo relatado"],
      notes: uploadedFileName ? `Laudo anexado: ${uploadedFileName}` : "Sem observações adicionais",
    };

    addPatient(newPatient);
    onOpenChange(false);

    // Reset formulário
    setName("");
    setBirthDate("");
    setPhone("");
    setCpf("");
    setCep("");
    setCity("");
    setState("");
    setAddress("");
    setNeighborhood("");
    setNumber("");
    setRespName("");
    setRespPhone("");
    setSelectedTriggers([]);
    setPhotoPreview("");
    setUploadedFileName(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto p-8 rounded-2xl bg-card border shadow-2xl">
        <DialogHeader className="pb-2 border-b border-border/60">
          <DialogTitle className="text-xl font-bold text-foreground">
            Cadastro de Novo Paciente
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-7 pt-2 text-sm">
          {/* =========================================
              1. DADOS BÁSICOS DO PACIENTE
             ========================================= */}
          <div>
            <div className="border-b-2 border-[#0b3294] pb-1.5 mb-4">
              <h2 className="text-[#0b3294] dark:text-blue-400 font-bold text-base">
                Dados Basicos do Paciente
              </h2>
            </div>

            <div className="flex flex-col md:flex-row gap-5 items-start">
              {/* AVATAR / FOTO UPLOAD */}
              <div className="flex flex-col items-center gap-2 shrink-0 self-center md:self-start">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="w-28 h-28 rounded-full border-2 border-dashed border-[#0b3294]/40 bg-muted/40 hover:bg-[#0b3294]/5 flex flex-col items-center justify-center cursor-pointer overflow-hidden transition-all group relative"
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
                      <User className="w-12 h-12 stroke-[1.2]" />
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
                <span className="text-[11px] text-muted-foreground">Foto (opcional)</span>
              </div>

              {/* CAMPOS EM GRID */}
              <div className="flex-1 w-full space-y-3">
                {/* LINHA 1 */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  <div className="sm:col-span-6">
                    <Input
                      placeholder="Nome completo"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      className="h-10 bg-muted/30 focus-visible:border-[#0b3294]"
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <Input
                      placeholder="Data Nasc"
                      value={birthDate}
                      onChange={(e) => setBirthDate(formatDate(e.target.value))}
                      maxLength={10}
                      className="h-10 bg-muted/30 focus-visible:border-[#0b3294]"
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <Input
                      placeholder="Telefone de Contato"
                      value={phone}
                      onChange={(e) => setPhone(formatPhone(e.target.value))}
                      maxLength={15}
                      className="h-10 bg-muted/30 focus-visible:border-[#0b3294]"
                    />
                  </div>
                </div>

                {/* LINHA 2 */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  <div className="sm:col-span-3">
                    <Input
                      placeholder="CPF"
                      value={cpf}
                      onChange={(e) => setCpf(formatCpfCnpj(e.target.value))}
                      maxLength={18}
                      className="h-10 bg-muted/30 focus-visible:border-[#0b3294]"
                    />
                  </div>
                  <div className="sm:col-span-3 relative">
                    <Input
                      placeholder="CEP"
                      value={cep}
                      onChange={(e) => handlePatientCepChange(e.target.value)}
                      maxLength={9}
                      className="h-10 bg-muted/30 focus-visible:border-[#0b3294]"
                    />
                    {loadingCep && (
                      <Loader2 className="h-4 w-4 animate-spin text-[#0b3294] absolute right-3 top-1/2 -translate-y-1/2" />
                    )}
                  </div>
                  <div className="sm:col-span-4">
                    <Input
                      placeholder="Cidade"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="h-10 bg-muted/30 focus-visible:border-[#0b3294]"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Input
                      placeholder="Estado"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      className="h-10 bg-muted/30 focus-visible:border-[#0b3294]"
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
                      className="h-10 bg-muted/30 focus-visible:border-[#0b3294]"
                    />
                  </div>
                  <div className="sm:col-span-4">
                    <Input
                      placeholder="Bairro"
                      value={neighborhood}
                      onChange={(e) => setNeighborhood(e.target.value)}
                      className="h-10 bg-muted/30 focus-visible:border-[#0b3294]"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Input
                      placeholder="Nº"
                      value={number}
                      onChange={(e) => setNumber(e.target.value)}
                      className="h-10 bg-muted/30 focus-visible:border-[#0b3294]"
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
            <div className="border-b-2 border-[#0b3294] pb-1.5 mb-4">
              <h2 className="text-[#0b3294] dark:text-blue-400 font-bold text-base">
                Dados do Responsavel
              </h2>
            </div>

            <div className="space-y-3">
              {/* LINHA 1 */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                <div className="sm:col-span-5">
                  <Input
                    placeholder="Nome completo"
                    value={respName}
                    onChange={(e) => setRespName(e.target.value)}
                    className="h-10 bg-muted/30 focus-visible:border-[#0b3294]"
                  />
                </div>
                <div className="sm:col-span-2">
                  <Input
                    placeholder="Data Nasc"
                    value={respBirthDate}
                    onChange={(e) => setRespBirthDate(formatDate(e.target.value))}
                    maxLength={10}
                    className="h-10 bg-muted/30 focus-visible:border-[#0b3294]"
                  />
                </div>
                <div className="sm:col-span-3">
                  <Input
                    placeholder="Telefone de Contato"
                    value={respPhone}
                    onChange={(e) => setRespPhone(formatPhone(e.target.value))}
                    maxLength={15}
                    className="h-10 bg-muted/30 focus-visible:border-[#0b3294]"
                  />
                </div>
                <div className="sm:col-span-2">
                  <Input
                    placeholder="CPF"
                    value={respCpf}
                    onChange={(e) => setRespCpf(formatCpfCnpj(e.target.value))}
                    maxLength={18}
                    className="h-10 bg-muted/30 focus-visible:border-[#0b3294]"
                  />
                </div>
              </div>

              {/* LINHA 2 */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                <div className="sm:col-span-2 relative">
                  <Input
                    placeholder="CEP"
                    value={respSameAddress ? cep : respCep}
                    onChange={(e) => handleRespCepChange(e.target.value)}
                    disabled={respSameAddress}
                    maxLength={9}
                    className="h-10 bg-muted/30 focus-visible:border-[#0b3294]"
                  />
                  {loadingRespCep && !respSameAddress && (
                    <Loader2 className="h-4 w-4 animate-spin text-[#0b3294] absolute right-3 top-1/2 -translate-y-1/2" />
                  )}
                </div>
                <div className="sm:col-span-3">
                  <Input
                    placeholder="Cidade"
                    value={respSameAddress ? city : respCity}
                    onChange={(e) => setRespCity(e.target.value)}
                    disabled={respSameAddress}
                    className="h-10 bg-muted/30 focus-visible:border-[#0b3294]"
                  />
                </div>
                <div className="sm:col-span-1">
                  <Input
                    placeholder="Estado"
                    value={respSameAddress ? state : respState}
                    onChange={(e) => setRespState(e.target.value)}
                    disabled={respSameAddress}
                    className="h-10 bg-muted/30 focus-visible:border-[#0b3294]"
                  />
                </div>
                <div className="sm:col-span-3">
                  <Input
                    placeholder="Endereço"
                    value={respSameAddress ? address : respAddress}
                    onChange={(e) => setRespAddress(e.target.value)}
                    disabled={respSameAddress}
                    className="h-10 bg-muted/30 focus-visible:border-[#0b3294]"
                  />
                </div>
                <div className="sm:col-span-2">
                  <Input
                    placeholder="Bairro"
                    value={respSameAddress ? neighborhood : respNeighborhood}
                    onChange={(e) => setRespNeighborhood(e.target.value)}
                    disabled={respSameAddress}
                    className="h-10 bg-muted/30 focus-visible:border-[#0b3294]"
                  />
                </div>
                <div className="sm:col-span-1">
                  <Input
                    placeholder="Nº"
                    value={respSameAddress ? number : respNumber}
                    onChange={(e) => setRespNumber(e.target.value)}
                    disabled={respSameAddress}
                    className="h-10 bg-muted/30 focus-visible:border-[#0b3294]"
                  />
                </div>
              </div>

              {/* CHECKBOX */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="respSameAddressModal"
                  checked={respSameAddress}
                  onChange={(e) => setRespSameAddress(e.target.checked)}
                  className="rounded border-border accent-[#0b3294] h-4 w-4"
                />
                <label
                  htmlFor="respSameAddressModal"
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
            <div className="border-b-2 border-[#0b3294] pb-1.5 mb-4">
              <h2 className="text-[#0b3294] dark:text-blue-400 font-bold text-base">
                Dados do Responsavel Extra <span className="text-xs font-normal text-muted-foreground">(Opcional)</span>
              </h2>
            </div>

            <div className="space-y-3">
              {/* LINHA 1 */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                <div className="sm:col-span-5">
                  <Input
                    placeholder="Nome completo"
                    value={respExtraName}
                    onChange={(e) => setRespExtraName(e.target.value)}
                    className="h-10 bg-muted/30 focus-visible:border-[#0b3294]"
                  />
                </div>
                <div className="sm:col-span-2">
                  <Input
                    placeholder="Data Nasc"
                    value={respExtraBirthDate}
                    onChange={(e) => setRespExtraBirthDate(formatDate(e.target.value))}
                    maxLength={10}
                    className="h-10 bg-muted/30 focus-visible:border-[#0b3294]"
                  />
                </div>
                <div className="sm:col-span-3">
                  <Input
                    placeholder="Telefone de Contato"
                    value={respExtraPhone}
                    onChange={(e) => setRespExtraPhone(formatPhone(e.target.value))}
                    maxLength={15}
                    className="h-10 bg-muted/30 focus-visible:border-[#0b3294]"
                  />
                </div>
                <div className="sm:col-span-2">
                  <Input
                    placeholder="CPF"
                    value={respExtraCpf}
                    onChange={(e) => setRespExtraCpf(formatCpfCnpj(e.target.value))}
                    maxLength={18}
                    className="h-10 bg-muted/30 focus-visible:border-[#0b3294]"
                  />
                </div>
              </div>

              {/* LINHA 2 */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                <div className="sm:col-span-2 relative">
                  <Input
                    placeholder="CEP"
                    value={respExtraSameAddress ? cep : respExtraCep}
                    onChange={(e) => handleRespExtraCepChange(e.target.value)}
                    disabled={respExtraSameAddress}
                    maxLength={9}
                    className="h-10 bg-muted/30 focus-visible:border-[#0b3294]"
                  />
                  {loadingRespExtraCep && !respExtraSameAddress && (
                    <Loader2 className="h-4 w-4 animate-spin text-[#0b3294] absolute right-3 top-1/2 -translate-y-1/2" />
                  )}
                </div>
                <div className="sm:col-span-3">
                  <Input
                    placeholder="Cidade"
                    value={respExtraSameAddress ? city : respExtraCity}
                    onChange={(e) => setRespExtraCity(e.target.value)}
                    disabled={respExtraSameAddress}
                    className="h-10 bg-muted/30 focus-visible:border-[#0b3294]"
                  />
                </div>
                <div className="sm:col-span-1">
                  <Input
                    placeholder="Estado"
                    value={respExtraSameAddress ? state : respExtraState}
                    onChange={(e) => setRespExtraState(e.target.value)}
                    disabled={respExtraSameAddress}
                    className="h-10 bg-muted/30 focus-visible:border-[#0b3294]"
                  />
                </div>
                <div className="sm:col-span-3">
                  <Input
                    placeholder="Endereço"
                    value={respExtraSameAddress ? address : respExtraAddress}
                    onChange={(e) => setRespExtraAddress(e.target.value)}
                    disabled={respExtraSameAddress}
                    className="h-10 bg-muted/30 focus-visible:border-[#0b3294]"
                  />
                </div>
                <div className="sm:col-span-2">
                  <Input
                    placeholder="Bairro"
                    value={respExtraSameAddress ? neighborhood : respExtraNeighborhood}
                    onChange={(e) => setRespExtraNeighborhood(e.target.value)}
                    disabled={respExtraSameAddress}
                    className="h-10 bg-muted/30 focus-visible:border-[#0b3294]"
                  />
                </div>
                <div className="sm:col-span-1">
                  <Input
                    placeholder="Nº"
                    value={respExtraSameAddress ? number : respExtraNumber}
                    onChange={(e) => setRespExtraNumber(e.target.value)}
                    disabled={respExtraSameAddress}
                    className="h-10 bg-muted/30 focus-visible:border-[#0b3294]"
                  />
                </div>
              </div>

              {/* CHECKBOX */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="respExtraSameAddressModal"
                  checked={respExtraSameAddress}
                  onChange={(e) => setRespExtraSameAddress(e.target.checked)}
                  className="rounded border-border accent-[#0b3294] h-4 w-4"
                />
                <label
                  htmlFor="respExtraSameAddressModal"
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
            <div className="border-b-2 border-[#0b3294] pb-1.5 mb-4">
              <h2 className="text-[#0b3294] dark:text-blue-400 font-bold text-base">
                Possiveis Gatilhos
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {DEFAULT_TRIGGERS.map((trigger) => {
                const isSelected = selectedTriggers.includes(trigger);

                return (
                  <button
                    key={trigger}
                    type="button"
                    onClick={() => handleToggleTrigger(trigger)}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer border ${
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

              {/* GATILHOS PERSONALIZADOS ADICIONADOS */}
              {selectedTriggers
                .filter((t) => !DEFAULT_TRIGGERS.includes(t))
                .map((custom) => (
                  <button
                    key={custom}
                    type="button"
                    onClick={() => handleToggleTrigger(custom)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium bg-[#0b3294] text-white border border-[#0b3294] shadow-xs"
                  >
                    <Check className="w-3.5 h-3.5" />
                    {custom}
                  </button>
                ))}

              {/* INPUT PARA OUTRO GATILHO */}
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
                  className="h-8 w-36 text-xs bg-muted/30"
                />
                {customTrigger && (
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleAddCustomTrigger}
                    className="h-8 px-2.5 text-xs bg-[#0b3294] hover:bg-[#0b3294]/90 text-white"
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
            <div className="border-b-2 border-[#0b3294] pb-1.5 mb-4">
              <h2 className="text-[#0b3294] dark:text-blue-400 font-bold text-base">
                Laudo Medico <span className="text-xs font-normal text-muted-foreground">(Opcional)</span>
              </h2>
            </div>

            <div
              onClick={() => laudoInputRef.current?.click()}
              className="border-2 border-dashed border-[#0b3294]/30 rounded-2xl p-6 bg-muted/20 hover:bg-[#0b3294]/5 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors text-center"
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
                    className="h-7 w-7 text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <>
                  <Upload className="h-8 w-8 text-[#0b3294]" />
                  <span className="text-xs text-muted-foreground">
                    Arraste o arquivo. (PDF, DOCX...) ou clique para selecionar
                  </span>
                </>
              )}
            </div>
          </div>

          {/* =========================================
              BOTÃO SUBMIT: + ADICIONAR PACIENTE
             ========================================= */}
          <div className="pt-3">
            <Button
              type="submit"
              className="w-full bg-[#0b3294] hover:bg-[#0b3294]/90 text-white font-bold h-12 text-base rounded-xl shadow-md cursor-pointer transition-all flex items-center justify-center gap-2"
            >
              <Plus className="w-5 h-5 stroke-[2.5]" />
              Adicionar Paciente
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default PatientFormDialog;
