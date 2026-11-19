import { useEffect, useState } from "react";
import { cn } from "@/shared/lib/utils";

export interface AvatarClinicoProps {
  nome?: string | null;
  src?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  shape?: "circle" | "rounded";
  className?: string;
  "data-testid"?: string;
}

const TAMANHOS_CANONICOS: Record<NonNullable<AvatarClinicoProps["size"]>, string> = {
  sm: "size-8 text-xs",
  md: "size-10 text-xs",
  lg: "size-14 text-base",
  xl: "size-20 text-xl",
};

const FORMAS_CANONICAS: Record<NonNullable<AvatarClinicoProps["shape"]>, string> = {
  circle: "rounded-full",
  rounded: "rounded-xl",
};

/**
 * Extracts up to two uppercase initials from a name, stripping honorific prefixes like "Dr." / "Dra.".
 */
export function extrairIniciais(nome?: string | null): string {
  if (!nome || typeof nome !== "string") return "?";

  const semPrefixo = nome
    .trim()
    .replace(/^(dr\.?|dra\.?)\s+/i, "")
    .trim();

  if (!semPrefixo) return "?";

  const partes = semPrefixo.split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "?";
  if (partes.length === 1) {
    return partes[0].slice(0, 2).toUpperCase();
  }

  return `${partes[0][0]}${partes[partes.length - 1][0]}`.toUpperCase();
}

/**
 * Renders initials immediately on first paint and progressively reveals the profile image only after load,
 * falling back cleanly to initials if the source is missing or fails to load.
 */
export function AvatarClinico({
  nome,
  src,
  size = "md",
  shape = "circle",
  className,
  "data-testid": testId,
}: AvatarClinicoProps) {
  const [carregado, setCarregado] = useState(false);
  const [erro, setErro] = useState(false);

  const srcLimpo = typeof src === "string" ? src.trim() : "";

  useEffect(() => {
    setCarregado(false);
    setErro(false);
  }, [srcLimpo]);

  const iniciais = extrairIniciais(nome);
  const altTexto = nome?.trim() || "Avatar";

  return (
    <div
      data-testid={testId}
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden select-none bg-primary/10 text-primary border border-primary/20 font-bold",
        TAMANHOS_CANONICOS[size],
        FORMAS_CANONICAS[shape],
        className,
      )}
    >
      <span className="leading-none tracking-tight">{iniciais}</span>

      {srcLimpo && !erro ? (
        <img
          src={srcLimpo}
          alt={altTexto}
          onLoad={() => setCarregado(true)}
          onError={() => {
            setErro(true);
            setCarregado(false);
          }}
          className={cn(
            "absolute inset-0 size-full object-cover transition-opacity duration-200",
            carregado ? "opacity-100" : "opacity-0",
          )}
        />
      ) : null}
    </div>
  );
}

export default AvatarClinico;
