import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { NavHeader } from "../components/nav-header";
import { NavProjects } from "../components/nav-projects";
import { NavUser } from "../components/nav-user";
import { SidebarProvider } from "@/shared/components/ui/sidebar";
import { LayoutDashboard, Gamepad2, Users, History } from "lucide-react";

describe("Dashboard Components", () => {
  it("deve renderizar o cabeçalho de navegação (NavHeader)", () => {
    render(
      <MemoryRouter>
        <SidebarProvider>
          <NavHeader />
        </SidebarProvider>
      </MemoryRouter>
    );

    expect(screen.getByText("InTEA")).toBeDefined();
    expect(screen.getByText("Clinical Orchestration")).toBeDefined();
  });

  it("deve renderizar os links do menu principal (NavProjects)", () => {
    const projects = [
      { name: "Dashboard", url: "/", icon: LayoutDashboard },
      { name: "Games", url: "/games", icon: Gamepad2 },
      { name: "Meus Pacientes", url: "/patients", icon: Users },
      { name: "Historico", url: "/history", icon: History },
    ];

    render(
      <MemoryRouter>
        <SidebarProvider>
          <NavProjects projects={projects} />
        </SidebarProvider>
      </MemoryRouter>
    );

    expect(screen.getByText("Dashboard")).toBeDefined();
    expect(screen.getByText("Games")).toBeDefined();
    expect(screen.getByText("Meus Pacientes")).toBeDefined();
    expect(screen.getByText("Historico")).toBeDefined();
  });

  it("deve renderizar as informações do usuário (NavUser)", () => {
    const user = {
      name: "Dr. Marina Silva",
      email: "marina@intea.com.br",
      avatar: "/avatar.jpg",
    };

    render(
      <SidebarProvider>
        <NavUser user={user} />
      </SidebarProvider>
    );

    expect(screen.getByText("Dr. Marina Silva")).toBeDefined();
    expect(screen.getByText("marina@intea.com.br")).toBeDefined();
  });
});
