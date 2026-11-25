import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/shared/components/ui/button";
import {
  clinicaAdminService,
  type ClinicaAdminItem,
} from "@/features/admin/services/clinicaAdmin.service";
import { FormularioPaciente } from "../components/FormularioPaciente";
import { pacienteService } from "../services/paciente.service";
import { usePacienteStore } from "../store/paciente.store";
import {
  pacienteToPatient,
  type AtualizarPacienteDTO,
  type CriarPacienteDTO,
  type Paciente,
} from "../types/paciente.types";

/**
 * Route page wrapper for creating or editing a patient record, loading clinics and existing patient data.
 *
 * @returns Rendered patient form page with loading and error states.
 */
export function FormularioPacientePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const upsertPatient = usePacienteStore((s) => s.upsertPatient);

  const modo: "criar" | "editar" = id ? "editar" : "criar";

  const [clinicas, setClinicas] = useState<ClinicaAdminItem[]>([]);
  const [pacienteInicial, setPacienteInicial] = useState<Paciente | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erroCarga, setErroCarga] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let ativo = true;

    async function carregarDependencias() {
      setCarregando(true);
      setErroCarga(null);

      try {
        const [listaClinicas, pacienteCarregado] = await Promise.all([
          clinicaAdminService.listar({ status_ativo: true, limit: 100 }),
          id ? pacienteService.buscarPorId(id) : Promise.resolve(null),
        ]);

        if (!ativo) return;

        setClinicas(listaClinicas || []);

        if (id && !pacienteCarregado) {
          setErroCarga("Paciente não encontrado para edição.");
          return;
        }

        setPacienteInicial(pacienteCarregado);
      } catch (err) {
        if (!ativo) return;
        const msg =
          err instanceof Error
            ? err.message
            : "Não foi possível carregar os dados necessários para o formulário.";
        setErroCarga(msg);
      } finally {
        if (ativo) {
          setCarregando(false);
        }
      }
    }

    void carregarDependencias();

    return () => {
      ativo = false;
    };
  }, [id]);

  const handleSubmit = async (dto: CriarPacienteDTO | AtualizarPacienteDTO) => {
    setSubmitting(true);
    try {
      if (modo === "editar" && id) {
        const atualizado = await pacienteService.atualizar(
          id,
          dto as AtualizarPacienteDTO,
        );
        if (!atualizado) {
          toast.error("Não foi possível confirmar a atualização do paciente.");
          return;
        }
        upsertPatient(pacienteToPatient(atualizado));
        toast.success("Cadastro do paciente atualizado com sucesso!");
        navigate(`/pacientes/${atualizado.id}`);
      } else {
        const criado = await pacienteService.criar(dto as CriarPacienteDTO);
        upsertPatient(pacienteToPatient(criado));
        toast.success("Paciente cadastrado com sucesso!");
        navigate(`/pacientes/${criado.id}`);
      }
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "Erro ao salvar os dados do paciente.";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-6 w-full max-w-5xl mx-auto py-2">
      <div className="flex items-center justify-between gap-4">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="min-h-11 gap-2 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Voltar</span>
        </Button>
      </div>

      <header className="bg-card border border-border p-6 rounded-2xl shadow-xs">
        <h1 className="text-2xl font-bold text-foreground tracking-tight">
          {modo === "editar"
            ? "Editar Cadastro do Paciente"
            : "Cadastrar Novo Paciente"}
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          {modo === "editar"
            ? "Atualize vínculo institucional, responsáveis, dados clínicos e gatilhos sensoriais do paciente."
            : "Preencha os dados cadastrais, vínculo institucional e perfil clínico inicial do paciente."}
        </p>
      </header>

      {carregando ? (
        <div
          data-testid="formulario-paciente-skeleton"
          className="space-y-4"
        >
          <div className="h-28 w-full animate-pulse rounded-2xl bg-muted/60 border border-border" />
          <div className="h-64 w-full animate-pulse rounded-2xl bg-muted/60 border border-border" />
          <div className="h-48 w-full animate-pulse rounded-2xl bg-muted/60 border border-border" />
        </div>
      ) : erroCarga ? (
        <div
          data-testid="formulario-paciente-erro"
          className="rounded-2xl border border-destructive/30 bg-card p-8 text-center space-y-3"
        >
          <AlertTriangle className="h-8 w-8 text-destructive mx-auto" />
          <h2 className="text-base font-bold text-foreground">
            Não foi possível abrir o formulário
          </h2>
          <p className="text-sm text-muted-foreground">{erroCarga}</p>
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/pacientes/todos")}
            className="min-h-11"
          >
            Ir para Todos os Pacientes
          </Button>
        </div>
      ) : (
        <FormularioPaciente
          key={pacienteInicial?.id || "novo"}
          modo={modo}
          pacienteInicial={pacienteInicial}
          clinicas={clinicas}
          carregandoClinicas={carregando}
          submitting={submitting}
          onSubmit={handleSubmit}
          onCancel={() => navigate(-1)}
        />
      )}
    </div>
  );
}
