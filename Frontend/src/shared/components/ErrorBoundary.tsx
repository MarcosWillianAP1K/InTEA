import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";
import { Button } from "@/shared/components/ui/button";

export interface ErrorBoundaryProps {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackDescription?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Global/Layout Error Boundary (RNF07, Resiliência Clínica).
 * Previne a temida tela 100% branca (White Screen of Death) capturando
 * erros inesperados em qualquer componente e fornecendo interface de recuperação amigável.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error("[InTEA ErrorBoundary] Erro capturado na árvore de componentes:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  private handleGoHome = () => {
    window.location.href = "/painel";
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          data-testid="error-boundary-fallback"
          className="flex min-h-[360px] flex-1 flex-col items-center justify-center p-6 text-center"
        >
          <div className="w-full max-w-md rounded-2xl border border-destructive/30 bg-card p-6 shadow-sm">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <AlertTriangle className="h-6 w-6" />
            </div>

            <h2 className="text-lg font-bold text-foreground">
              {this.props.fallbackTitle || "Ops! Ocorreu uma instabilidade nesta tela"}
            </h2>

            <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
              {this.props.fallbackDescription ||
                "Não foi possível renderizar esta seção do sistema clínico. Você pode tentar recarregar ou retornar ao painel principal."}
            </p>

            {this.state.error?.message && (
              <pre className="mt-4 max-h-32 overflow-auto rounded-lg bg-muted p-2.5 text-left text-[11px] text-destructive wrap-break-word">
                {this.state.error.message}
              </pre>
            )}

            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={this.handleReset}
                className="min-h-11 gap-1.5 text-xs font-semibold cursor-pointer"
              >
                <RotateCcw className="h-4 w-4" />
                <span>Tentar novamente</span>
              </Button>

              <Button
                type="button"
                size="sm"
                onClick={this.handleGoHome}
                className="min-h-11 gap-1.5 text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer"
              >
                <Home className="h-4 w-4" />
                <span>Voltar ao Início</span>
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
