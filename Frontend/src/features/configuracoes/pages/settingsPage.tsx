"use client";

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  User,
  Briefcase,
  Building2,
  Award,
  Save,
  Moon,
  Sun,
  Bell,
  Globe,
  Lock,
  LogOut,
  Trash2,
  CheckCircle2,
  Users,
  Calendar,
  Gamepad2,
} from "lucide-react";
import { useAuthStore } from "@/features/autenticacao/store/authStore";
import { useTheme } from "@/shared/providers/theme-provider";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Badge } from "@/shared/components/ui/badge";
import { toast } from "sonner";

/**
 * ============================================================================
 * PÁGINA: CONFIGURAÇÕES / PERFIL TERAPEUTA (InTEA)
 * Frame Figma: Perfil Terapeuta - InTEA (200:1713)
 * Acessível via Sidebar (/configuracoes) e Menu do Usuário
 * ============================================================================
 */
export function SettingsPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const { theme, setTheme } = useTheme();

  // Estados locais do formulário de dados pessoais
  const [nome, setNome] = useState(user?.nome || "Dr. Hermeson Alves");
  const [registro, setRegistro] = useState(
    user?.registro_profissional || user?.crefito || "CREFITO-14/87654-TO"
  );
  const [especialidade, setEspecialidade] = useState(
    user?.especialidade || "Terapeuta Ocupacional Especialista em TEA"
  );
  const [email, setEmail] = useState(user?.email || "hermeson.alves@intea.clinica.com");
  const [telefone, setTelefone] = useState("(86) 98877-6655");
  const [notificacoesEmail, setNotificacoesEmail] = useState(true);
  const [salvando, setSalvando] = useState(false);

  const handleSalvarDadosPessoais = (e: React.FormEvent) => {
    e.preventDefault();
    setSalvando(true);
    setTimeout(() => {
      setSalvando(false);
      toast.success("Dados cadastrais do terapeuta atualizados com sucesso!");
    }, 600);
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  const areasDeFoco = [
    "Autismo e TEA",
    "Regulação Emocional",
    "Comunicação & Linguagem",
    "Desenvolvimento Motor",
    "Integração Sensorial",
  ];

  return (
    <div className="flex flex-1 flex-col gap-6 w-full max-w-6xl mx-auto py-2 pb-16">
      {/* 1. Profile Banner — Figma 200:1713 */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 bg-card border border-border p-6 rounded-2xl shadow-xs">
        <div className="flex items-center gap-5">
          <div className="h-20 w-20 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center text-primary font-bold text-2xl shadow-inner shrink-0">
            {nome.slice(0, 2).toUpperCase()}
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                {nome}
              </h1>
              <Badge className="bg-primary/10 text-primary border-primary/20 text-xs">
                {registro}
              </Badge>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Briefcase className="h-3.5 w-3.5 text-primary" />
                {especialidade}
              </span>
              <span className="flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5 text-primary" />
                InTEA Saúde &amp; Neurodesenvolvimento
              </span>
            </div>
          </div>
        </div>

        <Badge variant="outline" className="text-xs px-3 py-1 font-semibold text-emerald-600 border-emerald-500/30 bg-emerald-500/10">
          <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
          Perfil Clínico Verificado
        </Badge>
      </div>

      {/* 2. Stat Cards Row (3 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl border border-border bg-card shadow-xs flex items-center gap-4">
          <div className="p-3 rounded-xl bg-blue-500/10 text-[#00288E] dark:text-blue-400">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <span className="text-2xl font-bold text-foreground">18</span>
            <p className="text-xs text-muted-foreground mt-0.5">Pacientes sob seus cuidados</p>
          </div>
        </div>

        <div className="p-5 rounded-2xl border border-border bg-card shadow-xs flex items-center gap-4">
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <Calendar className="h-6 w-6" />
          </div>
          <div>
            <span className="text-2xl font-bold text-foreground">42</span>
            <p className="text-xs text-muted-foreground mt-0.5">Sessões realizadas este mês</p>
          </div>
        </div>

        <div className="p-5 rounded-2xl border border-border bg-card shadow-xs flex items-center gap-4">
          <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
            <Gamepad2 className="h-6 w-6" />
          </div>
          <div>
            <span className="text-2xl font-bold text-foreground">6</span>
            <p className="text-xs text-muted-foreground mt-0.5">Jogos terapêuticos ativos</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna Esquerda: Formulário de Dados Pessoais (2 colunas de largura) */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Card: Dados Pessoais e Cadastrais */}
          <div className="p-6 rounded-2xl border border-border bg-card shadow-xs flex flex-col gap-5">
            <div className="flex items-center gap-2 border-b border-border pb-3">
              <User className="h-4 w-4 text-primary" />
              <h2 className="font-bold text-base text-foreground">
                Dados Pessoais &amp; Registro Profissional
              </h2>
            </div>

            <form onSubmit={handleSalvarDadosPessoais} className="flex flex-col gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-foreground">Nome Completo</label>
                  <Input
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    className="text-xs h-10 bg-background border-border"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-foreground">Registro Profissional (CREFITO)</label>
                  <Input
                    value={registro}
                    onChange={(e) => setRegistro(e.target.value)}
                    className="text-xs h-10 bg-background border-border"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-foreground">E-mail Profissional</label>
                  <Input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    type="email"
                    className="text-xs h-10 bg-background border-border"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-foreground">Telefone de Contato</label>
                  <Input
                    value={telefone}
                    onChange={(e) => setTelefone(e.target.value)}
                    className="text-xs h-10 bg-background border-border"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-foreground">Especialidade / Título Clínico</label>
                <Input
                  value={especialidade}
                  onChange={(e) => setEspecialidade(e.target.value)}
                  className="text-xs h-10 bg-background border-border"
                />
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  type="submit"
                  disabled={salvando}
                  className="gap-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-bold shadow-md shadow-primary/20 cursor-pointer"
                >
                  <Save className="h-3.5 w-3.5" />
                  <span>{salvando ? "Salvando..." : "Salvar Alterações Pessoais"}</span>
                </Button>
              </div>
            </form>
          </div>

          {/* Card: Preferências & Configurações */}
          <div className="p-6 rounded-2xl border border-border bg-card shadow-xs flex flex-col gap-5">
            <div className="flex items-center gap-2 border-b border-border pb-3">
              <Globe className="h-4 w-4 text-primary" />
              <h2 className="font-bold text-base text-foreground">
                Preferências do Sistema &amp; Interface
              </h2>
            </div>

            <div className="space-y-4 text-xs">
              {/* Toggle de Modo Escuro / Claro */}
              <div className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-muted/20">
                <div className="flex items-center gap-3">
                  {theme === "dark" ? (
                    <Moon className="h-5 w-5 text-indigo-400" />
                  ) : (
                    <Sun className="h-5 w-5 text-amber-500" />
                  )}
                  <div>
                    <span className="font-semibold text-foreground block">
                      Aparência / Modo Escuro
                    </span>
                    <span className="text-muted-foreground text-[11px]">
                      Alterne entre temas claro e escuro para conforto visual em atendimentos.
                    </span>
                  </div>
                </div>

                <div className="flex gap-1.5">
                  <Button
                    type="button"
                    size="sm"
                    variant={theme === "light" ? "default" : "outline"}
                    onClick={() => setTheme("light")}
                    className="h-8 text-xs font-semibold"
                  >
                    Claro
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={theme === "dark" ? "default" : "outline"}
                    onClick={() => setTheme("dark")}
                    className="h-8 text-xs font-semibold"
                  >
                    Escuro
                  </Button>
                </div>
              </div>

              {/* Notificações por e-mail */}
              <div className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-muted/20">
                <div className="flex items-center gap-3">
                  <Bell className="h-5 w-5 text-primary" />
                  <div>
                    <span className="font-semibold text-foreground block">
                      Notificações por E-mail
                    </span>
                    <span className="text-muted-foreground text-[11px]">
                      Receba resumos semanais de sessões e alertas de intervenção.
                    </span>
                  </div>
                </div>

                <Button
                  type="button"
                  size="sm"
                  variant={notificacoesEmail ? "default" : "outline"}
                  onClick={() => {
                    setNotificacoesEmail(!notificacoesEmail);
                    toast.info(
                      notificacoesEmail
                        ? "Notificações por e-mail desativadas."
                        : "Notificações por e-mail ativadas."
                    );
                  }}
                  className="h-8 text-xs font-semibold"
                >
                  {notificacoesEmail ? "Ativado" : "Desativado"}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Coluna Direita: Informações Profissionais & Segurança da Conta */}
        <div className="flex flex-col gap-6">
          {/* Card: Informações Profissionais & Áreas de Foco */}
          <div className="p-6 rounded-2xl border border-border bg-card shadow-xs flex flex-col gap-4">
            <div className="flex items-center gap-2 border-b border-border pb-3">
              <Award className="h-4 w-4 text-primary" />
              <h2 className="font-bold text-sm text-foreground">
                Áreas de Foco &amp; Especialidades
              </h2>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-muted-foreground block text-[11px]">Experiência Clínica:</span>
                <span className="font-semibold text-foreground">8 anos dedicados ao TEA infantil</span>
              </div>

              <div>
                <span className="text-muted-foreground block text-[11px] mb-1.5">Áreas de Atuação:</span>
                <div className="flex flex-wrap gap-1.5">
                  {areasDeFoco.map((area) => (
                    <Badge
                      key={area}
                      className="bg-primary/10 text-primary border-primary/20 text-[11px] font-medium"
                    >
                      {area}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Card: Segurança da Conta — Figma 200:1713 */}
          <div className="p-6 rounded-2xl border border-border bg-card shadow-xs flex flex-col gap-4">
            <div className="flex items-center gap-2 border-b border-border pb-3">
              <Lock className="h-4 w-4 text-primary" />
              <h2 className="font-bold text-sm text-foreground">
                Segurança &amp; Sessão
              </h2>
            </div>

            <div className="flex flex-col gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => toast.info("Funcionalidade de troca de senha via e-mail segura enviada.")}
                className="w-full justify-start text-xs font-semibold h-9"
              >
                <Lock className="h-3.5 w-3.5 mr-2" />
                <span>Alterar Senha de Acesso</span>
              </Button>

              <Button
                onClick={handleLogout}
                className="w-full justify-start text-xs font-bold h-9 bg-[#00288E] hover:bg-[#001f70] text-white shadow-xs cursor-pointer"
              >
                <LogOut className="h-3.5 w-3.5 mr-2" />
                <span>Sair da Conta (Logout)</span>
              </Button>

              <Button
                variant="destructive"
                size="sm"
                onClick={() => toast.error("Exclusão de conta clínica bloqueada por política institucional (RN05).")}
                className="w-full justify-start text-xs font-bold h-9 bg-[#BA0003] hover:bg-[#8f0002] text-white shadow-xs cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5 mr-2" />
                <span>Deletar Conta Clínica</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export const ConfiguracoesPage = SettingsPage;
export const ModalConfiguracoes = SettingsPage;
export default SettingsPage;
