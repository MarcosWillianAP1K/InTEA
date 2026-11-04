import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BadgeAutoriaMultidisciplinar } from "../components/BadgeAutoriaMultidisciplinar";

describe("BadgeAutoriaMultidisciplinar (RF18, RF21, RNF07)", () => {
  const autorIdPadrao = "11111111-2222-4333-8444-555555555555";
  const colegaId = "99999999-8888-4777-8666-555555555555";

  it("deve exibir 'Sua Autoria • Editável' quando autorId coincide com usuarioLogadoId", () => {
    render(
      <BadgeAutoriaMultidisciplinar
        autorId={autorIdPadrao}
        usuarioLogadoId={autorIdPadrao}
        autorNome="Dra. Ana Beatriz"
        autorEspecialidade="Terapia Ocupacional"
        autorRegistro="CREFITO-14/123456-TO"
      />,
    );

    const badgeRoot = screen.getByTestId("badge-autoria-multidisciplinar");
    const statusBadge = screen.getByTestId("badge-autoria-status");

    expect(statusBadge.textContent).toContain("Sua Autoria • Editável");
    expect(statusBadge.className).toContain("bg-emerald-500/10");
    expect(statusBadge.className).toContain("text-emerald-700");
    expect(badgeRoot.getAttribute("aria-label")).toContain(
      "Sua Autoria • Editável",
    );
  });

  it("deve exibir 'Equipe • Somente Leitura' quando autorId diverge de usuarioLogadoId", () => {
    render(
      <BadgeAutoriaMultidisciplinar
        autorId={autorIdPadrao}
        usuarioLogadoId={colegaId}
        autorNome="Dr. Carlos Eduardo"
        autorEspecialidade="Psicologia Clínica"
        autorRegistro="CRP-21/04567"
      />,
    );

    const badgeRoot = screen.getByTestId("badge-autoria-multidisciplinar");
    const statusBadge = screen.getByTestId("badge-autoria-status");

    expect(statusBadge.textContent).toContain("Equipe • Somente Leitura");
    expect(statusBadge.className).toContain("bg-sky-500/10");
    expect(statusBadge.className).toContain("text-sky-700");
    expect(badgeRoot.getAttribute("aria-label")).toContain(
      "Equipe • Somente Leitura",
    );
  });

  it("deve exibir 'Equipe • Somente Leitura' quando usuarioLogadoId ou autorId não forem informados", () => {
    const { rerender } = render(
      <BadgeAutoriaMultidisciplinar
        autorId={autorIdPadrao}
        autorNome="Dra. Helena Costa"
      />,
    );

    expect(screen.getByTestId("badge-autoria-status").textContent).toContain(
      "Equipe • Somente Leitura",
    );

    rerender(
      <BadgeAutoriaMultidisciplinar
        autorId={null}
        usuarioLogadoId={null}
        autorNome="Dra. Helena Costa"
      />,
    );

    expect(screen.getByTestId("badge-autoria-status").textContent).toContain(
      "Equipe • Somente Leitura",
    );
  });

  it("deve exibir nome, especialidade e registro profissional (CREFITO/CRP) corretamente", () => {
    render(
      <BadgeAutoriaMultidisciplinar
        autorId={autorIdPadrao}
        usuarioLogadoId={autorIdPadrao}
        autorNome="Dra. Marina Alves"
        autorEspecialidade="Fonoaudiologia"
        autorRegistro="CREFITO-14/98765-F"
      />,
    );

    expect(screen.getByTestId("badge-autoria-nome").textContent).toBe(
      "Dra. Marina Alves",
    );
    expect(
      screen.getByTestId("badge-autoria-especialidade").textContent,
    ).toBe("Fonoaudiologia");
    expect(screen.getByTestId("badge-autoria-registro").textContent).toBe(
      "CREFITO-14/98765-F",
    );
  });

  it("deve usar o fallback seguro 'Especialista da Equipe' quando autorNome for omitido, vazio ou UUID bruto, sem vazar UUID no DOM", () => {
    const { container, rerender } = render(
      <BadgeAutoriaMultidisciplinar
        autorId={autorIdPadrao}
        usuarioLogadoId={colegaId}
        autorNome="   "
      />,
    );

    expect(screen.getByTestId("badge-autoria-nome").textContent).toBe(
      "Especialista da Equipe",
    );
    expect(container.textContent).not.toContain(autorIdPadrao);
    expect(container.textContent).not.toContain(colegaId);

    rerender(
      <BadgeAutoriaMultidisciplinar
        autorId={autorIdPadrao}
        usuarioLogadoId={colegaId}
        autorNome={autorIdPadrao}
      />,
    );

    expect(screen.getByTestId("badge-autoria-nome").textContent).toBe(
      "Especialista da Equipe",
    );
    expect(container.textContent).not.toContain(autorIdPadrao);
  });

  it("deve suportar as variantes de tamanho size='md' (padrão) e size='sm' (compacto)", () => {
    const { rerender } = render(
      <BadgeAutoriaMultidisciplinar
        autorId={autorIdPadrao}
        usuarioLogadoId={autorIdPadrao}
        autorNome="Dr. Lucas"
      />,
    );

    const badgePadrao = screen.getByTestId("badge-autoria-multidisciplinar");
    expect(badgePadrao.getAttribute("data-size")).toBe("md");
    expect(badgePadrao.className).toContain("gap-2");
    expect(badgePadrao.className).toContain("text-sm");

    rerender(
      <BadgeAutoriaMultidisciplinar
        autorId={autorIdPadrao}
        usuarioLogadoId={autorIdPadrao}
        autorNome="Dr. Lucas"
        size="sm"
      />,
    );

    const badgeCompacto = screen.getByTestId("badge-autoria-multidisciplinar");
    expect(badgeCompacto.getAttribute("data-size")).toBe("sm");
    expect(badgeCompacto.className).toContain("gap-1.5");
    expect(badgeCompacto.className).toContain("text-xs");
  });

  it("nunca deve renderizar o termo proibido 'Co-Terapeuta' em nenhum estado do componente", () => {
    const { container, rerender } = render(
      <BadgeAutoriaMultidisciplinar
        autorId={autorIdPadrao}
        usuarioLogadoId={colegaId}
      />,
    );

    expect(container.innerHTML).not.toMatch(/co-?terapeuta/i);

    rerender(
      <BadgeAutoriaMultidisciplinar
        autorId={autorIdPadrao}
        usuarioLogadoId={autorIdPadrao}
      />,
    );

    expect(container.innerHTML).not.toMatch(/co-?terapeuta/i);
  });
});
