import React, { useState } from "react";
import { Bell, CheckCheck, Clock, ShieldAlert, Sparkles, UserCheck } from "lucide-react";
import { cn } from "@/shared/lib/utils";

export interface NotificacaoItem {
  id: string;
  titulo: string;
  mensagem: string;
  data: string;
  lida: boolean;
  tipo: "alerta" | "sistema" | "sessao" | "paciente";
}

const NOTIFICACOES_INICIAIS: NotificacaoItem[] = [
  {
    id: "notif-1",
    titulo: "Sessão Concluída com Sucesso",
    mensagem: "O paciente Lucas Pereira finalizou a sessão no jogo Aventura das Cores com 92% de engajamento.",
    data: "Há 15 minutos",
    lida: false,
    tipo: "sessao",
  },
  {
    id: "notif-2",
    titulo: "Adaptação DDA Recomendada",
    mensagem: "O motor de IA sugere aumentar o tempo de resposta nas atividades de pareamento sensorial.",
    data: "Há 2 horas",
    lida: false,
    tipo: "sistema",
  },
  {
    id: "notif-3",
    titulo: "Atualização de Prontuário",
    mensagem: "Nova anotação clínica registrada para a paciente Sofia Martins.",
    data: "Ontem às 16:40",
    lida: true,
    tipo: "paciente",
  },
  {
    id: "notif-4",
    titulo: "Alerta de Dispositivo",
    mensagem: "O tablet de intervenção apresentou nível de bateria abaixo de 20%.",
    data: "18 Out 11:20",
    lida: true,
    tipo: "alerta",
  },
];

interface OverlayNotificacoesProps {
  aberto: boolean;
  onFechar: () => void;
}

export const OverlayNotificacoes: React.FC<OverlayNotificacoesProps> = ({ aberto, onFechar }) => {
  const [notificacoes, setNotificacoes] = useState<NotificacaoItem[]>(NOTIFICACOES_INICIAIS);

  if (!aberto) return null;

  const marcarTodasComoLidas = () => {
    setNotificacoes((prev) => prev.map((n) => ({ ...n, lida: true })));
  };

  const alternarLeitura = (id: string) => {
    setNotificacoes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, lida: !n.lida } : n))
    );
  };

  const naoLidas = notificacoes.filter((n) => !n.lida).length;

  const obterIconeTipo = (tipo: NotificacaoItem["tipo"]) => {
    switch (tipo) {
      case "alerta":
        return <ShieldAlert className="h-4 w-4 text-amber-500" />;
      case "sistema":
        return <Sparkles className="h-4 w-4 text-[#2170E4]" />;
      case "paciente":
        return <UserCheck className="h-4 w-4 text-emerald-500" />;
      case "sessao":
      default:
        return <Clock className="h-4 w-4 text-indigo-500" />;
    }
  };

  return (
    <>
      {/* Backdrop transparente para clique fora */}
      <div className="fixed inset-0 z-40" onClick={onFechar} />

      {/* Caixa de Notificações - Figma Frame 203:2241 */}
      <div
        className={cn(
          "absolute right-0 top-12 z-50 w-96 max-w-[calc(100vw-2rem)]",
          "rounded-2xl border border-[#2170E4]/30 bg-[#FEFCFF] dark:bg-slate-900 dark:border-slate-700",
          "shadow-2xl shadow-blue-500/10 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        )}
      >
        {/* Cabeçalho */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#2170E4]/20 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-[#2170E4]" />
            <h3 className="font-semibold text-sm text-slate-800 dark:text-slate-100">
              Notificações
            </h3>
            {naoLidas > 0 && (
              <span className="px-1.5 py-0.5 text-xs font-semibold rounded-full bg-[#2170E4] text-white">
                {naoLidas}
              </span>
            )}
          </div>
          {naoLidas > 0 && (
            <button
              onClick={marcarTodasComoLidas}
              className="text-xs text-[#2170E4] hover:text-[#174ebb] dark:text-blue-400 font-medium flex items-center gap-1 transition-colors"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Marcar lidas
            </button>
          )}
        </div>

        {/* Lista de Notificações */}
        <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
          {notificacoes.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">
              Nenhuma notificação no momento.
            </div>
          ) : (
            notificacoes.map((item) => (
              <div
                key={item.id}
                onClick={() => alternarLeitura(item.id)}
                className={cn(
                  "p-3.5 text-left transition-colors cursor-pointer flex gap-3",
                  item.lida
                    ? "bg-transparent opacity-75 hover:bg-slate-50 dark:hover:bg-slate-800/40"
                    : "bg-blue-50/40 dark:bg-blue-950/20 hover:bg-blue-50/70"
                )}
              >
                <div className="mt-0.5 p-1.5 rounded-lg bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700 h-fit">
                  {obterIconeTipo(item.tipo)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                      {item.titulo}
                    </p>
                    {!item.lida && (
                      <span className="h-2 w-2 rounded-full bg-[#2170E4] flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                    {item.mensagem}
                  </p>
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    {item.data}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
};
