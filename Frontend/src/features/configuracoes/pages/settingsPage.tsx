"use client";

import { useState, useEffect } from "react";
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
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { useAuthStore } from "@/features/autenticacao/store/authStore";
import { authService } from "@/features/autenticacao/services/auth.service";
import { terapeutaService } from "@/features/terapeuta/services/terapeuta.service";
import { pacienteService } from "@/features/paciente/services/paciente.service";
import { sessaoService } from "@/features/sessao/services/sessao.service";
import { jogosService } from "@/features/jogos/services/jogos.service";
import { useTheme } from "@/shared/providers/theme-provider";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Badge } from "@/shared/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/shared/components/ui/dialog";
import { toast } from "sonner";

/**
 * ============================================================================
 * PAGE: SETTINGS / THERAPIST PROFILE (InTEA)
 * Compliance: RF21 (Authentication/Authorship), RN04 (Clinic Association), RN05 (Soft Delete)
 * ============================================================================
 */
export function SettingsPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const logout = useAuthStore((s) => s.logout);
  const { theme, setTheme } = useTheme();

  // Estados locais do formulário de dados pessoais
  const [nome, setNome] = useState(user?.nome || "");
  const [registro, setRegistro] = useState(
    user?.registro_profissional || user?.crefito || ""
  );
  const [especialidade, setEspecialidade] = useState(
    user?.especialidade || ""
  );
  const [email, setEmail] = useState(user?.email || "");
  const [telefone, setTelefone] = useState(user?.telefone || "");
  const [salvando, setSalvando] = useState(false);

  // Estados dos Cards com dados reais da clínica / terapeuta
  const [carregandoMetricas, setCarregandoMetricas] = useState(true);
  const [totalPacientes, setTotalPacientes] = useState<number>(0);
  const [totalSessoesMes, setTotalSessoesMes] = useState<number>(0);
  const [totalJogosAtivos, setTotalJogosAtivos] = useState<number>(0);

  // Modal Alterar Senha
  const [modalSenhaAberto, setModalSenhaAberto] = useState(false);
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [alterandoSenha, setAlterandoSenha] = useState(false);

  // Modal Deletar Conta (Soft Delete - RN05)
  const [modalDeletarAberto, setModalDeletarAberto] = useState(false);
  const [confirmacaoTexto, setConfirmacaoTexto] = useState("");
  const [deletandoConta, setDeletandoConta] = useState(false);

  // Sincroniza formulário com usuário autenticado da store
  useEffect(() => {
    if (user) {
      if (!nome) setNome(user.nome || "");
      if (!registro) setRegistro(user.registro_profissional || user.crefito || "");
      if (!especialidade) setEspecialidade(user.especialidade || "");
      if (!email) setEmail(user.email || "");
      if (!telefone && user.telefone) setTelefone(user.telefone);
    }
  }, [user]);

  // Carrega métricas reais do banco de dados (Pacientes, Sessões, Jogos)
  useEffect(() => {
    let ativo = true;

    async function carregarMetricasReais() {
      try {
        setCarregandoMetricas(true);
        const [pacientesRes, sessoesRes, jogosRes] = await Promise.allSettled([
          pacienteService.listar(),
          sessaoService.listar(),
          jogosService.listar(),
        ]);

        if (!ativo) return;

        // 1. Pacientes sob seus cuidados (RN04)
        if (pacientesRes.status === "fulfilled") {
          setTotalPacientes(pacientesRes.value?.length || 0);
        }

        // 2. Sessões realizadas este mês
        if (sessoesRes.status === "fulfilled") {
          const sessoes = sessoesRes.value?.data || [];
          const agora = new Date();
          const mesAtual = agora.getMonth();
          const anoAtual = agora.getFullYear();

          const realizadasMes = sessoes.filter((s) => {
            const dataStr = s.data_hora_inicio || s.created_at;
            if (!dataStr) return false;
            const d = new Date(dataStr);
            return d.getFullYear() === anoAtual && d.getMonth() === mesAtual;
          }).length;

          setTotalSessoesMes(realizadasMes);
        }

        // 3. Jogos terapêuticos ativos no sistema
        if (jogosRes.status === "fulfilled") {
          const jogos = jogosRes.value || [];
          const ativos = jogos.filter((j) => j.status_jogo !== "desativado").length;
          setTotalJogosAtivos(ativos);
        }
      } catch {
        // Fallback gracioso mantendo zeros
      } finally {
        if (ativo) setCarregandoMetricas(false);
      }
    }

    carregarMetricasReais();

    return () => {
      ativo = false;
    };
  }, []);

  const handleSalvarDadosPessoais = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) {
      toast.error("Terapeuta não autenticado.");
      return;
    }

    setSalvando(true);
    try {
      const terapeutaAtualizado = await terapeutaService.atualizar(user.id, {
        nome: nome.trim(),
        telefone: telefone.trim() || null,
        crefito: registro.trim() || null,
        registro_profissional: registro.trim() || null,
        especialidade: especialidade.trim() || null,
      });

      // Atualiza estado local da store auth
      setUser({
        ...user,
        nome: terapeutaAtualizado?.nome ?? nome.trim(),
        telefone: terapeutaAtualizado?.telefone ?? (telefone.trim() || null),
        crefito: terapeutaAtualizado?.crefito ?? (registro.trim() || null),
        registro_profissional:
          terapeutaAtualizado?.registro_profissional ?? (registro.trim() || null),
        especialidade:
          terapeutaAtualizado?.especialidade ?? (especialidade.trim() || null),
      });

      toast.success("Dados cadastrais do terapeuta atualizados com sucesso!");
    } catch (err: unknown) {
      const mensagem =
        err instanceof Error ? err.message : "Erro ao salvar alterações pessoais.";
      toast.error(mensagem);
    } finally {
      setSalvando(false);
    }
  };

  const handleAlterarSenha = async (e: React.FormEvent) => {
    e.preventDefault();
    if (novaSenha.length < 6) {
      toast.error("A nova senha deve possuir pelo menos 6 caracteres.");
      return;
    }
    if (novaSenha !== confirmarSenha) {
      toast.error("A confirmação de senha não coincide com a nova senha.");
      return;
    }

    setAlterandoSenha(true);
    try {
      await authService.alterarSenha(novaSenha);
      toast.success("Senha de acesso atualizada com sucesso!");
      setModalSenhaAberto(false);
      setNovaSenha("");
      setConfirmarSenha("");
    } catch (err: unknown) {
      const mensagem =
        err instanceof Error ? err.message : "Erro ao alterar senha de acesso.";
      toast.error(mensagem);
    } finally {
      setAlterandoSenha(false);
    }
  };

  const handleDeletarConta = async () => {
    if (confirmacaoTexto.trim().toUpperCase() !== "DELETAR") {
      toast.error("Digite 'DELETAR' para confirmar a desativação da conta.");
      return;
    }
    if (!user?.id) {
      toast.error("Usuário não identificado para exclusão.");
      return;
    }

    setDeletandoConta(true);
    try {
      // Soft Delete no backend (RN05: status_ativo = false)
      await terapeutaService.inativar(user.id);
      toast.success("Conta desativada com sucesso. Sessão encerrada.");
      setModalDeletarAberto(false);
      await logout();
      navigate("/login", { replace: true });
    } catch (err: unknown) {
      const mensagem =
        err instanceof Error ? err.message : "Erro ao desativar conta clínica.";
      toast.error(mensagem);
    } finally {
      setDeletandoConta(false);
    }
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

  const iniciaisTerapeuta = (nome || user?.nome || "T").slice(0, 2).toUpperCase();

  return (
    <div className="flex flex-1 flex-col gap-6 w-full max-w-6xl mx-auto py-2 pb-16">
      {/* 1. Profile Banner — Figma 200:1713 */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 bg-card border border-border p-6 rounded-2xl shadow-xs">
        <div className="flex items-center gap-5">
          <div className="h-20 w-20 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center text-primary font-bold text-2xl shadow-inner shrink-0">
            {iniciaisTerapeuta}
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                {nome || user?.nome || "Terapeuta Clínico"}
              </h1>
              {(registro || user?.registro_profissional || user?.crefito) && (
                <Badge className="bg-primary/10 text-primary border-primary/20 text-xs">
                  {registro || user?.registro_profissional || user?.crefito}
                </Badge>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Briefcase className="h-3.5 w-3.5 text-primary" />
                {especialidade || user?.especialidade || "Terapeuta InTEA"}
              </span>
              <span className="flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5 text-primary" />
                {user?.clinica_nome || "InTEA Saúde & Neurodesenvolvimento"}
              </span>
            </div>
          </div>
        </div>

        <Badge
          variant="outline"
          className="text-xs px-3 py-1 font-semibold text-emerald-600 border-emerald-500/30 bg-emerald-500/10"
        >
          <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
          Perfil Clínico Verificado
        </Badge>
      </div>

      {/* 2. Stat Cards Row (3 Cards Consumindo Banco de Dados Real) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl border border-border bg-card shadow-xs flex items-center gap-4">
          <div className="p-3 rounded-xl bg-blue-500/10 text-[#00288E] dark:text-blue-400">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <span className="text-2xl font-bold text-foreground">
              {carregandoMetricas ? (
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground inline-block" />
              ) : (
                totalPacientes
              )}
            </span>
            <p className="text-xs text-muted-foreground mt-0.5">
              Pacientes sob seus cuidados
            </p>
          </div>
        </div>

        <div className="p-5 rounded-2xl border border-border bg-card shadow-xs flex items-center gap-4">
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <Calendar className="h-6 w-6" />
          </div>
          <div>
            <span className="text-2xl font-bold text-foreground">
              {carregandoMetricas ? (
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground inline-block" />
              ) : (
                totalSessoesMes
              )}
            </span>
            <p className="text-xs text-muted-foreground mt-0.5">
              Sessões realizadas este mês
            </p>
          </div>
        </div>

        <div className="p-5 rounded-2xl border border-border bg-card shadow-xs flex items-center gap-4">
          <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
            <Gamepad2 className="h-6 w-6" />
          </div>
          <div>
            <span className="text-2xl font-bold text-foreground">
              {carregandoMetricas ? (
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground inline-block" />
              ) : (
                totalJogosAtivos
              )}
            </span>
            <p className="text-xs text-muted-foreground mt-0.5">
              Jogos terapêuticos ativos
            </p>
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
                    required
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
                    disabled
                    type="email"
                    className="text-xs h-10 bg-muted/40 border-border text-muted-foreground cursor-not-allowed"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-foreground">Telefone de Contato</label>
                  <Input
                    value={telefone}
                    onChange={(e) => setTelefone(e.target.value)}
                    placeholder="(00) 00000-0000"
                    className="text-xs h-10 bg-background border-border"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-foreground">Especialidade / Título Clínico</label>
                <Input
                  value={especialidade}
                  onChange={(e) => setEspecialidade(e.target.value)}
                  placeholder="Ex: Terapeuta Ocupacional Especialista em TEA"
                  className="text-xs h-10 bg-background border-border"
                />
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  type="submit"
                  disabled={salvando}
                  className="gap-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-bold shadow-md shadow-primary/20 cursor-pointer"
                >
                  {salvando ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Save className="h-3.5 w-3.5" />
                  )}
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

              {/* Notificações por e-mail (Mantido visualmente mas desativado) */}
              <div className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-muted/20 opacity-80">
                <div className="flex items-center gap-3">
                  <Bell className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground block">
                        Notificações por E-mail
                      </span>
                      <Badge variant="outline" className="text-[10px] text-muted-foreground border-border">
                        Em breve
                      </Badge>
                    </div>
                    <span className="text-muted-foreground text-[11px]">
                      Receba resumos semanais de sessões e alertas de intervenção clínica.
                    </span>
                  </div>
                </div>

                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled
                  className="h-8 text-xs font-semibold cursor-not-allowed opacity-60"
                >
                  Desativado
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
                <span className="font-semibold text-foreground">
                  {user?.tempo_experiencia_anos
                    ? `${user.tempo_experiencia_anos} anos de prática clínica`
                    : "Prática dedicada ao TEA infantil"}
                </span>
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
                onClick={() => setModalSenhaAberto(true)}
                className="w-full justify-start text-xs font-semibold h-9 cursor-pointer"
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
                onClick={() => setModalDeletarAberto(true)}
                className="w-full justify-start text-xs font-bold h-9 bg-[#BA0003] hover:bg-[#8f0002] text-white shadow-xs cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5 mr-2" />
                <span>Deletar Conta Clínica</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal: Alterar Senha */}
      <Dialog open={modalSenhaAberto} onOpenChange={setModalSenhaAberto}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Lock className="h-4 w-4 text-primary" />
              Alterar Senha de Acesso
            </DialogTitle>
            <DialogDescription className="text-xs">
              Informe sua nova senha para atualizar as credenciais seguras da sua conta.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAlterarSenha} className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-foreground">Nova Senha</label>
              <Input
                type="password"
                placeholder="Mínimo de 6 caracteres"
                value={novaSenha}
                onChange={(e) => setNovaSenha(e.target.value)}
                required
                className="text-xs h-10"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-foreground">Confirmar Nova Senha</label>
              <Input
                type="password"
                placeholder="Repita a nova senha"
                value={confirmarSenha}
                onChange={(e) => setConfirmarSenha(e.target.value)}
                required
                className="text-xs h-10"
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setModalSenhaAberto(false)}
                disabled={alterandoSenha}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={alterandoSenha}
                className="text-xs bg-primary text-primary-foreground font-semibold"
              >
                {alterandoSenha ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                ) : null}
                <span>{alterandoSenha ? "Atualizando..." : "Atualizar Senha"}</span>
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal: Deletar Conta Clínica (Soft Delete - RN05) */}
      <Dialog open={modalDeletarAberto} onOpenChange={setModalDeletarAberto}>
        <DialogContent className="sm:max-w-md border-red-500/30">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base text-red-600 dark:text-red-400">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              Desativar Conta Clínica
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
              Esta ação desativará permanentemente o acesso da sua conta. O histórico
              clínico de pacientes, telemetria e registros de auditoria serão preservados de
              acordo com as normas de saúde.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3 py-2 text-xs">
            <p className="font-semibold text-foreground">
              Para confirmar a inativação da sua conta, digite <span className="text-red-600 font-bold">DELETAR</span> abaixo:
            </p>
            <Input
              value={confirmacaoTexto}
              onChange={(e) => setConfirmacaoTexto(e.target.value)}
              placeholder="Digite DELETAR para confirmar"
              className="text-xs h-10 border-red-500/30 focus-visible:ring-red-500"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setModalDeletarAberto(false);
                setConfirmacaoTexto("");
              }}
              disabled={deletandoConta}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={confirmacaoTexto.trim().toUpperCase() !== "DELETAR" || deletandoConta}
              onClick={handleDeletarConta}
              className="text-xs bg-[#BA0003] hover:bg-[#8f0002] font-semibold"
            >
              {deletandoConta ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
              ) : null}
              <span>{deletandoConta ? "Desativando..." : "Confirmar Inativação"}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export const ConfiguracoesPage = SettingsPage;
export const ModalConfiguracoes = SettingsPage;
export default SettingsPage;
