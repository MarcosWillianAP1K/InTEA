export function PainelPage() {
  return (
    <div className="flex flex-1 flex-col gap-6 overflow-x-hidden">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Painel de Controle
        </h1>
        <p className="text-sm text-muted-foreground">
          Visão geral das intervenções clínicas, sessões recentes e alertas dos pacientes.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl border border-border bg-card flex flex-col gap-2 shadow-xs">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Sessões Realizadas
          </span>
          <span className="text-3xl font-extrabold text-[#0b3294] dark:text-blue-400">
            24
          </span>
          <span className="text-xs text-muted-foreground">
            +12% em relação à semana anterior
          </span>
        </div>

        <div className="p-5 rounded-2xl border border-border bg-card flex flex-col gap-2 shadow-xs">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Pacientes Ativos
          </span>
          <span className="text-3xl font-extrabold text-[#0b3294] dark:text-blue-400">
            8
          </span>
          <span className="text-xs text-muted-foreground">
            Todos com planos de intervenção ativos
          </span>
        </div>

        <div className="p-5 rounded-2xl border border-border bg-card flex flex-col gap-2 shadow-xs">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Jogos Disponíveis
          </span>
          <span className="text-3xl font-extrabold text-[#0b3294] dark:text-blue-400">
            3
          </span>
          <span className="text-xs text-muted-foreground">
            Com telemetria e DDA integrados
          </span>
        </div>
      </div>
    </div>
  );
}

export default PainelPage;
