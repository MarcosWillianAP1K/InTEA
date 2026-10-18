import { UserPlus } from "lucide-react";

/**
 * ============================================================================
 * COMPONENTE CARD ADICIONAR PACIENTE (InTEA)
 * Figma: 'Card add paciente' (Node ID: '67:1617')
 * Conformidade: RF06 (Cadastro de Paciente), Acessibilidade WCAG 2.1
 * TypeScript Estrito: Sem uso de `any`
 * ============================================================================
 */

export interface CardAdicionarPacienteProps {
  onClick: () => void;
  className?: string;
}

export function CardAdicionarPaciente({
  onClick,
  className = "",
}: CardAdicionarPacienteProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      data-testid="card-adicionar-paciente"
      onClick={onClick}
      onKeyDown={handleKeyDown}
      className={`group flex flex-col justify-center items-center gap-3 px-6 py-12 rounded-2xl bg-surface-highlight/70 dark:bg-surface-highlight/20 border-2 border-dashed border-border-neutral hover:border-primary hover:bg-border-subtle/50 transition-all cursor-pointer min-h-[300px] select-none shadow-2xs hover:shadow-md ${className}`}
    >
      {/* ÍCONE DE NOVO PACIENTE (Figma: 'Background+Shadow' com Vector) */}
      <div className="flex items-center justify-center rounded-full bg-white dark:bg-card p-4 shadow-sm group-hover:scale-110 group-hover:shadow-md transition-all">
        <UserPlus className="h-8 w-8 text-primary stroke-[2.2]" />
      </div>

      {/* TEXTOS (Figma: 'Text' -> 'Novo Paciente' e 'Cadastrar no sistema') */}
      <div className="flex flex-col items-center text-center mt-1">
        <span className="text-xl sm:text-2xl font-bold text-primary tracking-tight">
          Novo Paciente
        </span>
        <span className="text-sm sm:text-base font-normal text-foreground mt-0.5">
          Cadastrar no sistema
        </span>
      </div>
    </div>
  );
}

export const AddPatientCard = CardAdicionarPaciente;
export default CardAdicionarPaciente;
