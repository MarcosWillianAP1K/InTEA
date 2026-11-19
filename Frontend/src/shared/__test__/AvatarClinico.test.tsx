import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AvatarClinico, extrairIniciais } from "../components/AvatarClinico";

describe("AvatarClinico", () => {
  it("extrai iniciais corretamente removendo prefixos Dr./Dra.", () => {
    expect(extrairIniciais("Dr. Marcos Willian")).toBe("MW");
    expect(extrairIniciais("Dra. Ana Beatriz Souza")).toBe("AS");
    expect(extrairIniciais("Luma")).toBe("LU");
    expect(extrairIniciais("")).toBe("?");
    expect(extrairIniciais(null)).toBe("?");
  });

  it("renderiza as iniciais imediatamente mesmo quando src é informado, ocultando a imagem até onLoad", () => {
    render(
      <AvatarClinico
        nome="Dr. Marcos Willian"
        src="https://exemplo.com/avatar.jpg"
        data-testid="avatar-teste"
      />,
    );

    expect(screen.getByText("MW")).toBeDefined();
    const img = screen.getByRole("img", { name: "Dr. Marcos Willian" });
    expect(img.className).toContain("opacity-0");

    fireEvent.load(img);
    expect(img.className).toContain("opacity-100");
  });

  it("remove a tag <img> e mantém as iniciais quando ocorre erro ao carregar a imagem", () => {
    render(
      <AvatarClinico
        nome="Lucas Silva"
        src="https://exemplo.com/inexistente.png"
      />,
    );

    const img = screen.getByRole("img", { name: "Lucas Silva" });
    fireEvent.error(img);

    expect(screen.queryByRole("img")).toBeNull();
    expect(screen.getByText("LS")).toBeDefined();
  });

  it("não renderiza tag <img> quando src for null, undefined ou string vazia", () => {
    const { rerender } = render(<AvatarClinico nome="Raildom Rocha" src={null} />);
    expect(screen.queryByRole("img")).toBeNull();
    expect(screen.getByText("RR")).toBeDefined();

    rerender(<AvatarClinico nome="Raildom Rocha" src="" />);
    expect(screen.queryByRole("img")).toBeNull();
    expect(screen.getByText("RR")).toBeDefined();

    rerender(<AvatarClinico nome="Raildom Rocha" />);
    expect(screen.queryByRole("img")).toBeNull();
    expect(screen.getByText("RR")).toBeDefined();
  });
});
