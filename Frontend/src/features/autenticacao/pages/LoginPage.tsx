/**
 * ============================================================================
 * TELA DE LOGIN OFICIAL — InTEA (Figma Frame: 'Login - InTEA', Node 23:108)
 * Porta de entrada principal da aplicação de Orquestração Clínica.
 * Integrada ao useAuth / useAuthStore e aos perfis mockados de demonstração.
 * Conformidade: RF21 (Autenticação e Autoria), RN04 (Vínculo Institucional).
 * ============================================================================
 */

import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Loader2,
  AlertCircle,
  ShieldCheck,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useAuthStore } from "../store/authStore";

interface ContaDemonstracao {
  nome: string;
  cargo: string;
  email: string;
  senha: string;
}

const CONTAS_DEMONSTRACAO: ContaDemonstracao[] = [
  {
    nome: "Dr. Hermeson Alves",
    cargo: "Psicomotricidade • Terapeuta",
    email: "hermeson.alves@intea.clinica",
    senha: "Senha@123",
  },
  {
    nome: "Dr. Marcos Terapeuta",
    cargo: "Terapia Ocupacional • Terapeuta",
    email: "marcos.terapeuta@intea.com.br",
    senha: "Senha@123",
  },
  {
    nome: "Dra. Luma Maiara",
    cargo: "Psicologia ABA • Terapeuta",
    email: "luma.maiara@intea.com.br",
    senha: "Senha@123",
  },
  {
    nome: "Admin InTEA",
    cargo: "SuperAdmin Institucional",
    email: "admin@intea.com.br",
    senha: "Admin@123",
  },
];

export function LoginPage() {
  const navigate = useNavigate();
  const { login, loading, error } = useAuth();
  const setError = useAuthStore((s) => s.setError);

  const [email, setEmail] = useState("hermeson.alves@intea.clinica");
  const [senha, setSenha] = useState("Senha@123");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [erroValidacao, setErroValidacao] = useState<string | null>(null);
  const [avisoRecuperacao, setAvisoRecuperacao] = useState<string | null>(null);
  const [mostrarContasDemo, setMostrarContasDemo] = useState(false);

  const mensagemErroExibida = erroValidacao || error;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErroValidacao(null);
    setAvisoRecuperacao(null);
    setError(null);

    const emailLimpo = email.trim();
    if (!emailLimpo || !emailLimpo.includes("@")) {
      setErroValidacao("Informe um e-mail profissional válido.");
      return;
    }

    if (!senha || senha.length < 6) {
      setErroValidacao("A senha deve conter no mínimo 6 caracteres.");
      return;
    }

    try {
      await login(emailLimpo, senha);
      navigate("/painel", { replace: true });
    } catch {
      // Erro já registrado no useAuthStore
    }
  }

  function handleSelecionarContaDemo(conta: ContaDemonstracao) {
    setEmail(conta.email);
    setSenha(conta.senha);
    setErroValidacao(null);
    setAvisoRecuperacao(null);
    setError(null);
  }

  function handleEsqueciSenha() {
    setErroValidacao(null);
    setAvisoRecuperacao(
      "Para redefinir sua credencial institucional, contate a coordenação da clínica ou selecione um perfil de acesso rápido abaixo.",
    );
    setMostrarContasDemo(true);
  }

  return (
    <main
      data-testid="login-page"
      className="min-h-screen w-full flex flex-row justify-center items-center p-6 md:p-10 bg-background-auth"
    >
      {/* Card Central (Figma: Background+Shadow) */}
      <section className="flex flex-col gap-8 md:gap-10 pt-12 md:pt-16 px-8 md:px-16 pb-6 w-full max-w-120 rounded-2xl bg-card shadow-lg border border-border/60">
        {/* Cabeçalho do Card (Figma: Container) */}
        <header className="flex flex-col gap-3ll items-center text-center">
          <h1 className="text-[48px] leading-none font-bold text-primary tracking-tight select-none">
            InTEA
          </h1>
          <p className="text-[16px] font-normal text-foreground">
            Clinical Orchestration v1.0
          </p>
        </header>

        {/* Formulário de Autenticação (Figma: Form) */}
        <form
          onSubmit={(e) => void handleSubmit(e)}
          noValidate
          className="flex flex-col gap-3.5 w-full"
        >
          {/* Campo 1 — E-mail profissional */}
          <div className="flex flex-row items-center gap-3 w-full px-4 py-3.5 rounded-[12px] bg-input border border-transparent focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-primary/15 transition-all">
            <Mail
              className="w-5 h-5 text-muted-foreground shrink-0"
              aria-hidden="true"
            />
            <input
              id="login-email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="E-mail profissional"
              aria-label="E-mail profissional"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (erroValidacao) setErroValidacao(null);
              }}
              disabled={loading}
              className="w-full bg-transparent text-[16px] text-foreground-heading placeholder:text-muted-foreground focus:outline-none disabled:opacity-60"
            />
          </div>

          {/* Campo 2 — Senha */}
          <div className="flex flex-row justify-between items-center gap-3 w-full px-4 py-3.5 rounded-[12px] bg-input border border-transparent focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-primary/15 transition-all">
            <div className="flex flex-row items-center gap-3 flex-1 min-w-0">
              <Lock
                className="w-5 h-5 text-muted-foreground shrink-0"
                aria-hidden="true"
              />
              <input
                id="login-password"
                name="password"
                type={mostrarSenha ? "text" : "password"}
                autoComplete="current-password"
                placeholder="Senha"
                aria-label="Senha"
                value={senha}
                onChange={(e) => {
                  setSenha(e.target.value);
                  if (erroValidacao) setErroValidacao(null);
                }}
                disabled={loading}
                className="w-full bg-transparent text-[16px] text-foreground-heading placeholder:text-muted-foreground focus:outline-none disabled:opacity-60"
              />
            </div>

            <button
              type="button"
              onClick={() => setMostrarSenha((prev) => !prev)}
              aria-label={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
              className="text-muted-foreground hover:text-foreground transition-colors focus:outline-none cursor-pointer shrink-0"
            >
              {mostrarSenha ? (
                <EyeOff className="w-5 h-5" />
              ) : (
                <Eye className="w-5 h-5" />
              )}
            </button>
          </div>

          {/* Link Esqueci minha senha */}
          <div className="flex flex-row justify-end w-full">
            <button
              type="button"
              onClick={handleEsqueciSenha}
              className="text-[12px] font-medium text-primary hover:underline py-1 px-1 cursor-pointer focus:outline-none"
            >
              Esqueci minha senha
            </button>
          </div>

          {/* Alerta de Erro de Validação ou Autenticação */}
          {mensagemErroExibida && (
            <div
              role="alert"
              className="flex items-center gap-2 text-destructive text-xs font-medium bg-destructive/10 border border-destructive/20 rounded-[10px] px-3 py-2.5"
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{mensagemErroExibida}</span>
            </div>
          )}

          {/* Feedback de Recuperação de Senha */}
          {avisoRecuperacao && !mensagemErroExibida && (
            <div
              role="status"
              className="flex items-start gap-2 text-primary text-xs font-medium bg-primary/10 border border-primary/20 rounded-[10px] px-3 py-2.5"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{avisoRecuperacao}</span>
            </div>
          )}

          {/* Botão Principal de Submit (Figma: Button) */}
          <button
            type="submit"
            disabled={loading}
            className="flex flex-row justify-center items-center gap-3 w-full py-3.5 px-6 rounded-[12px] bg-[#1E40AF] hover:bg-primary active:bg-primary-active text-white text-[14px] font-semibold shadow-sm transition-all cursor-pointer disabled:opacity-60 mt-1"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Autenticando...</span>
              </>
            ) : (
              <>
                <span>Entrar na Plataforma</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          {/* Seção Discreta de Acesso Rápido / Credenciais de Demonstração */}
          <div className="pt-2 border-t border-border/50 mt-2">
            <button
              type="button"
              onClick={() => setMostrarContasDemo((prev) => !prev)}
              className="w-full flex items-center justify-center gap-1.5 text-[11px] font-medium text-muted-foreground hover:text-primary transition-colors py-1 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>
                {mostrarContasDemo
                  ? "Ocultar perfis de demonstração"
                  : "Acessar com credenciais de demonstração"}
              </span>
            </button>

            {mostrarContasDemo && (
              <div className="grid grid-cols-1 gap-1.5 mt-2.5 animate-in fade-in duration-200">
                {CONTAS_DEMONSTRACAO.map((conta) => {
                  const selecionado =
                    email.trim().toLowerCase() === conta.email.toLowerCase();
                  return (
                    <button
                      key={conta.email}
                      type="button"
                      onClick={() => handleSelecionarContaDemo(conta)}
                      className={`flex items-center justify-between text-left px-3 py-2 rounded-[10px] border text-xs transition-all cursor-pointer ${
                        selecionado
                          ? "bg-primary/10 border-primary/40 text-primary font-semibold"
                          : "bg-surface-alt/60 hover:bg-surface-highlight/60 border-border/60 text-foreground"
                      }`}
                    >
                      <div className="flex flex-col min-w-0">
                        <span className="truncate font-semibold text-foreground-heading">
                          {conta.nome}
                        </span>
                        <span className="truncate text-[11px] text-muted-foreground">
                          {conta.email}
                        </span>
                      </div>
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-card border border-border/70 text-muted-foreground shrink-0 ml-2">
                        {conta.cargo.split("•")[1]?.trim() || conta.cargo}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </form>

        {/* Rodapé do Card */}
        <footer className="flex flex-col items-center w-full pt-2">
          <p className="flex items-center gap-1.5 text-[12px] font-medium text-foreground">
            <ShieldCheck className="w-3.5 h-3.5 text-primary shrink-0" />
            <span>Ambiente Clínico Seguro • InTEA v1.0</span>
          </p>
        </footer>
      </section>
    </main>
  );
}

export default LoginPage;
