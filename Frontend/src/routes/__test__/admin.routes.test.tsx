import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { SuperAdminGuard } from "../admin.routes";
import { useAuthStore } from "@/features/autenticacao/store/authStore";

describe("Rotas Administrativas: SuperAdminGuard (RF07 / RF08)", () => {
  beforeEach(() => {
    useAuthStore.getState().limparSessao();
  });

  it("deve redirecionar para /login caso o usuário NÃO esteja autenticado", () => {
    useAuthStore.setState({
      isAuthenticated: false,
      user: null,
      tokens: null,
    });

    render(
      <MemoryRouter initialEntries={["/admin/auditoria"]}>
        <Routes>
          <Route path="/login" element={<div>Tela de Login</div>} />
          <Route element={<SuperAdminGuard />}>
            <Route path="/admin/auditoria" element={<div>Painel de Auditoria</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText("Tela de Login")).toBeDefined();
    expect(screen.queryByText("Painel de Auditoria")).toBeNull();
  });

  it("deve redirecionar terapeuta comum (sem flag is_super_admin) para /painel", () => {
    useAuthStore.setState({
      isAuthenticated: true,
      user: {
        id: "t1111111-1111-4111-8111-111111111111",
        nome: "Dr. Terapeuta Comum",
        email: "terapeuta@intea.com.br",
        clinica_id: "c1111111-1111-4111-8111-111111111111",
        is_super_admin: false,
        status_ativo: true,
        role: "terapeuta",
      },
      tokens: {
        access_token: "mock-token",
        refresh_token: null,
        token_type: "Bearer",
        expires_in: 3600,
      },
    });

    render(
      <MemoryRouter initialEntries={["/admin/auditoria"]}>
        <Routes>
          <Route path="/painel" element={<div>Dashboard do Terapeuta</div>} />
          <Route element={<SuperAdminGuard />}>
            <Route path="/admin/auditoria" element={<div>Painel de Auditoria</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText("Dashboard do Terapeuta")).toBeDefined();
    expect(screen.queryByText("Painel de Auditoria")).toBeNull();
  });

  it("deve autorizar e exibir o painel administrativo quando o usuário possuir is_super_admin = true", () => {
    useAuthStore.setState({
      isAuthenticated: true,
      user: {
        id: "admin-uuid-1234",
        nome: "Administrador Global",
        email: "admin@intea.com.br",
        clinica_id: "c1111111-1111-4111-8111-111111111111",
        is_super_admin: true,
        status_ativo: true,
        role: "terapeuta",
      },
      tokens: {
        access_token: "mock-token-admin",
        refresh_token: null,
        token_type: "Bearer",
        expires_in: 3600,
      },
    });

    render(
      <MemoryRouter initialEntries={["/admin/auditoria"]}>
        <Routes>
          <Route path="/painel" element={<div>Dashboard do Terapeuta</div>} />
          <Route element={<SuperAdminGuard />}>
            <Route path="/admin/auditoria" element={<div>Painel de Auditoria SuperAdmin</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText("Painel de Auditoria SuperAdmin")).toBeDefined();
    expect(screen.queryByText("Dashboard do Terapeuta")).toBeNull();
  });

  it("deve autorizar quando o usuário possuir role = 'super_admin'", () => {
    useAuthStore.setState({
      isAuthenticated: true,
      user: {
        id: "admin-uuid-5678",
        nome: "SuperAdmin Institucional",
        email: "superadmin@intea.com.br",
        clinica_id: "c1111111-1111-4111-8111-111111111111",
        is_super_admin: false,
        status_ativo: true,
        role: "super_admin",
      },
      tokens: {
        access_token: "mock-token-admin-role",
        refresh_token: null,
        token_type: "Bearer",
        expires_in: 3600,
      },
    });

    render(
      <MemoryRouter initialEntries={["/admin/auditoria"]}>
        <Routes>
          <Route path="/painel" element={<div>Dashboard do Terapeuta</div>} />
          <Route element={<SuperAdminGuard />}>
            <Route path="/admin/auditoria" element={<div>Área Restrita Auditada</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText("Área Restrita Auditada")).toBeDefined();
  });
});
