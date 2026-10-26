import { useSessionStore } from "../store/sessionStore";
import { useSessionSocket, type UseSessionSocketReturn } from "@/core/web.socket";

/**
 * ============================================================================
 * HOOK DE SINCRONIZAÇÃO: WebSocket ↔ SessionStore
 * Sincroniza eventos remotos em tempo real com o estado global do Zustand
 * ============================================================================
 */

/**
 * Connects WebSocket event lifecycle with Zustand SessionStore.
 * Handles device presence, disconnections, and operational session events.
 *
 * @returns Active socket client instance with emission methods and connection status.
 */
export function useSessionSync(): UseSessionSocketReturn {
  const sessionToken = useSessionStore((state) => state.pareamento?.sessionToken);
  const confirmarConexao = useSessionStore((state) => state.confirmarConexaoDispositivo);
  const notificarDesconexao = useSessionStore((state) => state.notificarDesconexaoDispositivo);
  const setErro = useSessionStore((state) => state.setErro);

  const socket = useSessionSocket({
    sessionToken: sessionToken || null,
    autoConnect: Boolean(sessionToken),
    onDispositivoConectado: (dispositivo) => {
      confirmarConexao(dispositivo);
    },
    onDispositivoDesconectado: () => {
      notificarDesconexao();
    },
    onErroSessao: (erro) => {
      setErro(erro.mensagem);
    },
  });

  return socket;
}
