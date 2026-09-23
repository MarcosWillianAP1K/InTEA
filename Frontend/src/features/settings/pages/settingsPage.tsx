import { useState } from "react";
import {
  Bell,
  MessageCircle,
  Palette,
  Lock,
  User2,
} from "lucide-react";

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

import AppearanceSettings from "../sections/appearanceSetting";


const settingsNav = [
  { id: "appearance", label: "Aparência", icon: Palette },
//   { id: "messages", label: "Mensagens & mídia", icon: MessageCircle },
//   { id: "conta", label: "Conta", icon: User2 },
//   {id: "pagamentos", label: "Pagamentos", icon: Bell},
//   { id: "Plan", label: "Plano e Quotas", icon: Lock },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("appearance");

  const activeNav = settingsNav.find((item) => item.id === activeTab);

  const renderContent = () => {
    switch (activeTab) {
      case "appearance":
        return <AppearanceSettings />;
    //   case "messages":
    //     return <MessagesSettings />;
    //   case "conta":
    //     return <ProfileSettings />;
    //   case "pagamentos":
    //     return <PaymentsHistorySettings />;
    //   case "Plan":
    //     return <PlanUsageSettings />;
      default:
        return <AppearanceSettings />;
    }
  };

  return (
    <SidebarProvider
      className="flex h-full min-h-0 items-stretch"
      style={{ minHeight: 0 }}
    >
      <Sidebar collapsible="none" className="hidden md:flex">
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {settingsNav.map((item) => {
                  const Icon = item.icon;
                  return (
                    <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton
                        isActive={item.id === activeTab}
                        onClick={() => setActiveTab(item.id)}
                        className="cursor-pointer"
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

      <main className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
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