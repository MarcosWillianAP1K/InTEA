import { useEffect, useCallback } from "react";
import { useSessionStore } from "../store/sessionStore";
import { SessionSocketManager } from "@/core/web.socket";
import type { SessionState } from "../types";

export const SESSION_STORAGE_KEY = "intea_active_session";

export interface DadosPersistenciaSessao {
  status: SessionState["status"];
  config: SessionState["config"];
  pareamento: SessionState["pareamento"];
  dataHoraInicio?: string | null;
  nivelDdaAtual?: number;
  isPausado?: boolean;
  salvoEm: string;
}

/**
 * ============================================================================
 * HOOK: useSessionPersistence (Front-end 2 — Luma Maiara)
 * Requisitos: RNF04 (Resiliência), Usabilidade (Proteção contra Refresh F5)
 * ============================================================================
 */
export function useSessionPersistence() {
  const status = useSessionStore((state) => state.status);
  const config = useSessionStore((state) => state.config);
  const pareamento = useSessionStore((state) => state.pareamento);
  const dataHoraInicio = useSessionStore((state) => state.dataHoraInicio);
  const nivelDdaAtual = useSessionStore((state) => state.nivelDdaAtual);
  const isPausado = useSessionStore((state) => state.isPausado);
  const restaurarSessao = useSessionStore((state) => state.restaurarSessao);

  // 1. Hidratação inicial ao montar (ex: após F5)
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const salvo = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (salvo && status === "ocioso") {
        const parsed: DadosPersistenciaSessao = JSON.parse(salvo);
        if (parsed.status === "em_andamento" || parsed.status === "pareado") {
          restaurarSessao({
            status: parsed.status,
            config: parsed.config,
            pareamento: parsed.pareamento,
            dataHoraInicio: parsed.dataHoraInicio,
            nivelDdaAtual: parsed.nivelDdaAtual ?? 1,
            isPausado: parsed.isPausado ?? false,
          });

          // Reconecta socket à sala se houver token
          const token = parsed.pareamento?.sessionToken;
          if (token) {
            const manager = SessionSocketManager.getInstance();
            manager.entrarSala(token);
          }
        }
      }
    } catch {
      // Falha graciosa na recuperação do sessionStorage
    }
  }, [status, restaurarSessao]);

  // 2. Persistência contínua durante estados ativos
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      if (status === "em_andamento" || status === "pareado") {
        const payload: DadosPersistenciaSessao = {
          status,
          config,
          pareamento,
          dataHoraInicio,
          nivelDdaAtual,
          isPausado,
          salvoEm: new Date().toISOString(),
        };
        window.sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(payload));
      } else if (status === "finalizada" || status === "cancelada" || status === "expirada") {
        window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
      }
    } catch {
      // Falha graciosa ao gravar
    }
  }, [status, config, pareamento, dataHoraInicio, nivelDdaAtual, isPausado]);

  // 3. Alerta de beforeunload se a sessão estiver em andamento
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (status === "em_andamento") {
        event.preventDefault();
        event.returnValue = "Uma sessão clínica está em andamento. Deseja realmente sair?";
        return event.returnValue;
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [status]);

  const limparPersistencia = useCallback(() => {
    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
    }
  }, []);

  return {
    limparPersistencia,
    isSessaoPersistida: Boolean(
      typeof window !== "undefined" && window.sessionStorage.getItem(SESSION_STORAGE_KEY)
    ),
  };
}
