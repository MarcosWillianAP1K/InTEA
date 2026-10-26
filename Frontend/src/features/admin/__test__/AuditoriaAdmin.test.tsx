import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { TabelaAuditoria } from "../components/TabelaAuditoria";
import { AuditoriaAdminPage } from "../pages/AuditoriaAdminPage";
import {
  auditoriaAdminService,
  MOCK_EVENTOS_AUDITORIA,
} from "../services/auditoriaAdmin.service";
import { useAuthStore } from "@/features/autenticacao/store/authStore";

describe("Frontend: Auditoria Administrativa (RF07 / RF08)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    useAuthStore.setState({
      isAuthenticated: true,
      user: {
        id: "admin-uuid",
        nome: "Super Administrador",
        email: "superadmin@intea.com.br",
        clinica_id: "c1111111-1111-4111-8111-111111111111",
        is_super_admin: true,
        status_ativo: true,
        role: "super_admin",
      },
      tokens: {
        access_token: "token-admin",
        refresh_token: null,
        token_type: "Bearer",
        expires_in: 3600,
      },
    });
  });

  describe("auditoriaAdminService", () => {
    it("deve listar eventos com suporte a filtros e busca", async () => {
      const res = await auditoriaAdminService.listar({ limit: 5 });
      expect(res.data).toBeInstanceOf(Array);
      expect(res.data.length).toBeLessThanOrEqual(5);
      expect(res.total).toBe(MOCK_EVENTOS_AUDITORIA.length);
      expect(res.meta.totalPages).toBeGreaterThan(0);
    });

    it("deve filtrar eventos por ação clínica", async () => {
      const res = await auditoriaAdminService.listar({
        tipoAcao: "acesso_prontuario",
      });
      expect(res.data.every((ev) => ev.acao === "acesso_prontuario")).toBe(true);
    });

    it("deve filtrar eventos por termo de busca", async () => {
      const res = await auditoriaAdminService.listar({
        busca: "Beatriz",
      });
      expect(
        res.data.some((ev) => ev.paciente_nome?.includes("Beatriz"))
      ).toBe(true);
    });

    it("deve retornar métricas consolidadas em buscarEstatisticas", async () => {
      const stats = await auditoriaAdminService.buscarEstatisticas();
      expect(stats.totalEventos).toBeGreaterThan(0);
      expect(stats.acessosProntuario).toBeGreaterThanOrEqual(1);
      expect(stats.sessoesEIntervencoes).toBeGreaterThanOrEqual(1);
      expect(stats.alertasSeguranca).toBeGreaterThanOrEqual(1);
    });

    it("deve exportar CSV e JSON sem disparar exceções", () => {
      const createElementSpy = vi.spyOn(document, "createElement");
      const appendChildSpy = vi.spyOn(document.body, "appendChild").mockImplementation(() => document.body);
      const removeChildSpy = vi.spyOn(document.body, "removeChild").mockImplementation(() => document.body);

      // Simula URL.createObjectURL e revokeObjectURL
      window.URL.createObjectURL = vi.fn(() => "blob:mock-url");
      window.URL.revokeObjectURL = vi.fn();

      expect(() =>
        auditoriaAdminService.exportarCSV(MOCK_EVENTOS_AUDITORIA.slice(0, 2))
      ).not.toThrow();
      expect(() =>
        auditoriaAdminService.exportarJSON(MOCK_EVENTOS_AUDITORIA.slice(0, 2))
      ).not.toThrow();

      createElementSpy.mockRestore();
      appendChildSpy.mockRestore();
      removeChildSpy.mockRestore();
    });
  });

  describe("Componente: TabelaAuditoria", () => {
    it("deve renderizar colunas da tabela e registros de auditoria", () => {
      render(
        <TabelaAuditoria eventos={MOCK_EVENTOS_AUDITORIA} loading={false} />
      );

      expect(screen.getByText("Data / Hora")).toBeDefined();
      expect(screen.getByText("Terapeuta Responsável")).toBeDefined();
      expect(screen.getByText("Ação Clínica")).toBeDefined();
      expect(screen.getByText("Paciente / Sessão")).toBeDefined();
      expect(screen.getByText("Origem & IP")).toBeDefined();

      // Verifica terapeuta e paciente mock
      expect(screen.getAllByText("Dr. Marcos Terapeuta").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Lucas Gabriel Silva").length).toBeGreaterThan(0);
    });

    it("deve filtrar registros quando o usuário digita no campo de busca", async () => {
      render(
        <TabelaAuditoria eventos={MOCK_EVENTOS_AUDITORIA} loading={false} />
      );

      const inputBusca = screen.getByTestId("input-busca-auditoria");
      fireEvent.change(inputBusca, { target: { value: "Beatriz" } });

      expect(screen.getAllByText("Beatriz Helena Costa").length).toBeGreaterThan(0);
      expect(screen.queryByText("Lucas Gabriel Silva")).toBeNull();
    });

    it("deve exibir estado vazio quando a busca não encontra nenhum resultado", () => {
      render(
        <TabelaAuditoria eventos={MOCK_EVENTOS_AUDITORIA} loading={false} />
      );

      const inputBusca = screen.getByTestId("input-busca-auditoria");
      fireEvent.change(inputBusca, {
        target: { value: "TermoInexistenteXYZ999" },
      });

      expect(
        screen.getByText(
          "Nenhum registro de auditoria corresponde aos filtros selecionados."
        )
      ).toBeDefined();
    });

    it("deve acionar serviço de exportação CSV ao clicar no botão correspondente", async () => {
      const spyExportarCSV = vi.spyOn(auditoriaAdminService, "exportarCSV").mockImplementation(() => {});

      render(
        <TabelaAuditoria eventos={MOCK_EVENTOS_AUDITORIA} loading={false} />
      );

      const botaoCSV = screen.getByTestId("botao-exportar-csv");
      fireEvent.click(botaoCSV);

      expect(spyExportarCSV).toHaveBeenCalled();
    });

    it("deve acionar serviço de exportação JSON ao clicar no botão correspondente", async () => {
      const spyExportarJSON = vi.spyOn(auditoriaAdminService, "exportarJSON").mockImplementation(() => {});

      render(
        <TabelaAuditoria eventos={MOCK_EVENTOS_AUDITORIA} loading={false} />
      );

      const botaoJSON = screen.getByTestId("botao-exportar-json");
      fireEvent.click(botaoJSON);

      expect(spyExportarJSON).toHaveBeenCalled();
    });

    it("deve abrir o modal de detalhes ao clicar em uma linha da tabela", async () => {
      render(
        <TabelaAuditoria eventos={MOCK_EVENTOS_AUDITORIA} loading={false} />
      );

      const primeiraLinha = screen.getByTestId(
        `row-auditoria-${MOCK_EVENTOS_AUDITORIA[0].id}`
      );
      fireEvent.click(primeiraLinha);

      expect(
        screen.getByText("Detalhes do Evento de Auditoria")
      ).toBeDefined();
      expect(
        screen.getByText("Payload JSON (Metadados Imutáveis):")
      ).toBeDefined();
    });
  });

  describe("Página Mestre: AuditoriaAdminPage", () => {
    it("deve renderizar o cabeçalho SuperAdmin, badges e cards de métricas", async () => {
      await act(async () => {
        render(
          <MemoryRouter>
            <AuditoriaAdminPage />
          </MemoryRouter>
        );
      });

      expect(screen.getByText("Auditoria e Conformidade Clínica")).toBeDefined();
      expect(screen.getByText("Painel SuperAdmin")).toBeDefined();
      expect(screen.queryByText("RF07 / RF08")).toBeNull();
      expect(screen.getByText("Total de Eventos Auditados")).toBeDefined();
      expect(screen.getByText("Acessos a Prontuários")).toBeDefined();
      expect(screen.getByText("Sessões & DDA")).toBeDefined();
      expect(screen.getByText("Bloqueios de Acesso")).toBeDefined();
      expect(screen.queryByText(/Invariante de Imutabilidade/i)).toBeNull();
    });

    it("deve recarregar dados ao clicar no botão 'Atualizar'", async () => {
      const spyListar = vi.spyOn(auditoriaAdminService, "listar");

      await act(async () => {
        render(
          <MemoryRouter>
            <AuditoriaAdminPage />
          </MemoryRouter>
        );
      });

      const botaoAtualizar = screen.getByTestId("botao-atualizar-auditoria");
      await act(async () => {
        fireEvent.click(botaoAtualizar);
      });

      expect(spyListar).toHaveBeenCalled();
    });
  });
});
