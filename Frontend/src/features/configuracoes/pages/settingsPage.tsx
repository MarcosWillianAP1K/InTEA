import { useState } from "react";
import { Palette } from "lucide-react";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/shared/components/ui/breadcrumb";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "@/shared/components/ui/sidebar";

import { ConfiguracaoAparencia } from "../sections/ConfiguracaoAparencia";

const settingsNav = [
  { id: "appearance", label: "Aparência", icon: Palette },
];

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState("appearance");

  const activeNav = settingsNav.find((item) => item.id === activeTab);

  const renderContent = () => {
    switch (activeTab) {
      case "appearance":
        return <ConfiguracaoAparencia />;
      default:
        return <ConfiguracaoAparencia />;
    }
  };

  return (
    <SidebarProvider
      className="flex h-full min-h-0 items-stretch bg-background"
      style={{ minHeight: 0 }}
    >
      <Sidebar
        collapsible="none"
        className="hidden md:flex w-52 shrink-0 border-r border-border bg-sidebar/60 p-2"
      >
        <SidebarContent>
          <SidebarGroup>
            <div className="px-2 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Preferências
            </div>
            <SidebarGroupContent>
              <SidebarMenu className="gap-1">
                {settingsNav.map((item) => {
                  const Icon = item.icon;
                  return (
                    <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton
                        isActive={item.id === activeTab}
                        onClick={() => setActiveTab(item.id)}
                        className="cursor-pointer rounded-lg"
                      >
                        <Icon size={18} />
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>

      <main className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-background">
        {/* Mobile top navigation */}
        <div className="md:hidden border-b">
          <nav className="flex gap-2 overflow-x-auto p-2 px-4">
            {settingsNav.map((item) => {
              const Icon = item.icon;
              const isActive = item.id === activeTab;
              return (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-2 whitespace-nowrap px-3 py-2 rounded-md text-sm ${
                    isActive
                      ? "bg-muted text-primary"
                      : "text-muted-foreground hover:bg-muted/50"
                  }`}
                >
                  <Icon size={16} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <header className="flex h-16 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear">
          <div className="flex items-center gap-2 px-4">
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="#">Configurações</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>{activeNav?.label}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <div className="flex h-full min-h-0 flex-1 overflow-y-auto p-6">
          <div className="w-full max-w-4xl">{renderContent()}</div>
        </div>
      </main>
    </SidebarProvider>
  );
}

export const ModalConfiguracoes = SettingsPage;
export const ConfiguracoesPage = SettingsPage;
export default SettingsPage;