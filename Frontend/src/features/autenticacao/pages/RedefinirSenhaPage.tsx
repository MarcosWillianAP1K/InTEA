/**
 * ============================================================================
 * TELA DE REDEFINIÇÃO DE SENHA — InTEA
 * Fluxo de Redefinição via Link Mágico Expirável (RF01, RNF03).
 * Captura o token efêmero e atualiza as credenciais do terapeuta no Supabase.
 * ============================================================================
 */

import { useState, useEffect, type FormEvent } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import {
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Loader2,
  KeyRound,
  ArrowLeft,
} from "lucide-react";
import { authService } from "../services/auth.service";

export function RedefinirSenhaPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [token, setToken] = useState<string | null>(null);
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);

  // Extrai o token efêmero da URL (seja via fragmento hash do Supabase #access_token=... ou query params ?token=...)
  useEffect(() => {
    // 1. Tenta extrair da query string (?token=... ou ?code=...)
    const queryToken = searchParams.get("token") || searchParams.get("code");
    if (queryToken) {
      setToken(queryToken);
      return;
    }

    // 2. Tenta extrair do fragmento hash (#access_token=...&type=recovery)
    if (typeof window !== "undefined" && window.location.hash) {
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const hashToken = hashParams.get("access_token") || hashParams.get("token");
      if (hashToken) {
        setToken(hashToken);
        return;
      }
    }

    // Caso não encontre nenhum token na URL
    setToken(null);
  }, [searchParams]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErro(null);

    if (!token) {
      setErro("Link de recuperação inválido ou ausente. Solicite um novo link.");
      return;
    }

    if (!novaSenha || novaSenha.trim().length < 6) {
      setErro("A nova senha deve conter no mínimo 6 caracteres.");
      return;
    }

    if (novaSenha !== confirmarSenha) {
      setErro("As senhas digitadas não coincidem. Verifique e tente novamente.");
      return;
    }

    setLoading(true);

    try {
      const resposta = await authService.redefinirSenha({
        token: token.trim(),
        novaSenha: novaSenha.trim(),
      });

      setSucesso(
        resposta.message ||
          "Sua senha foi redefinida com sucesso! Redirecionando para o login...",
      );

      // Redireciona para o login após 2.5 segundos
      setTimeout(() => {
        navigate("/login", { replace: true });
      }, 2500);
    } catch (err: unknown) {
      const mensagem =
        err instanceof Error
          ? err.message
          : "Erro ao redefinir senha. O link pode ter expirado.";

      if (
        mensagem.toLowerCase().includes("expirou") ||
        mensagem.toLowerCase().includes("inválido") ||
        mensagem.toLowerCase().includes("expired")
      ) {
        setErro(
          "Este link de recuperação expirou ou já foi utilizado. Solicite um novo link na página de login.",
        );
      } else {
        setErro(mensagem);
      }
    } finally {
      setLoading(false);
    }
  }

  const tokenInvalidoOuAusente = token === null;

  return (
    <main
      data-testid="redefinir-senha-page"
      className="min-h-screen w-full flex flex-row justify-center items-center p-6 md:p-10 bg-background-auth"
    >
      <section className="flex flex-col gap-8 md:gap-10 pt-12 md:pt-16 px-8 md:px-16 pb-8 w-full max-w-120 rounded-2xl bg-card shadow-lg border border-border/60">
        {/* Cabeçalho */}
        <header className="flex flex-col gap-2 items-center text-center">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-1">
            <KeyRound className="w-6 h-6" />
          </div>
          <h1 className="text-[32px] leading-tight font-bold text-foreground tracking-tight select-none">
            Redefinir Senha
          </h1>
          <p className="text-[14px] text-muted-foreground">
            Crie uma nova credencial segura para seu acesso clínico
          </p>
        </header>

        {/* Feedback de Sucesso */}
        {sucesso ? (
          <div className="flex flex-col items-center gap-4 text-center py-4">
            <div className="w-14 h-14 rounded-full bg-green-500/10 text-green-600 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div className="flex flex-col gap-1">
              <h3 className="text-base font-semibold text-foreground">
                Senha Atualizada!
              </h3>
              <p className="text-xs text-muted-foreground">{sucesso}</p>
            </div>
            <Link
              to="/login"
              className="mt-2 text-xs font-medium text-primary hover:underline flex items-center gap-1.5"
            >
              Ir para o Login agora <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        ) : (
          /* Formulário de Redefinição */
          <form onSubmit={handleSubmit} className="flex flex-col gap-5 w-full">
            {/* Aviso se o link não tiver token */}
            {tokenInvalidoOuAusente && (
              <div
                role="alert"
                className="flex items-start gap-2.5 text-destructive text-xs font-medium bg-destructive/10 border border-destructive/20 rounded-[10px] p-3"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  Nenhum token de recuperação válido foi encontrado na URL.
                  Certifique-se de acessar pelo link enviado no seu e-mail.
                </span>
              </div>
            )}

            {/* Campo 1 - Nova Senha */}
            <div className="flex flex-row justify-between items-center gap-3 w-full px-4 py-3.5 rounded-[12px] bg-input border border-transparent focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-primary/15 transition-all">
              <Lock className="w-5 h-5 text-muted-foreground shrink-0" />
              <input
                id="novaSenha"
                name="novaSenha"
                type={mostrarSenha ? "text" : "password"}
                autoComplete="new-password"
                placeholder="Nova Senha (mínimo 6 caracteres)"
                aria-label="Nova Senha"
                value={novaSenha}
                onChange={(e) => {
                  setNovaSenha(e.target.value);
                  if (erro) setErro(null);
                }}
                disabled={tokenInvalidoOuAusente || loading}
                required
                className="w-full bg-transparent text-[14px] text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
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

            {/* Campo 2 - Confirmar Senha */}
            <div className="flex flex-row justify-between items-center gap-3 w-full px-4 py-3.5 rounded-[12px] bg-input border border-transparent focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-primary/15 transition-all">
              <Lock className="w-5 h-5 text-muted-foreground shrink-0" />
              <input
                id="confirmarSenha"
                name="confirmarSenha"
                type={mostrarSenha ? "text" : "password"}
                autoComplete="new-password"
                placeholder="Confirme a Nova Senha"
                aria-label="Confirme a Nova Senha"
                value={confirmarSenha}
                onChange={(e) => {
                  setConfirmarSenha(e.target.value);
                  if (erro) setErro(null);
                }}
                disabled={tokenInvalidoOuAusente || loading}
                required
                className="w-full bg-transparent text-[14px] text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
            </div>

            {/* Alerta de Erro */}
            {erro && (
              <div
                role="alert"
                className="flex items-center gap-2 text-destructive text-xs font-medium bg-destructive/10 border border-destructive/20 rounded-[10px] px-3 py-2.5"
              >
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{erro}</span>
              </div>
            )}

            {/* Botão de Submissão */}
            <button
              type="submit"
              disabled={tokenInvalidoOuAusente || loading}
              className="flex flex-row justify-center items-center gap-3 w-full py-3.5 px-6 rounded-[12px] bg-[#1E40AF] hover:bg-primary active:bg-primary-active text-white text-[14px] font-semibold shadow-sm transition-all cursor-pointer disabled:opacity-50 mt-1"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Salvando nova senha...</span>
                </>
              ) : (
                <>
                  <span>Salvar Nova Senha</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {/* Link para voltar ao login */}
            <div className="flex justify-center mt-2">
              <Link
                to="/login"
                className="text-[13px] font-medium text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar para o login
              </Link>
            </div>
          </form>
        )}
      </section>
    </main>
  );
}

export default RedefinirSenhaPage;
