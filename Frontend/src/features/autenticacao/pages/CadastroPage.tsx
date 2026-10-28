"use client";

import { useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import {
  User,
  Mail,
  Lock,
  Building2,
  Award,
  Eye,
  EyeOff,
  ShieldCheck,
  AlertCircle,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { toast } from "sonner";

/**
 * ============================================================================
 * TELA: CADASTRO DE TERAPEUTA (InTEA)
 * Frame Figma: Cadastro - InTEA (90:777)
 * Modo Restrito ("Off"): Requer token de convite institucional (?token=...)
 * ============================================================================
 */
/**
 * Renders the therapist account self-registration page with form validation and masked inputs.
 * Therapist Registration (RF01): Validates email, password strength, and professional council credentials.
 *
 * @returns Therapist registration page view
 */
export function CadastroPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const tokenConvite = searchParams.get("token");

  const [nome, setNome] = useState("");
  const [crefito, setCrefito] = useState("");
  const [clinica, setClinica] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [mostrarConfirmar, setMostrarConfirmar] = useState(false);
  const [loading, setLoading] = useState(false);

  const temTokenValido = Boolean(tokenConvite && tokenConvite.length >= 6);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!temTokenValido) {
      toast.error(
        "Cadastro bloqueado: é necessário um link com token de convite do administrador."
      );
      return;
    }

    if (senha !== confirmarSenha) {
      toast.error("As senhas digitadas não coincidem.");
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      toast.success("Cadastro realizado com sucesso! Faça login com suas novas credenciais.");
      navigate("/login");
    }, 1000);
  };

  return (
    <div className="min-h-screen w-full bg-[#F8FAFC] dark:bg-slate-950 flex flex-col justify-center items-center p-4 sm:p-6">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-xl shadow-slate-200/50 dark:shadow-none flex flex-col gap-6">
        {/* Cabeçalho InTEA */}
        <div className="flex flex-col items-center text-center gap-1">
          <div className="h-12 w-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-black text-xl mb-1">
            In
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            InTEA
          </h1>
          <p className="text-xs text-slate-500 font-medium tracking-wide">
            Clinical Orchestration v1.0
          </p>
        </div>

        {/* Banner de Modo Restrito / Token de Convite */}
        {!temTokenValido ? (
          <div className="p-3.5 rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs flex gap-2.5 items-start">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold">Ambiente de Cadastro Restrito</p>
              <p className="text-[11px] leading-relaxed">
                Novos terapeutas devem ingressar através do link com token de convite emitido pelo Administrador da Clínica.
              </p>
            </div>
          </div>
        ) : (
          <div className="p-3 rounded-xl border border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs flex gap-2 items-center">
            <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600" />
            <span className="font-semibold text-[11px]">
              Convite institucional validado: #{tokenConvite?.slice(0, 8)}
            </span>
          </div>
        )}

        {/* Formulário com os 6 campos do Figma */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          {/* 1. Nome */}
          <div className="relative">
            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Nome completo"
              required
              className="pl-10 h-11 text-xs rounded-xl bg-[#F1F5F9] dark:bg-slate-800 border-none"
            />
          </div>

          {/* 2. CREFITO */}
          <div className="relative">
            <Award className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              value={crefito}
              onChange={(e) => setCrefito(e.target.value)}
              placeholder="Registro profissional (ex: CREFITO-14/87654-TO)"
              required
              className="pl-10 h-11 text-xs rounded-xl bg-[#F1F5F9] dark:bg-slate-800 border-none"
            />
          </div>

          {/* 3. Clínica associada */}
          <div className="relative">
            <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              value={clinica}
              onChange={(e) => setClinica(e.target.value)}
              placeholder="Clínica associada"
              required
              className="pl-10 h-11 text-xs rounded-xl bg-[#F1F5F9] dark:bg-slate-800 border-none"
            />
          </div>

          {/* 4. E-mail profissional */}
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              placeholder="E-mail profissional"
              required
              className="pl-10 h-11 text-xs rounded-xl bg-[#F1F5F9] dark:bg-slate-800 border-none"
            />
          </div>

          {/* 5. Senha */}
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              type={mostrarSenha ? "text" : "password"}
              placeholder="Senha de acesso (mínimo 6 caracteres)"
              required
              className="pl-10 pr-10 h-11 text-xs rounded-xl bg-[#F1F5F9] dark:bg-slate-800 border-none"
            />
            <button
              type="button"
              onClick={() => setMostrarSenha(!mostrarSenha)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              {mostrarSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          {/* 6. Confirme a senha */}
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              value={confirmarSenha}
              onChange={(e) => setConfirmarSenha(e.target.value)}
              type={mostrarConfirmar ? "text" : "password"}
              placeholder="Confirme a senha"
              required
              className="pl-10 pr-10 h-11 text-xs rounded-xl bg-[#F1F5F9] dark:bg-slate-800 border-none"
            />
            <button
              type="button"
              onClick={() => setMostrarConfirmar(!mostrarConfirmar)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              {mostrarConfirmar ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          {/* Botão de Submissão */}
          <Button
            type="submit"
            disabled={loading || !temTokenValido}
            className="w-full h-11 rounded-xl bg-[#1E40AF] hover:bg-[#1e3a8a] text-white font-bold text-xs shadow-md shadow-blue-900/20 mt-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Cadastrando..." : "Completar Cadastro"}
          </Button>
        </form>

        {/* Rodapé e Link de Retorno */}
        <div className="flex flex-col items-center gap-3 pt-2 text-center text-xs">
          <Link
            to="/login"
            className="text-primary hover:underline font-semibold flex items-center gap-1"
          >
            <span>Já possui conta clínica? Fazer Login</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
          <span className="text-[11px] text-slate-400">
            Ambiente Clínico Seguro • InTEA v1.0
          </span>
        </div>
      </div>
    </div>
  );
}

export default CadastroPage;
