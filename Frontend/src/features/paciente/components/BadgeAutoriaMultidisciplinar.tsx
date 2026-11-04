import { Lock, UserCheck, ShieldCheck } from "lucide-react";

export interface BadgeAutoriaMultidisciplinarProps {
  autorId?: string | null;
  autorNome?: string | null;
  autorEspecialidade?: string | null;
  autorRegistro?: string | null;
  usuarioLogadoId?: string | null;
  size?: "sm" | "md";
  className?: string;
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function resolverNomeAutor(autorNome?: string | null): string {
  const limpo = autorNome?.trim() ?? "";
  if (!limpo || UUID_REGEX.test(limpo)) {
    return "Especialista da Equipe";
  }
  return limpo;
}

/**
 * Componente atômico puro para identificação visual de autoria multidisciplinar
 * e indicação semântica de permissão de escrita em registros compartilhados (RF18, RF21, RNF07).
 */
export function BadgeAutoriaMultidisciplinar({
  autorId,
  autorNome,
  autorEspecialidade,
  autorRegistro,
  usuarioLogadoId,
  size = "md",
  className = "",
}: BadgeAutoriaMultidisciplinarProps) {
  const usuarioNormalizado = usuarioLogadoId?.trim() ?? "";
  const autorNormalizado = autorId?.trim() ?? "";

  const ehPropriaAutoria = Boolean(
    usuarioNormalizado &&
      autorNormalizado &&
      usuarioNormalizado === autorNormalizado,
  );

  const nomeExibicao = resolverNomeAutor(autorNome);
  const especialidadeLimpa = autorEspecialidade?.trim() || null;
  const registroLimpo = autorRegistro?.trim() || null;

  const rotuloStatus = ehPropriaAutoria
    ? "Sua Autoria • Editável"
    : "Equipe • Somente Leitura";

  const credenciaisDescricao = [especialidadeLimpa, registroLimpo]
    .filter(Boolean)
    .join(" - ");

  const ariaLabel = credenciaisDescricao
    ? `Autor: ${nomeExibicao} (${credenciaisDescricao}). Status de permissão: ${rotuloStatus}`
    : `Autor: ${nomeExibicao}. Status de permissão: ${rotuloStatus}`;

  const isSmall = size === "sm";

  return (
    <div
      data-testid="badge-autoria-multidisciplinar"
      data-size={size}
      aria-label={ariaLabel}
      className={`inline-flex flex-wrap items-center ${
        isSmall ? "gap-1.5 text-xs" : "gap-2 text-sm"
      } ${className}`.trim()}
    >
      <div
        className={`inline-flex flex-wrap items-center ${
          isSmall ? "gap-1" : "gap-1.5"
        } text-foreground wrap-break-word`}
      >
        <ShieldCheck
          className={`${
            isSmall ? "h-3.5 w-3.5" : "h-4 w-4"
          } shrink-0 text-primary`}
          aria-hidden="true"
        />
        <span
          data-testid="badge-autoria-nome"
          className={`font-semibold tracking-tight text-foreground ${
            isSmall ? "text-xs" : "text-sm"
          }`}
        >
          {nomeExibicao}
        </span>

        {registroLimpo && (
          <span
            data-testid="badge-autoria-registro"
            className="rounded bg-muted/70 px-1.5 py-0.5 text-xs font-medium text-foreground/85"
          >
            {registroLimpo}
          </span>
        )}

        {especialidadeLimpa && (
          <span
            data-testid="badge-autoria-especialidade"
            className="text-xs italic text-muted-foreground"
          >
            {especialidadeLimpa}
          </span>
        )}
      </div>

      <span
        data-testid="badge-autoria-status"
        className={`inline-flex items-center gap-1 rounded-full border font-medium transition-colors ${
          isSmall ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-xs"
        } ${
          ehPropriaAutoria
            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
            : "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300"
        }`}
      >
        {ehPropriaAutoria ? (
          <UserCheck className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        ) : (
          <Lock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        )}
        <span>{rotuloStatus}</span>
      </span>
    </div>
  );
}

export default BadgeAutoriaMultidisciplinar;
