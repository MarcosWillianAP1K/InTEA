import React, { useEffect, useRef, useState } from "react";
import {
  Check,
  FileText,
  Loader2,
  Plus,
  Save,
  Trash2,
  Upload,
} from "lucide-react";
import { AvatarClinico } from "@/shared/components/AvatarClinico";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import type { ClinicaAdminItem } from "@/features/admin/services/clinicaAdmin.service";
import {
  CONDICAO_NAO_INFORMADA_SELECT,
  CONDICOES_CLINICAS,
  normalizarCondicaoParaSelect,
} from "../constants/condicoesClinicas";
import { DEFAULT_TRIGGERS } from "../types/bdmock";
import type {
  AtualizarPacienteDTO,
  CriarPacienteDTO,
  Paciente,
  Responsavel,
} from "../types/paciente.types";

export interface FormularioPacienteProps {
  modo: "criar" | "editar";
  pacienteInicial?: Paciente | null;
  clinicas: ClinicaAdminItem[];
  carregandoClinicas?: boolean;
  submitting?: boolean;
  onSubmit: (
    dto: CriarPacienteDTO | AtualizarPacienteDTO,
    meta: { clinicaNome?: string },
  ) => Promise<void> | void;
  onCancel: () => void;
}

function formatCpf(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  }
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
}

function formatCep(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

function formatPhone(value: string): string {
  const clean = value.replace(/^\+55\s*/, "");
  const digits = clean.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
}

function formatDateInput(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

function isoToBrDate(iso?: string | null): string {
  if (!iso || !/^\d{4}-\d{2}-\d{2}/.test(iso)) return "";
  const [ano, mes, dia] = iso.slice(0, 10).split("-");
  return `${dia}/${mes}/${ano}`;
}

function brDateToIso(br: string): string | null {
  const limpo = br.trim();
  if (!limpo) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(limpo)) return limpo;
  const match = limpo.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;
  const [, diaStr, mesStr, anoStr] = match;
  const dia = Number(diaStr);
  const mes = Number(mesStr);
  const ano = Number(anoStr);
  const data = new Date(Date.UTC(ano, mes - 1, dia));
  if (
    data.getUTCFullYear() !== ano ||
    data.getUTCMonth() !== mes - 1 ||
    data.getUTCDate() !== dia
  ) {
    return null;
  }
  return `${anoStr}-${mesStr}-${diaStr}`;
}

async function buscarEnderecoPorCep(cepValue: string): Promise<{
  endereco: string;
  bairro: string;
  cidade: string;
  estado: string;
} | null> {
  const clean = cepValue.replace(/\D/g, "");
  if (clean.length !== 8) return null;

  try {
    const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
    const data = (await res.json()) as {
      erro?: boolean;
      logradouro?: string;
      bairro?: string;
      localidade?: string;
      uf?: string;
    };
    if (data.erro) return null;
    return {
      endereco: data.logradouro || "",
      bairro: data.bairro || "",
      cidade: data.localidade || "",
      estado: data.uf || "",
    };
  } catch {
    return null;
  }
}

export function FormularioPaciente({
  modo,
  pacienteInicial,
  clinicas,
  carregandoClinicas = false,
  submitting = false,
  onSubmit,
  onCancel,
}: FormularioPacienteProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const laudoInputRef = useRef<HTMLInputElement>(null);

  const responsaveisLista: Responsavel[] = Array.isArray(pacienteInicial?.responsaveis)
    ? pacienteInicial.responsaveis
    : [];
  const respPrincipalInicial =
    responsaveisLista.find(
      (r) => r.principal || r.tipo_responsavel === "principal",
    ) || responsaveisLista[0];
  const respExtraInicial = responsaveisLista.find(
    (r) =>
      r.id !== respPrincipalInicial?.id &&
      (r.tipo_responsavel === "extra" || r.principal === false),
  );

  const condicaoInicial = normalizarCondicaoParaSelect(
    pacienteInicial?.dados_clinicos?.diagnostico_base ||
      pacienteInicial?.estado_clinico,
  );

  // Clínica institucional (obrigatória mesmo para SuperAdmin)
  const [clinicaId, setClinicaId] = useState<string>(
    pacienteInicial?.clinica_id || "",
  );

  // Dados básicos do paciente
  const [photoPreview, setPhotoPreview] = useState<string>(
    pacienteInicial?.foto_url || pacienteInicial?.photoUrl || "",
  );
  const [name, setName] = useState(pacienteInicial?.nome || "");
  const [birthDate, setBirthDate] = useState(
    isoToBrDate(pacienteInicial?.data_nascimento),
  );
  const [phone, setPhone] = useState(
    pacienteInicial?.telefone ? formatPhone(pacienteInicial.telefone) : "",
  );
  const [cpf, setCpf] = useState(
    pacienteInicial?.cpf ? formatCpf(pacienteInicial.cpf) : "",
  );
  const [cep, setCep] = useState(
    pacienteInicial?.cep ? formatCep(pacienteInicial.cep) : "",
  );
  const [city, setCity] = useState(pacienteInicial?.cidade || "");
  const [state, setState] = useState(pacienteInicial?.estado || "");
  const [address, setAddress] = useState(pacienteInicial?.endereco || "");
  const [neighborhood, setNeighborhood] = useState(pacienteInicial?.bairro || "");
  const [number, setNumber] = useState(pacienteInicial?.numero || "");
  const [complemento, setComplemento] = useState(
    pacienteInicial?.complemento || "",
  );
  const [loadingCep, setLoadingCep] = useState(false);

  // Condição clínica e observações
  const [condicaoSelecionada, setCondicaoSelecionada] = useState<string>(
    condicaoInicial.opcao || CONDICAO_NAO_INFORMADA_SELECT,
  );
  const [condicaoCustom, setCondicaoCustom] = useState<string>(
    condicaoInicial.textoOutro,
  );
  const [observacoesGerais, setObservacoesGerais] = useState<string>(
    pacienteInicial?.dados_clinicos?.observacoes_gerais || "",
  );

  // Responsável Principal
  const [respId] = useState<string | undefined>(respPrincipalInicial?.id);
  const [respName, setRespName] = useState(respPrincipalInicial?.nome || "");
  const [respParentesco, setRespParentesco] = useState(
    respPrincipalInicial?.parentesco || "",
  );
  const [respBirthDate, setRespBirthDate] = useState(
    isoToBrDate(respPrincipalInicial?.data_nascimento),
  );
  const [respPhone, setRespPhone] = useState(
    respPrincipalInicial?.telefone
      ? formatPhone(respPrincipalInicial.telefone)
      : "",
  );
  const [respCpf, setRespCpf] = useState(
    respPrincipalInicial?.cpf ? formatCpf(respPrincipalInicial.cpf) : "",
  );
  const [respEmail, setRespEmail] = useState(respPrincipalInicial?.email || "");
  const [respCep, setRespCep] = useState(
    respPrincipalInicial?.cep ? formatCep(respPrincipalInicial.cep) : "",
  );
  const [respCity, setRespCity] = useState(respPrincipalInicial?.cidade || "");
  const [respState, setRespState] = useState(
    respPrincipalInicial?.estado || "",
  );
  const [respAddress, setRespAddress] = useState(
    respPrincipalInicial?.endereco || "",
  );
  const [respNeighborhood, setRespNeighborhood] = useState(
    respPrincipalInicial?.bairro || "",
  );
  const [respNumber, setRespNumber] = useState(
    respPrincipalInicial?.numero || "",
  );
  const [respSameAddress, setRespSameAddress] = useState(false);
  const [loadingRespCep, setLoadingRespCep] = useState(false);

  // Responsável Extra
  const [respExtraId] = useState<string | undefined>(respExtraInicial?.id);
  const [respExtraName, setRespExtraName] = useState(
    respExtraInicial?.nome || "",
  );
  const [respExtraParentesco, setRespExtraParentesco] = useState(
    respExtraInicial?.parentesco || "",
  );
  const [respExtraBirthDate, setRespExtraBirthDate] = useState(
    isoToBrDate(respExtraInicial?.data_nascimento),
  );
  const [respExtraPhone, setRespExtraPhone] = useState(
    respExtraInicial?.telefone ? formatPhone(respExtraInicial.telefone) : "",
  );
  const [respExtraCpf, setRespExtraCpf] = useState(
    respExtraInicial?.cpf ? formatCpf(respExtraInicial.cpf) : "",
  );
  const [respExtraCep, setRespExtraCep] = useState(
    respExtraInicial?.cep ? formatCep(respExtraInicial.cep) : "",
  );
  const [respExtraCity, setRespExtraCity] = useState(
    respExtraInicial?.cidade || "",
  );
  const [respExtraState, setRespExtraState] = useState(
    respExtraInicial?.estado || "",
  );
  const [respExtraAddress, setRespExtraAddress] = useState(
    respExtraInicial?.endereco || "",
  );
  const [respExtraNeighborhood, setRespExtraNeighborhood] = useState(
    respExtraInicial?.bairro || "",
  );
  const [respExtraNumber, setRespExtraNumber] = useState(
    respExtraInicial?.numero || "",
  );
  const [respExtraSameAddress, setRespExtraSameAddress] = useState(false);
  const [loadingRespExtraCep, setLoadingRespExtraCep] = useState(false);

  // Gatilhos Sensoriais
  const [selectedTriggers, setSelectedTriggers] = useState<string[]>(
    Array.isArray(pacienteInicial?.dados_clinicos?.gatilhos_sensoriais)
      ? pacienteInicial.dados_clinicos.gatilhos_sensoriais
      : [],
  );
  const [customTrigger, setCustomTrigger] = useState("");

  // Laudo representativo
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [erroValidacao, setErroValidacao] = useState<string | null>(null);

  // Se houver apenas 1 clínica disponível no modo criação, facilita a seleção mantendo o campo visível
  useEffect(() => {
    if (!clinicaId && modo === "criar" && clinicas.length === 1) {
      setClinicaId(clinicas[0].id);
    }
  }, [clinicas, clinicaId, modo]);

  useEffect(() => {
    return () => {
      if (photoPreview.startsWith("blob:")) {
        URL.revokeObjectURL(photoPreview);
      }
    };
  }, [photoPreview]);

  const handlePatientCepChange = async (val: string) => {
    const formatted = formatCep(val);
    setCep(formatted);
    if (formatted.replace(/\D/g, "").length === 8) {
      setLoadingCep(true);
      const addr = await buscarEnderecoPorCep(formatted);
      setLoadingCep(false);
      if (addr) {
        if (addr.endereco) setAddress(addr.endereco);
        if (addr.bairro) setNeighborhood(addr.bairro);
        if (addr.cidade) setCity(addr.cidade);
        if (addr.estado) setState(addr.estado);
      }
    }
  };

  const handleRespCepChange = async (val: string) => {
    const formatted = formatCep(val);
    setRespCep(formatted);
    if (formatted.replace(/\D/g, "").length === 8) {
      setLoadingRespCep(true);
      const addr = await buscarEnderecoPorCep(formatted);
      setLoadingRespCep(false);
      if (addr) {
        if (addr.endereco) setRespAddress(addr.endereco);
        if (addr.bairro) setRespNeighborhood(addr.bairro);
        if (addr.cidade) setRespCity(addr.cidade);
        if (addr.estado) setRespState(addr.estado);
      }
    }
  };

  const handleRespExtraCepChange = async (val: string) => {
    const formatted = formatCep(val);
    setRespExtraCep(formatted);
    if (formatted.replace(/\D/g, "").length === 8) {
      setLoadingRespExtraCep(true);
      const addr = await buscarEnderecoPorCep(formatted);
      setLoadingRespExtraCep(false);
      if (addr) {
        if (addr.endereco) setRespExtraAddress(addr.endereco);
        if (addr.bairro) setRespExtraNeighborhood(addr.bairro);
        if (addr.cidade) setRespExtraCity(addr.cidade);
        if (addr.estado) setRespExtraState(addr.estado);
      }
    }
  };

  const handleToggleTrigger = (trigger: string) => {
    setSelectedTriggers((prev) =>
      prev.includes(trigger)
        ? prev.filter((t) => t !== trigger)
        : [...prev, trigger],
    );
  };

  const handleAddCustomTrigger = () => {
    const limpo = customTrigger.trim();
    if (limpo && !selectedTriggers.includes(limpo)) {
      setSelectedTriggers((prev) => [...prev, limpo]);
      setCustomTrigger("");
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setPhotoPreview(url);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErroValidacao(null);

    if (!clinicaId) {
      setErroValidacao("Selecione a clínica institucional do paciente.");
      return;
    }

    if (name.trim().length < 2) {
      setErroValidacao("Informe o nome completo do paciente (mínimo 2 caracteres).");
      return;
    }

    const isoBirthDate = brDateToIso(birthDate);
    if (!isoBirthDate) {
      setErroValidacao("Informe uma data de nascimento válida no formato DD/MM/AAAA.");
      return;
    }

    if (cpf.replace(/\D/g, "").length !== 11) {
      setErroValidacao("Informe um CPF válido com 11 dígitos para o paciente.");
      return;
    }

    let isoRespBirthDate: string | null = null;
    if (respBirthDate.trim()) {
      isoRespBirthDate = brDateToIso(respBirthDate);
      if (!isoRespBirthDate) {
        setErroValidacao("A data de nascimento do responsável principal é inválida.");
        return;
      }
    }

    let isoRespExtraBirthDate: string | null = null;
    if (respExtraBirthDate.trim()) {
      isoRespExtraBirthDate = brDateToIso(respExtraBirthDate);
      if (!isoRespExtraBirthDate) {
        setErroValidacao("A data de nascimento do responsável extra é inválida.");
        return;
      }
    }

    if (condicaoSelecionada === "Outro" && !condicaoCustom.trim()) {
      setErroValidacao("Especifique o diagnóstico/condição clínica ao selecionar 'Outro'.");
      return;
    }

    const diagnosticoFinal =
      condicaoSelecionada === CONDICAO_NAO_INFORMADA_SELECT
        ? null
        : condicaoSelecionada === "Outro"
          ? condicaoCustom.trim()
          : condicaoSelecionada;

    const responsavelPayload = respName.trim()
      ? {
          ...(respId ? { id: respId } : {}),
          nome: respName.trim(),
          telefone: respPhone.trim() || phone.trim(),
          cpf: respCpf.trim() || null,
          data_nascimento: isoRespBirthDate,
          email: respEmail.trim() || null,
          parentesco: respParentesco.trim() || null,
          cep: (respSameAddress ? cep : respCep).trim() || null,
          cidade: (respSameAddress ? city : respCity).trim() || null,
          estado: (respSameAddress ? state : respState).trim() || null,
          endereco: (respSameAddress ? address : respAddress).trim() || null,
          bairro:
            (respSameAddress ? neighborhood : respNeighborhood).trim() || null,
          numero: (respSameAddress ? number : respNumber).trim() || null,
          mesmo_endereco_paciente: respSameAddress,
        }
      : null;

    const responsavelExtraPayload = respExtraName.trim()
      ? {
          ...(respExtraId ? { id: respExtraId } : {}),
          nome: respExtraName.trim(),
          telefone: respExtraPhone.trim() || phone.trim(),
          cpf: respExtraCpf.trim() || null,
          data_nascimento: isoRespExtraBirthDate,
          parentesco: respExtraParentesco.trim() || null,
          cep: (respExtraSameAddress ? cep : respExtraCep).trim() || null,
          cidade: (respExtraSameAddress ? city : respExtraCity).trim() || null,
          estado: (respExtraSameAddress ? state : respExtraState).trim() || null,
          endereco:
            (respExtraSameAddress ? address : respExtraAddress).trim() || null,
          bairro:
            (respExtraSameAddress ? neighborhood : respExtraNeighborhood).trim() ||
            null,
          numero: (respExtraSameAddress ? number : respExtraNumber).trim() || null,
          mesmo_endereco_paciente: respExtraSameAddress,
        }
      : null;

    const dto: CriarPacienteDTO | AtualizarPacienteDTO = {
      nome: name.trim(),
      data_nascimento: isoBirthDate,
      cpf: cpf.trim(),
      clinica_id: clinicaId,
      telefone: phone.trim() || null,
      cep: cep.trim() || null,
      cidade: city.trim() || null,
      estado: state.trim() || null,
      endereco: address.trim() || null,
      bairro: neighborhood.trim() || null,
      numero: number.trim() || null,
      complemento: complemento.trim() || null,
      responsavel: responsavelPayload,
      responsavel_extra: responsavelExtraPayload,
      dados_clinicos: {
        diagnostico_base: diagnosticoFinal,
        gatilhos_sensoriais: selectedTriggers,
        observacoes_gerais: observacoesGerais.trim() || null,
      },
    };

    const clinicaSelecionada = clinicas.find((c) => c.id === clinicaId);
    await onSubmit(dto, { clinicaNome: clinicaSelecionada?.nome });
  };

  const totalLaudosExistentes = pacienteInicial?.laudos?.length ?? 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-6 text-sm">
      {erroValidacao && (
        <div
          role="alert"
          className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-xs font-medium text-destructive"
        >
          {erroValidacao}
        </div>
      )}

      {/* SEÇÃO 0: VÍNCULO INSTITUCIONAL */}
      <section className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-4">
        <div className="border-b-2 border-primary pb-1.5">
          <h2 className="text-primary dark:text-blue-400 font-bold text-base">
            Vínculo Institucional
          </h2>
        </div>

        <div className="max-w-md space-y-1.5">
          <label
            htmlFor="clinica-paciente-select"
            className="text-xs font-semibold text-foreground"
          >
            Clínica Institucional *
          </label>
          <Select
            value={clinicaId || undefined}
            onValueChange={setClinicaId}
            disabled={carregandoClinicas}
          >
            <SelectTrigger
              id="clinica-paciente-select"
              data-testid="select-clinica-paciente"
              className="h-10 bg-muted/30"
            >
              <SelectValue
                placeholder={
                  carregandoClinicas
                    ? "Carregando clínicas..."
                    : "Selecione a clínica institucional"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {clinicas.map((clinica) => (
                <SelectItem key={clinica.id} value={clinica.id}>
                  {clinica.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </section>

      {/* SEÇÃO 1: DADOS BÁSICOS DO PACIENTE */}
      <section className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-4">
        <div className="border-b-2 border-primary pb-1.5">
          <h2 className="text-primary dark:text-blue-400 font-bold text-base">
            Dados Básicos do Paciente
          </h2>
        </div>

        <div className="flex flex-col md:flex-row gap-6 items-start">
          {/* Avatar representativo */}
          <div className="flex flex-col items-center gap-2 shrink-0 self-center md:self-start">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
              title="Selecionar foto representativa (sem persistência em bucket)"
            >
              <AvatarClinico
                nome={name.trim() || "Novo Paciente"}
                src={photoPreview || null}
                size="lg"
                className="h-24 w-24 text-xl border-2 border-dashed border-primary/40"
              />
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handlePhotoUpload}
              accept="image/*"
              className="hidden"
            />
            <span className="text-xs text-muted-foreground text-center max-w-36">
              Foto representativa (sem bucket ativo)
            </span>
          </div>

          <div className="flex-1 w-full space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              <div className="md:col-span-6 space-y-1">
                <label className="text-xs font-medium text-muted-foreground">
                  Nome completo *
                </label>
                <Input
                  placeholder="Nome completo"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="h-10 bg-muted/30 focus-visible:border-primary"
                />
              </div>
              <div className="md:col-span-3 space-y-1">
                <label className="text-xs font-medium text-muted-foreground">
                  Data de Nascimento *
                </label>
                <Input
                  placeholder="DD/MM/AAAA"
                  value={birthDate}
                  onChange={(e) => setBirthDate(formatDateInput(e.target.value))}
                  maxLength={10}
                  className="h-10 bg-muted/30 focus-visible:border-primary"
                />
              </div>
              <div className="md:col-span-3 space-y-1">
                <label className="text-xs font-medium text-muted-foreground">
                  Telefone de Contato
                </label>
                <Input
                  placeholder="(00) 00000-0000"
                  value={phone}
                  onChange={(e) => setPhone(formatPhone(e.target.value))}
                  maxLength={15}
                  className="h-10 bg-muted/30 focus-visible:border-primary"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              <div className="md:col-span-3 space-y-1">
                <label className="text-xs font-medium text-muted-foreground">
                  CPF *
                </label>
                <Input
                  placeholder="000.000.000-00"
                  value={cpf}
                  onChange={(e) => setCpf(formatCpf(e.target.value))}
                  maxLength={14}
                  className="h-10 bg-muted/30 focus-visible:border-primary"
                />
              </div>
              <div className="md:col-span-3 space-y-1 relative">
                <label className="text-xs font-medium text-muted-foreground">
                  CEP
                </label>
                <div className="relative">
                  <Input
                    placeholder="00000-000"
                    value={cep}
                    onChange={(e) => void handlePatientCepChange(e.target.value)}
                    maxLength={9}
                    className="h-10 bg-muted/30 focus-visible:border-primary"
                  />
                  {loadingCep && (
                    <Loader2 className="h-4 w-4 animate-spin text-primary absolute right-3 top-1/2 -translate-y-1/2" />
                  )}
                </div>
              </div>
              <div className="md:col-span-4 space-y-1">
                <label className="text-xs font-medium text-muted-foreground">
                  Cidade
                </label>
                <Input
                  placeholder="Cidade"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="h-10 bg-muted/30 focus-visible:border-primary"
                />
              </div>
              <div className="md:col-span-2 space-y-1">
                <label className="text-xs font-medium text-muted-foreground">
                  Estado (UF)
                </label>
                <Input
                  placeholder="UF"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="h-10 bg-muted/30 focus-visible:border-primary"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              <div className="md:col-span-5 space-y-1">
                <label className="text-xs font-medium text-muted-foreground">
                  Endereço
                </label>
                <Input
                  placeholder="Rua / Avenida"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="h-10 bg-muted/30 focus-visible:border-primary"
                />
              </div>
              <div className="md:col-span-3 space-y-1">
                <label className="text-xs font-medium text-muted-foreground">
                  Bairro
                </label>
                <Input
                  placeholder="Bairro"
                  value={neighborhood}
                  onChange={(e) => setNeighborhood(e.target.value)}
                  className="h-10 bg-muted/30 focus-visible:border-primary"
                />
              </div>
              <div className="md:col-span-2 space-y-1">
                <label className="text-xs font-medium text-muted-foreground">
                  Número
                </label>
                <Input
                  placeholder="Nº"
                  value={number}
                  onChange={(e) => setNumber(e.target.value)}
                  className="h-10 bg-muted/30 focus-visible:border-primary"
                />
              </div>
              <div className="md:col-span-2 space-y-1">
                <label className="text-xs font-medium text-muted-foreground">
                  Complemento
                </label>
                <Input
                  placeholder="Apto, bloco..."
                  value={complemento}
                  onChange={(e) => setComplemento(e.target.value)}
                  className="h-10 bg-muted/30 focus-visible:border-primary"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SEÇÃO 2: QUADRO CLÍNICO, GATILHOS E LAUDO */}
      <section className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-5">
        <div className="border-b-2 border-primary pb-1.5">
          <h2 className="text-primary dark:text-blue-400 font-bold text-base">
            Perfil Clínico e Gatilhos Sensoriais
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label
              htmlFor="condicao-clinica-select"
              className="text-xs font-semibold text-foreground"
            >
              Condição Clínica / Estado Clínico
            </label>
            <Select
              value={condicaoSelecionada}
              onValueChange={setCondicaoSelecionada}
            >
              <SelectTrigger
                id="condicao-clinica-select"
                data-testid="select-condicao-clinica"
                className="h-10 bg-muted/30"
              >
                <SelectValue placeholder="Selecione a condição clínica" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={CONDICAO_NAO_INFORMADA_SELECT}>
                  Não informado / A definir
                </SelectItem>
                {CONDICOES_CLINICAS.map((condicao) => (
                  <SelectItem key={condicao} value={condicao}>
                    {condicao}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {condicaoSelecionada === "Outro" && (
            <div className="space-y-1.5">
              <label
                htmlFor="condicao-clinica-custom"
                className="text-xs font-semibold text-foreground"
              >
                Especifique a condição clínica *
              </label>
              <Input
                id="condicao-clinica-custom"
                data-testid="input-condicao-outro"
                placeholder="Ex: Apraxia de Fala"
                value={condicaoCustom}
                onChange={(e) => setCondicaoCustom(e.target.value)}
                className="h-10 bg-muted/30 focus-visible:border-primary"
              />
            </div>
          )}
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold text-foreground">
            Possíveis Gatilhos Sensoriais
          </label>
          <div className="flex flex-wrap items-center gap-2.5">
            {DEFAULT_TRIGGERS.map((trigger) => {
              const isSelected = selectedTriggers.includes(trigger);
              return (
                <button
                  key={trigger}
                  type="button"
                  onClick={() => handleToggleTrigger(trigger)}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-2 min-h-11 rounded-lg text-xs font-medium transition-all cursor-pointer border ${
                    isSelected
                      ? "bg-primary text-primary-foreground border-primary shadow-xs"
                      : "bg-muted/40 text-foreground/80 border-border hover:bg-muted"
                  }`}
                >
                  {isSelected ? (
                    <Check className="w-3.5 h-3.5" />
                  ) : (
                    <Plus className="w-3.5 h-3.5" />
                  )}
                  {trigger}
                </button>
              );
            })}

            {selectedTriggers
              .filter((t) => !DEFAULT_TRIGGERS.includes(t))
              .map((custom) => (
                <button
                  key={custom}
                  type="button"
                  onClick={() => handleToggleTrigger(custom)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-11 rounded-lg text-xs font-medium bg-primary text-primary-foreground border border-primary shadow-xs cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  {custom}
                </button>
              ))}

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
                className="h-10 w-40 text-xs bg-muted/30"
              />
              {customTrigger && (
                <Button
                  type="button"
                  size="sm"
                  onClick={handleAddCustomTrigger}
                  className="min-h-11 px-3 text-xs bg-primary hover:bg-primary-hover text-primary-foreground cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="observacoes-gerais-paciente"
            className="text-xs font-semibold text-foreground"
          >
            Observações Clínicas Iniciais
          </label>
          <textarea
            id="observacoes-gerais-paciente"
            value={observacoesGerais}
            onChange={(e) => setObservacoesGerais(e.target.value)}
            placeholder="Anotações de acolhimento, preferências de comunicação e recomendações iniciais..."
            rows={3}
            className="w-full rounded-xl border border-input bg-muted/30 px-3 py-2 text-sm focus-visible:outline-none focus-visible:border-primary"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-foreground">
              Laudo Médico{" "}
              <span className="font-normal text-muted-foreground">
                (Opcional — confirmação futura da condição clínica)
              </span>
            </span>
            {modo === "editar" && (
              <span className="text-xs text-muted-foreground">
                Laudos registrados: {totalLaudosExistentes}
              </span>
            )}
          </div>
          <div
            onClick={() => laudoInputRef.current?.click()}
            className="border-2 border-dashed border-primary/30 rounded-2xl p-5 bg-muted/20 hover:bg-primary/5 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors text-center"
          >
            <input
              type="file"
              ref={laudoInputRef}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) setUploadedFileName(file.name);
              }}
              accept=".pdf,.doc,.docx,.png,.jpg"
              className="hidden"
            />
            {uploadedFileName ? (
              <div className="flex items-center gap-2 text-foreground font-medium">
                <FileText className="h-5 w-5 text-primary" />
                <span>{uploadedFileName}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    setUploadedFileName(null);
                  }}
                  className="h-8 w-8 text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <>
                <Upload className="h-6 w-6 text-primary" />
                <span className="text-xs text-muted-foreground">
                  Seleção representativa de arquivo (upload remoto aguarda ativação do bucket)
                </span>
              </>
            )}
          </div>
        </div>
      </section>

      {/* SEÇÃO 3: RESPONSÁVEL PRINCIPAL */}
      <section className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-4">
        <div className="border-b-2 border-primary pb-1.5">
          <h2 className="text-primary dark:text-blue-400 font-bold text-base">
            Dados do Responsável Principal
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-4 space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              Nome completo
            </label>
            <Input
              placeholder="Nome do responsável"
              value={respName}
              onChange={(e) => setRespName(e.target.value)}
              className="h-10 bg-muted/30 focus-visible:border-primary"
            />
          </div>
          <div className="md:col-span-2 space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              Parentesco
            </label>
            <Input
              placeholder="Ex: Mãe, Pai"
              value={respParentesco}
              onChange={(e) => setRespParentesco(e.target.value)}
              className="h-10 bg-muted/30 focus-visible:border-primary"
            />
          </div>
          <div className="md:col-span-2 space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              Data Nasc
            </label>
            <Input
              placeholder="DD/MM/AAAA"
              value={respBirthDate}
              onChange={(e) => setRespBirthDate(formatDateInput(e.target.value))}
              maxLength={10}
              className="h-10 bg-muted/30 focus-visible:border-primary"
            />
          </div>
          <div className="md:col-span-2 space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              Telefone
            </label>
            <Input
              placeholder="(00) 00000-0000"
              value={respPhone}
              onChange={(e) => setRespPhone(formatPhone(e.target.value))}
              maxLength={15}
              className="h-10 bg-muted/30 focus-visible:border-primary"
            />
          </div>
          <div className="md:col-span-2 space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              CPF
            </label>
            <Input
              placeholder="000.000.000-00"
              value={respCpf}
              onChange={(e) => setRespCpf(formatCpf(e.target.value))}
              maxLength={14}
              className="h-10 bg-muted/30 focus-visible:border-primary"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-3 space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              E-mail
            </label>
            <Input
              type="email"
              placeholder="responsavel@email.com"
              value={respEmail}
              onChange={(e) => setRespEmail(e.target.value)}
              className="h-10 bg-muted/30 focus-visible:border-primary"
            />
          </div>
          <div className="md:col-span-2 space-y-1 relative">
            <label className="text-xs font-medium text-muted-foreground">
              CEP
            </label>
            <div className="relative">
              <Input
                placeholder="00000-000"
                value={respSameAddress ? cep : respCep}
                onChange={(e) => void handleRespCepChange(e.target.value)}
                disabled={respSameAddress}
                maxLength={9}
                className="h-10 bg-muted/30 focus-visible:border-primary"
              />
              {loadingRespCep && !respSameAddress && (
                <Loader2 className="h-4 w-4 animate-spin text-primary absolute right-3 top-1/2 -translate-y-1/2" />
              )}
            </div>
          </div>
          <div className="md:col-span-2 space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              Cidade
            </label>
            <Input
              placeholder="Cidade"
              value={respSameAddress ? city : respCity}
              onChange={(e) => setRespCity(e.target.value)}
              disabled={respSameAddress}
              className="h-10 bg-muted/30 focus-visible:border-primary"
            />
          </div>
          <div className="md:col-span-1 space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              Estado
            </label>
            <Input
              aria-label="Estado do responsável"
              placeholder="UF"
              value={respSameAddress ? state : respState}
              onChange={(e) => setRespState(e.target.value)}
              disabled={respSameAddress}
              className="h-10 bg-muted/30 focus-visible:border-primary"
            />
          </div>
          <div className="md:col-span-2 space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              Endereço
            </label>
            <Input
              placeholder="Rua / Av"
              value={respSameAddress ? address : respAddress}
              onChange={(e) => setRespAddress(e.target.value)}
              disabled={respSameAddress}
              className="h-10 bg-muted/30 focus-visible:border-primary"
            />
          </div>
          <div className="md:col-span-1 space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              Bairro
            </label>
            <Input
              placeholder="Bairro"
              value={respSameAddress ? neighborhood : respNeighborhood}
              onChange={(e) => setRespNeighborhood(e.target.value)}
              disabled={respSameAddress}
              className="h-10 bg-muted/30 focus-visible:border-primary"
            />
          </div>
          <div className="md:col-span-1 space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              Nº
            </label>
            <Input
              placeholder="Nº"
              value={respSameAddress ? number : respNumber}
              onChange={(e) => setRespNumber(e.target.value)}
              disabled={respSameAddress}
              className="h-10 bg-muted/30 focus-visible:border-primary"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <input
            type="checkbox"
            id="respSameAddressPage"
            checked={respSameAddress}
            onChange={(e) => setRespSameAddress(e.target.checked)}
            className="rounded border-border accent-primary h-4 w-4"
          />
          <label
            htmlFor="respSameAddressPage"
            className="text-xs text-muted-foreground cursor-pointer select-none"
          >
            Residente no mesmo local do paciente.
          </label>
        </div>
      </section>

      {/* SEÇÃO 4: RESPONSÁVEL EXTRA (OPCIONAL) */}
      <section className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-4">
        <div className="border-b-2 border-primary pb-1.5">
          <h2 className="text-primary dark:text-blue-400 font-bold text-base">
            Dados do Responsável Extra{" "}
            <span className="text-xs font-normal text-muted-foreground">
              (Opcional)
            </span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-4 space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              Nome completo
            </label>
            <Input
              placeholder="Nome completo (opcional)"
              value={respExtraName}
              onChange={(e) => setRespExtraName(e.target.value)}
              className="h-10 bg-muted/30 focus-visible:border-primary"
            />
          </div>
          <div className="md:col-span-2 space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              Parentesco
            </label>
            <Input
              placeholder="Ex: Avó, Tio"
              value={respExtraParentesco}
              onChange={(e) => setRespExtraParentesco(e.target.value)}
              className="h-10 bg-muted/30 focus-visible:border-primary"
            />
          </div>
          <div className="md:col-span-2 space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              Data Nasc
            </label>
            <Input
              placeholder="DD/MM/AAAA"
              value={respExtraBirthDate}
              onChange={(e) =>
                setRespExtraBirthDate(formatDateInput(e.target.value))
              }
              maxLength={10}
              className="h-10 bg-muted/30 focus-visible:border-primary"
            />
          </div>
          <div className="md:col-span-2 space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              Telefone
            </label>
            <Input
              placeholder="(00) 00000-0000"
              value={respExtraPhone}
              onChange={(e) => setRespExtraPhone(formatPhone(e.target.value))}
              maxLength={15}
              className="h-10 bg-muted/30 focus-visible:border-primary"
            />
          </div>
          <div className="md:col-span-2 space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              CPF
            </label>
            <Input
              placeholder="000.000.000-00"
              value={respExtraCpf}
              onChange={(e) => setRespExtraCpf(formatCpf(e.target.value))}
              maxLength={14}
              className="h-10 bg-muted/30 focus-visible:border-primary"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-2 space-y-1 relative">
            <label className="text-xs font-medium text-muted-foreground">
              CEP
            </label>
            <div className="relative">
              <Input
                placeholder="00000-000"
                value={respExtraSameAddress ? cep : respExtraCep}
                onChange={(e) => void handleRespExtraCepChange(e.target.value)}
                disabled={respExtraSameAddress}
                maxLength={9}
                className="h-10 bg-muted/30 focus-visible:border-primary"
              />
              {loadingRespExtraCep && !respExtraSameAddress && (
                <Loader2 className="h-4 w-4 animate-spin text-primary absolute right-3 top-1/2 -translate-y-1/2" />
              )}
            </div>
          </div>
          <div className="md:col-span-3 space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              Cidade
            </label>
            <Input
              placeholder="Cidade"
              value={respExtraSameAddress ? city : respExtraCity}
              onChange={(e) => setRespExtraCity(e.target.value)}
              disabled={respExtraSameAddress}
              className="h-10 bg-muted/30 focus-visible:border-primary"
            />
          </div>
          <div className="md:col-span-1 space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              Estado
            </label>
            <Input
              placeholder="UF"
              value={respExtraSameAddress ? state : respExtraState}
              onChange={(e) => setRespExtraState(e.target.value)}
              disabled={respExtraSameAddress}
              className="h-10 bg-muted/30 focus-visible:border-primary"
            />
          </div>
          <div className="md:col-span-3 space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              Endereço
            </label>
            <Input
              placeholder="Endereço"
              value={respExtraSameAddress ? address : respExtraAddress}
              onChange={(e) => setRespExtraAddress(e.target.value)}
              disabled={respExtraSameAddress}
              className="h-10 bg-muted/30 focus-visible:border-primary"
            />
          </div>
          <div className="md:col-span-2 space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              Bairro
            </label>
            <Input
              placeholder="Bairro"
              value={respExtraSameAddress ? neighborhood : respExtraNeighborhood}
              onChange={(e) => setRespExtraNeighborhood(e.target.value)}
              disabled={respExtraSameAddress}
              className="h-10 bg-muted/30 focus-visible:border-primary"
            />
          </div>
          <div className="md:col-span-1 space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              Nº
            </label>
            <Input
              placeholder="Nº"
              value={respExtraSameAddress ? number : respExtraNumber}
              onChange={(e) => setRespExtraNumber(e.target.value)}
              disabled={respExtraSameAddress}
              className="h-10 bg-muted/30 focus-visible:border-primary"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <input
            type="checkbox"
            id="respExtraSameAddressPage"
            checked={respExtraSameAddress}
            onChange={(e) => setRespExtraSameAddress(e.target.checked)}
            className="rounded border-border accent-primary h-4 w-4"
          />
          <label
            htmlFor="respExtraSameAddressPage"
            className="text-xs text-muted-foreground cursor-pointer select-none"
          >
            Residente no mesmo local do paciente.
          </label>
        </div>
      </section>

      {/* AÇÕES FINAIS */}
      <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 pt-2 pb-6">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={submitting}
          className="w-full sm:w-auto min-h-11 px-6 rounded-xl cursor-pointer"
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={submitting}
          data-testid="btn-submit-paciente"
          className="w-full sm:w-auto min-h-11 px-8 rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground font-bold gap-2 cursor-pointer"
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Salvando...</span>
            </>
          ) : modo === "editar" ? (
            <>
              <Save className="h-4 w-4" />
              <span>Salvar Alterações</span>
            </>
          ) : (
            <>
              <Plus className="h-4 w-4" />
              <span>Cadastrar Paciente</span>
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
