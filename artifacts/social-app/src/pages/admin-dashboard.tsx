import { useState, useEffect, useCallback, useRef } from "react";
import { Shell } from "@/components/layout/Shell";
import {
  useIsAdmin,
  useGetMe,
  useGetAllUsersAdmin,
  useUpdateUserRoleAdmin,
  useVerifyUserAdmin,
  useSuspendUserAdmin,
  useGetGlobalStatsAdmin,
  useGetSupportTicketsAdmin,
  useUpdateSupportTicketAdmin,
  useGetPendingTopUps,
  useAdminReviewTopUp,
  useGetBankingConfig,
  useUpdateBankingConfigAdmin,
  type BankingConfig,
} from "@workspace/api-client-react";
import {
  useGetAllVerificationsAdmin,
  useReviewEntityVerification,
  type EntityVerificationRequest,
} from "@/lib/entity-verification-api";
import { listPendingReports, resolveReport, type ContentReport } from "@/lib/moderation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AppModal } from "@/components/ui/app-modal";
import { uploadFile } from "@/lib/upload";
import { formatCOP } from "@/lib/format-currency";
import {
  ShieldCheck,
  Users,
  CheckCircle,
  XCircle,
  Clock,
  Search,
  Filter,
  DollarSign,
  Flag,
  HelpCircle,
  BarChart3,
  Calendar,
  Layers,
  Sparkles,
  ExternalLink,
  Eye,
  Check,
  Ban,
  UserCheck,
  Lock,
  RefreshCw,
  FileText,
  Camera,
  Coins,
  AlertTriangle,
  Building2,
  Smartphone,
  CreditCard,
  UploadCloud,
  Save,
  QrCode,
  ImagePlus,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

export default function AdminDashboard() {
  const { data: isAdmin, isLoading: loadingAdmin } = useIsAdmin();
  const { data: me } = useGetMe();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<
    "overview" | "users" | "kyc" | "wallet" | "banking" | "moderation" | "tickets"
  >("overview");

  // Sub-queries
  const { data: stats } = useGetGlobalStatsAdmin();
  const { data: allUsers = [], refetch: refetchUsers } = useGetAllUsersAdmin();
  const { data: verifications = [], refetch: refetchKyc } = useGetAllVerificationsAdmin();
  const { data: pendingTopups = [], refetch: refetchTopups } = useGetPendingTopUps();
  const { data: tickets = [], refetch: refetchTickets } = useGetSupportTicketsAdmin();
  const { data: bankingConfig, refetch: refetchBanking } = useGetBankingConfig();

  // Moderation reports (imperative API)
  const [reports, setReports] = useState<ContentReport[]>([]);
  const loadReports = useCallback(async () => {
    const data = await listPendingReports();
    setReports(data);
  }, []);
  const refetchReports = loadReports;
  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  // Mutations
  const updateRole = useUpdateUserRoleAdmin();
  const verifyUser = useVerifyUserAdmin();
  const suspendUser = useSuspendUserAdmin();
  const reviewVerif = useReviewEntityVerification();
  const reviewTopUp = useAdminReviewTopUp();
  const updateTicket = useUpdateSupportTicketAdmin();
  const updateBanking = useUpdateBankingConfigAdmin();

  // Search & Filter States
  const [userSearch, setUserSearch] = useState("");
  const [kycFilter, setKycFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");
  const [selectedVerif, setSelectedVerif] = useState<EntityVerificationRequest | null>(null);
  const [selectedVoucherUrl, setSelectedVoucherUrl] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [ticketReplyText, setTicketReplyText] = useState("");
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);

  // ─── ESTADO DE FORMULARIO DE BANCOS COLOMBIANOS ────────────────────────────
  const [bankingForm, setBankingForm] = useState<BankingConfig>({
    nequiPhone: "",
    nequiName: "",
    nequiQrUrl: "",
    nequiEnabled: true,
    mpAlias: "",
    mpEmail: "",
    mpPaymentLink: "",
    mpName: "",
    mpQrUrl: "",
    mpEnabled: true,
    bancolombiaAccount: "",
    bancolombiaType: "Ahorros",
    bancolombiaName: "",
    bancolombiaEnabled: true,
    daviplataPhone: "",
    daviplataName: "",
    daviplataEnabled: true,
  });
  const [uploadingNequiQr, setUploadingNequiQr] = useState(false);
  const nequiQrInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (bankingConfig) {
      setBankingForm({ ...bankingConfig });
    }
  }, [bankingConfig]);

  if (loadingAdmin) {
    return (
      <Shell>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </Shell>
    );
  }

  if (!isAdmin) {
    return (
      <Shell>
        <div className="max-w-md mx-auto my-16 text-center glass-panel p-8 rounded-3xl border border-destructive/30 space-y-4">
          <div className="w-16 h-16 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-extrabold text-foreground">Acceso Restringido</h2>
          <p className="text-sm text-muted-foreground">
            Esta sección es exclusiva para el <strong>Superadministrador</strong> de MenpoeSocial.
          </p>
          <Button onClick={() => setLocation("/")} className="rounded-xl neon-btn w-full">
            Volver al Inicio
          </Button>
        </div>
      </Shell>
    );
  }

  const pendingKycCount = verifications.filter((v) => v.status === "pending").length;
  const pendingTopupCount = pendingTopups.length;
  const pendingReportCount = reports.filter((r) => r.status === "pending").length;
  const pendingTicketCount = tickets.filter((t) => t.status === "open" || t.status === "pending").length;

  const filteredUsers = allUsers.filter((u: any) => {
    const q = userSearch.toLowerCase().trim();
    if (!q) return true;
    return (
      (u.displayName || "").toLowerCase().includes(q) ||
      (u.username || "").toLowerCase().includes(q) ||
      (u.email || "").toLowerCase().includes(q) ||
      (u.id || "").toLowerCase().includes(q)
    );
  });

  const filteredVerifs = verifications.filter((v) => {
    if (kycFilter === "all") return true;
    return v.status === kycFilter;
  });

  const handleApproveKyc = async (v: EntityVerificationRequest) => {
    try {
      await reviewVerif.mutateAsync({
        requestId: v.id,
        entityType: v.entityType,
        entityId: v.entityId,
        userId: v.userId,
        status: "approved",
      });
      toast({
        title: "¡Verificación aprobada! ✓",
        description: `Se ha verificado ${v.entityTitle || v.userName}.`,
      });
      setSelectedVerif(null);
    } catch (err: any) {
      toast({ title: "Error", description: err?.message, variant: "destructive" });
    }
  };

  const handleRejectKyc = async (v: EntityVerificationRequest) => {
    if (!rejectionReason.trim()) {
      toast({ title: "Motivo requerido", description: "Escribe el motivo del rechazo.", variant: "destructive" });
      return;
    }
    try {
      await reviewVerif.mutateAsync({
        requestId: v.id,
        entityType: v.entityType,
        entityId: v.entityId,
        userId: v.userId,
        status: "rejected",
        rejectionReason: rejectionReason.trim(),
      });
      toast({
        title: "Solicitud rechazada",
        description: "Se ha notificado al usuario el motivo.",
      });
      setSelectedVerif(null);
      setRejectionReason("");
    } catch (err: any) {
      toast({ title: "Error", description: err?.message, variant: "destructive" });
    }
  };

  const handleSaveBankingConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateBanking.mutateAsync(bankingForm);
      toast({
        title: "Configuración de bancos guardada ✓",
        description: "Los usuarios verán estos datos bancarios al realizar depósitos.",
      });
    } catch (err: any) {
      toast({ title: "Error al guardar bancos", description: err.message, variant: "destructive" });
    }
  };

  const handleUploadNequiQr = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingNequiQr(true);
    try {
      const url = await uploadFile(file, { purpose: "post" });
      setBankingForm((prev) => ({ ...prev, nequiQrUrl: url }));
      toast({ title: "QR Nequi cargado con éxito" });
    } catch {
      toast({ title: "Error al subir QR", variant: "destructive" });
    } finally {
      setUploadingNequiQr(false);
      e.target.value = "";
    }
  };

  return (
    <Shell>
      <div className="max-w-6xl mx-auto w-full p-4 pb-24 space-y-6">
        {/* Header Master Admin */}
        <div className="glass-panel p-6 rounded-3xl border border-primary/30 shadow-2xl relative overflow-hidden bg-gradient-to-r from-primary/15 via-background to-accent/15">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Badge className="bg-primary/20 text-primary border border-primary/40 font-mono text-xs px-2.5 py-0.5">
                  👑 MASTER ADMIN
                </Badge>
                <span className="text-xs text-muted-foreground font-mono">PANEL DE CONTROL CENTRAL</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                Administración General — MenpoeSocial
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Control maestro de usuarios, verificaciones KYC, cuentas bancarias, billetera, moderación y soporte.
              </p>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl text-xs gap-1.5"
                onClick={() => {
                  refetchUsers();
                  refetchKyc();
                  refetchTopups();
                  refetchReports();
                  refetchTickets();
                  refetchBanking();
                  toast({ title: "Datos sincronizados" });
                }}
              >
                <RefreshCw className="w-3.5 h-3.5" /> Sincronizar
              </Button>
            </div>
          </div>
        </div>

        {/* Pestañas de Navegación Principal */}
        <div className="flex flex-wrap gap-2 border-b border-border/40 pb-2">
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
              activeTab === "overview"
                ? "bg-primary text-primary-foreground shadow-[0_0_15px_rgba(0,180,216,0.4)]"
                : "bg-white/5 text-muted-foreground hover:bg-white/10"
            }`}
          >
            <BarChart3 className="w-4 h-4" /> Resumen & KPIs
          </button>

          <button
            onClick={() => setActiveTab("users")}
            className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
              activeTab === "users"
                ? "bg-primary text-primary-foreground shadow-[0_0_15px_rgba(0,180,216,0.4)]"
                : "bg-white/5 text-muted-foreground hover:bg-white/10"
            }`}
          >
            <Users className="w-4 h-4" /> Usuarios ({allUsers.length})
          </button>

          <button
            onClick={() => setActiveTab("kyc")}
            className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
              activeTab === "kyc"
                ? "bg-primary text-primary-foreground shadow-[0_0_15px_rgba(0,180,216,0.4)]"
                : "bg-white/5 text-muted-foreground hover:bg-white/10"
            }`}
          >
            <ShieldCheck className="w-4 h-4" /> Verificaciones KYC
            {pendingKycCount > 0 && (
              <span className="bg-cyan-400 text-black font-extrabold text-[10px] px-1.5 py-0.2 rounded-full">
                {pendingKycCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("banking")}
            className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
              activeTab === "banking"
                ? "bg-primary text-primary-foreground shadow-[0_0_15px_rgba(0,180,216,0.4)]"
                : "bg-white/5 text-muted-foreground hover:bg-white/10"
            }`}
          >
            <Building2 className="w-4 h-4" /> Bancos (Colombia)
          </button>

          <button
            onClick={() => setActiveTab("wallet")}
            className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
              activeTab === "wallet"
                ? "bg-primary text-primary-foreground shadow-[0_0_15px_rgba(0,180,216,0.4)]"
                : "bg-white/5 text-muted-foreground hover:bg-white/10"
            }`}
          >
            <Coins className="w-4 h-4" /> Recargas Billetera
            {pendingTopupCount > 0 && (
              <span className="bg-amber-400 text-black font-extrabold text-[10px] px-1.5 py-0.2 rounded-full">
                {pendingTopupCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("moderation")}
            className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
              activeTab === "moderation"
                ? "bg-primary text-primary-foreground shadow-[0_0_15px_rgba(0,180,216,0.4)]"
                : "bg-white/5 text-muted-foreground hover:bg-white/10"
            }`}
          >
            <Flag className="w-4 h-4" /> Moderación
            {pendingReportCount > 0 && (
              <span className="bg-red-500 text-white font-extrabold text-[10px] px-1.5 py-0.2 rounded-full">
                {pendingReportCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("tickets")}
            className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
              activeTab === "tickets"
                ? "bg-primary text-primary-foreground shadow-[0_0_15px_rgba(0,180,216,0.4)]"
                : "bg-white/5 text-muted-foreground hover:bg-white/10"
            }`}
          >
            <HelpCircle className="w-4 h-4" /> Soporte ({tickets.length})
            {pendingTicketCount > 0 && (
              <span className="bg-blue-400 text-black font-extrabold text-[10px] px-1.5 py-0.2 rounded-full">
                {pendingTicketCount}
              </span>
            )}
          </button>
        </div>

        {/* ─── TAB 1: OVERVIEW & KPIS ────────────────────────────────────────── */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="glass-panel p-5 rounded-2xl border border-primary/20 space-y-2">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="text-xs font-bold uppercase">Usuarios Totales</span>
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <div className="text-3xl font-extrabold text-foreground">{stats?.usersCount ?? allUsers.length}</div>
                <p className="text-[11px] text-muted-foreground">Perfiles registrados en el sistema</p>
              </div>

              <div className="glass-panel p-5 rounded-2xl border border-cyan-500/20 space-y-2">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="text-xs font-bold uppercase">Solicitudes KYC</span>
                  <ShieldCheck className="w-5 h-5 text-cyan-400" />
                </div>
                <div className="text-3xl font-extrabold text-cyan-400">{pendingKycCount}</div>
                <p className="text-[11px] text-muted-foreground">Pendientes de revisión y aprobación</p>
              </div>

              <div className="glass-panel p-5 rounded-2xl border border-amber-500/20 space-y-2">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="text-xs font-bold uppercase">Recargas Billetera</span>
                  <Coins className="w-5 h-5 text-amber-400" />
                </div>
                <div className="text-3xl font-extrabold text-amber-400">{pendingTopupCount}</div>
                <p className="text-[11px] text-muted-foreground">Solicitudes de saldo pendientes</p>
              </div>

              <div className="glass-panel p-5 rounded-2xl border border-red-500/20 space-y-2">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="text-xs font-bold uppercase">Reportes Activos</span>
                  <Flag className="w-5 h-5 text-destructive" />
                </div>
                <div className="text-3xl font-extrabold text-destructive">{pendingReportCount}</div>
                <p className="text-[11px] text-muted-foreground">Contenido denunciado por usuarios</p>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB 2: GESTIÓN DE USUARIOS ───────────────────────────────────── */}
        {activeTab === "users" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                <Input
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Buscar por nombre, usuario o email..."
                  className="pl-9 rounded-xl bg-white/5 text-xs"
                />
              </div>

              <span className="text-xs text-muted-foreground">
                Mostrando {filteredUsers.length} de {allUsers.length} usuarios
              </span>
            </div>

            <div className="glass-panel rounded-2xl overflow-hidden border border-border/40">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-white/5 border-b border-border/40 text-muted-foreground uppercase font-mono text-[10px]">
                    <tr>
                      <th className="p-3.5">Usuario</th>
                      <th className="p-3.5">Rol</th>
                      <th className="p-3.5">Estado</th>
                      <th className="p-3.5">Verificación</th>
                      <th className="p-3.5 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    {filteredUsers.map((u: any) => (
                      <tr key={u.id} className="hover:bg-white/5 transition-colors">
                        <td className="p-3.5 flex items-center gap-3">
                          <img
                            src={u.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.id}`}
                            className="w-9 h-9 rounded-full object-cover bg-muted"
                            alt=""
                          />
                          <div className="min-w-0">
                            <div className="font-bold text-foreground truncate flex items-center gap-1.5">
                              {u.displayName || u.username || "Usuario"}
                              {u.isVerified && <CheckCircle className="w-3.5 h-3.5 text-primary flex-none" />}
                            </div>
                            <div className="text-[11px] text-muted-foreground truncate">
                              @{u.username || "usuario"} · {u.email || u.id}
                            </div>
                          </div>
                        </td>

                        <td className="p-3.5">
                          <Badge
                            className={
                              u.role === "admin"
                                ? "bg-primary/20 text-primary border border-primary/40 font-bold"
                                : "bg-white/5 text-muted-foreground"
                            }
                          >
                            {u.role === "admin" ? "👑 Admin" : "Usuario"}
                          </Badge>
                        </td>

                        <td className="p-3.5">
                          <Badge
                            className={
                              u.isSuspended
                                ? "bg-destructive/20 text-destructive border border-destructive/40"
                                : "bg-green-500/20 text-green-400"
                            }
                          >
                            {u.isSuspended ? "Suspendido" : "Activo"}
                          </Badge>
                        </td>

                        <td className="p-3.5">
                          <Button
                            size="sm"
                            variant="ghost"
                            className={`h-7 px-2.5 rounded-lg text-xs gap-1 ${
                              u.isVerified ? "text-primary hover:text-primary/80" : "text-muted-foreground"
                            }`}
                            onClick={() => verifyUser.mutate({ userId: u.id, isVerified: !u.isVerified })}
                          >
                            <ShieldCheck className="w-3.5 h-3.5" />
                            {u.isVerified ? "Verificado ✓" : "Sin Verificar"}
                          </Button>
                        </td>

                        <td className="p-3.5 text-right space-x-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-[11px] rounded-lg"
                            onClick={() =>
                              updateRole.mutate({
                                userId: u.id,
                                role: u.role === "admin" ? "user" : "admin",
                              })
                            }
                          >
                            {u.role === "admin" ? "Quitar Admin" : "Hacer Admin"}
                          </Button>

                          <Button
                            size="sm"
                            variant={u.isSuspended ? "default" : "destructive"}
                            className="h-7 text-[11px] rounded-lg"
                            onClick={() =>
                              suspendUser.mutate({
                                userId: u.id,
                                isSuspended: !u.isSuspended,
                              })
                            }
                          >
                            {u.isSuspended ? "Reactivar" : "Suspender"}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB 3: VERIFICACIONES KYC ────────────────────────────────────── */}
        {activeTab === "kyc" && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex gap-2">
                {(["pending", "approved", "rejected", "all"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setKycFilter(tab)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                      kycFilter === tab
                        ? "bg-primary text-primary-foreground"
                        : "bg-white/5 text-muted-foreground hover:bg-white/10"
                    }`}
                  >
                    {tab === "pending"
                      ? `Pendientes (${pendingKycCount})`
                      : tab === "approved"
                      ? "Aprobadas"
                      : tab === "rejected"
                      ? "Rechazadas"
                      : "Todas"}
                  </button>
                ))}
              </div>
            </div>

            {filteredVerifs.length === 0 ? (
              <div className="glass-panel p-12 rounded-3xl text-center text-muted-foreground space-y-2">
                <ShieldCheck className="w-12 h-12 mx-auto text-muted-foreground/30" />
                <p className="text-base font-bold">No hay solicitudes de verificación con este filtro</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredVerifs.map((v) => (
                  <div
                    key={v.id}
                    className="glass-panel p-5 rounded-2xl border border-border/40 hover:border-primary/40 transition-all space-y-4 shadow-lg"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <img
                          src={v.userAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${v.userId}`}
                          className="w-10 h-10 rounded-full object-cover bg-muted border border-primary/30"
                          alt=""
                        />
                        <div>
                          <h4 className="font-bold text-sm text-foreground">
                            {v.entityTitle || v.userName || "Solicitante"}
                          </h4>
                          <p className="text-xs text-primary font-mono">
                            Tipo: {v.entityType === "profile" ? "👤 Perfil Personal" : `👥 ${v.entityType}`}
                          </p>
                        </div>
                      </div>

                      <Badge
                        className={
                          v.status === "approved"
                            ? "bg-green-500/20 text-green-400"
                            : v.status === "rejected"
                            ? "bg-red-500/20 text-red-400"
                            : "bg-amber-500/20 text-amber-400"
                        }
                      >
                        {v.status === "approved" ? "✓ Aprobado" : v.status === "rejected" ? "Rechazado" : "Pendiente"}
                      </Badge>
                    </div>

                    <div className="p-3 bg-white/5 rounded-xl text-xs space-y-1 font-mono">
                      <div>Documento: <strong>{v.documentType}</strong></div>
                      <div>Número: <strong>{v.documentNumber}</strong></div>
                    </div>

                    <div className="flex gap-2">
                      {v.frontImageUrl && (
                        <div
                          className="w-20 h-14 rounded-lg overflow-hidden border border-border/50 cursor-pointer"
                          onClick={() => setSelectedVerif(v)}
                        >
                          <img src={v.frontImageUrl} className="w-full h-full object-cover" alt="Frente" />
                        </div>
                      )}
                      {v.backImageUrl && (
                        <div
                          className="w-20 h-14 rounded-lg overflow-hidden border border-border/50 cursor-pointer"
                          onClick={() => setSelectedVerif(v)}
                        >
                          <img src={v.backImageUrl} className="w-full h-full object-cover" alt="Reverso" />
                        </div>
                      )}
                      {v.selfieImageUrl && (
                        <div
                          className="w-20 h-14 rounded-lg overflow-hidden border border-cyan-400/50 cursor-pointer"
                          onClick={() => setSelectedVerif(v)}
                        >
                          <img src={v.selfieImageUrl} className="w-full h-full object-cover" alt="Selfie" />
                        </div>
                      )}
                    </div>

                    <Button
                      size="sm"
                      className="w-full rounded-xl text-xs neon-btn font-bold"
                      onClick={() => setSelectedVerif(v)}
                    >
                      <Eye className="w-3.5 h-3.5 mr-1" /> Inspeccionar Documentos KYC
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── TAB 4: CONFIGURACIÓN DE BANCOS COLOMBIANOS ──────────────────── */}
        {activeTab === "banking" && (
          <form onSubmit={handleSaveBankingConfig} className="space-y-6">
            <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-primary/30 space-y-6 shadow-xl">
              <div className="space-y-1 border-b border-border/30 pb-3">
                <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-cyan-400" /> Configuración de Cuentas Receptoras (Colombia)
                </h3>
                <p className="text-xs text-muted-foreground">
                  Configura las cuentas oficiales de Nequi, Mercado Pago, Bancolombia y Daviplata donde los usuarios transferirán los fondos para recargar su saldo.
                </p>
              </div>

              {/* SECCIÓN 1: NEQUI */}
              <div className="p-5 rounded-2xl bg-purple-500/10 border border-purple-500/30 space-y-4">
                <div className="flex items-center gap-2 text-purple-300 font-bold text-sm">
                  <Smartphone className="w-4 h-4 text-purple-400" /> Cuenta Nequi
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground block mb-1">
                      Número Celular Nequi
                    </label>
                    <Input
                      value={bankingForm.nequiPhone}
                      onChange={(e) => setBankingForm({ ...bankingForm, nequiPhone: e.target.value })}
                      placeholder="Ej: 3123456789"
                      className="bg-black/40 rounded-xl text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-muted-foreground block mb-1">
                      Nombre del Titular Nequi
                    </label>
                    <Input
                      value={bankingForm.nequiName}
                      onChange={(e) => setBankingForm({ ...bankingForm, nequiName: e.target.value })}
                      placeholder="Ej: Menpoe Social Pagos"
                      className="bg-black/40 rounded-xl text-xs"
                    />
                  </div>
                </div>

                {/* Subida de QR Nequi */}
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">
                    Código QR Nequi (Opcional)
                  </label>
                  <input
                    ref={nequiQrInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleUploadNequiQr}
                  />
                  <div className="flex items-center gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="rounded-xl text-xs gap-1.5 border-purple-500/40 text-purple-300"
                      onClick={() => nequiQrInputRef.current?.click()}
                      disabled={uploadingNequiQr}
                    >
                      <ImagePlus className="w-3.5 h-3.5" />
                      {uploadingNequiQr ? "Subiendo..." : "Subir Imagen QR Nequi"}
                    </Button>
                    {bankingForm.nequiQrUrl && (
                      <span className="text-xs text-green-400 flex items-center gap-1 font-mono">
                        <Check className="w-3.5 h-3.5" /> QR configurado
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* SECCIÓN 2: MERCADO PAGO */}
              <div className="p-5 rounded-2xl bg-blue-500/10 border border-blue-500/30 space-y-4">
                <div className="flex items-center gap-2 text-blue-300 font-bold text-sm">
                  <CreditCard className="w-4 h-4 text-blue-400" /> Cuenta Mercado Pago
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground block mb-1">
                      Alias Mercado Pago (CVU)
                    </label>
                    <Input
                      value={bankingForm.mpAlias}
                      onChange={(e) => setBankingForm({ ...bankingForm, mpAlias: e.target.value })}
                      placeholder="Ej: menpoe.mp"
                      className="bg-black/40 rounded-xl text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-muted-foreground block mb-1">
                      Correo Asociado a Mercado Pago
                    </label>
                    <Input
                      value={bankingForm.mpEmail}
                      onChange={(e) => setBankingForm({ ...bankingForm, mpEmail: e.target.value })}
                      placeholder="Ej: pagos@menpoe.com"
                      className="bg-black/40 rounded-xl text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground block mb-1">
                      Link de Pago / Cobro Directo
                    </label>
                    <Input
                      value={bankingForm.mpPaymentLink}
                      onChange={(e) => setBankingForm({ ...bankingForm, mpPaymentLink: e.target.value })}
                      placeholder="Ej: https://link.mercadopago.com.co/menpoesocial"
                      className="bg-black/40 rounded-xl text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-muted-foreground block mb-1">
                      Nombre del Titular
                    </label>
                    <Input
                      value={bankingForm.mpName}
                      onChange={(e) => setBankingForm({ ...bankingForm, mpName: e.target.value })}
                      placeholder="Ej: Menpoe Colombia Oficial"
                      className="bg-black/40 rounded-xl text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* SECCIÓN 3: BANCOLOMBIA */}
              <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-4">
                <div className="flex items-center gap-2 text-amber-300 font-bold text-sm">
                  <Building2 className="w-4 h-4 text-amber-400" /> Cuenta Bancolombia
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground block mb-1">
                      Número de Cuenta
                    </label>
                    <Input
                      value={bankingForm.bancolombiaAccount}
                      onChange={(e) => setBankingForm({ ...bankingForm, bancolombiaAccount: e.target.value })}
                      placeholder="Ej: 123-456789-01"
                      className="bg-black/40 rounded-xl text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-muted-foreground block mb-1">
                      Tipo de Cuenta
                    </label>
                    <select
                      value={bankingForm.bancolombiaType}
                      onChange={(e: any) => setBankingForm({ ...bankingForm, bancolombiaType: e.target.value })}
                      className="w-full bg-black/40 border border-input rounded-xl p-2.5 text-xs text-foreground"
                    >
                      <option value="Ahorros">Cuenta de Ahorros</option>
                      <option value="Corriente">Cuenta Corriente</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-muted-foreground block mb-1">
                      Nombre del Titular
                    </label>
                    <Input
                      value={bankingForm.bancolombiaName}
                      onChange={(e) => setBankingForm({ ...bankingForm, bancolombiaName: e.target.value })}
                      placeholder="Ej: Menpoe Social S.A.S."
                      className="bg-black/40 rounded-xl text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* SECCIÓN 4: DAVIPLATA */}
              <div className="p-5 rounded-2xl bg-red-500/10 border border-red-500/30 space-y-4">
                <div className="flex items-center gap-2 text-red-300 font-bold text-sm">
                  <Smartphone className="w-4 h-4 text-red-400" /> Cuenta Daviplata
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground block mb-1">
                      Número Celular Daviplata
                    </label>
                    <Input
                      value={bankingForm.daviplataPhone}
                      onChange={(e) => setBankingForm({ ...bankingForm, daviplataPhone: e.target.value })}
                      placeholder="Ej: 3123456789"
                      className="bg-black/40 rounded-xl text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-muted-foreground block mb-1">
                      Nombre del Titular Daviplata
                    </label>
                    <Input
                      value={bankingForm.daviplataName}
                      onChange={(e) => setBankingForm({ ...bankingForm, daviplataName: e.target.value })}
                      placeholder="Ej: Menpoe Social Pagos"
                      className="bg-black/40 rounded-xl text-xs"
                    />
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full rounded-2xl neon-btn font-extrabold text-sm py-3.5 shadow-xl gap-2"
                disabled={updateBanking.isPending}
              >
                <Save className="w-4 h-4" />
                {updateBanking.isPending ? "Guardando..." : "Guardar Configuración de Bancos"}
              </Button>
            </div>
          </form>
        )}

        {/* ─── TAB 5: RECARGAS Y DEPÓSITOS ─────────────────────────────────── */}
        {activeTab === "wallet" && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <Coins className="w-5 h-5 text-amber-400" /> Solicitudes de Depósito y Recarga de Fondos
            </h3>

            {pendingTopups.length === 0 ? (
              <div className="glass-panel p-12 rounded-3xl text-center text-muted-foreground">
                <Coins className="w-12 h-12 mx-auto mb-2 text-muted-foreground/30" />
                <p className="font-bold">No hay recargas pendientes de aprobación</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pendingTopups.map((t: any) => (
                  <div key={t.id} className="glass-panel p-5 rounded-2xl border border-amber-500/30 space-y-3 shadow-lg">
                    <div className="flex items-center justify-between">
                      <Badge className="bg-amber-500/20 text-amber-400 font-mono text-sm px-2.5 py-1">
                        💰 {t.priceLabel || formatCOP(t.tokens)}
                      </Badge>
                      <span className="text-xs text-muted-foreground font-mono">
                        {format(new Date(t.createdAt || Date.now()), "d MMM, h:mm a", { locale: es })}
                      </span>
                    </div>

                    <div className="text-xs space-y-1.5 bg-white/5 p-3 rounded-xl">
                      <p><strong>ID Usuario:</strong> <span className="font-mono text-primary">{t.userId}</span></p>
                      <p><strong>Método de Pago:</strong> <Badge variant="outline" className="text-[10px] ml-1">{t.paymentMethodLabel || "Nequi / Bancos"}</Badge></p>
                      {t.reference && <p><strong>N° Comprobante:</strong> <span className="font-mono">{t.reference}</span></p>}
                      {t.note && <p className="text-muted-foreground">Nota: {t.note}</p>}
                    </div>

                    {/* Comprobante Adjunto */}
                    {t.receiptUrl && (
                      <div className="space-y-1">
                        <span className="text-[11px] text-muted-foreground block">Comprobante Adjunto:</span>
                        <div
                          className="w-full h-32 rounded-xl overflow-hidden border border-border/50 cursor-pointer relative group bg-black/40"
                          onClick={() => setSelectedVoucherUrl(t.receiptUrl)}
                        >
                          <img src={t.receiptUrl} className="w-full h-full object-contain" alt="Comprobante" />
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-xs font-bold text-white transition-opacity">
                            <Eye className="w-4 h-4 mr-1" /> Ver Comprobante en Grande
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2 pt-2">
                      <Button
                        size="sm"
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-bold"
                        onClick={() => reviewTopUp.mutate({ topUpId: t.id, action: "approve" })}
                      >
                        ✓ Aprobar & Acreditar Saldo
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="flex-1 rounded-xl text-xs font-bold"
                        onClick={() => reviewTopUp.mutate({ topUpId: t.id, action: "reject" })}
                      >
                        ✕ Rechazar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── TAB 6: MODERACIÓN Y REPORTES ─────────────────────────────────── */}
        {activeTab === "moderation" && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <Flag className="w-5 h-5 text-destructive" /> Reportes de Contenido y Denuncias
            </h3>

            {reports.length === 0 ? (
              <div className="glass-panel p-12 rounded-3xl text-center text-muted-foreground">
                <Flag className="w-12 h-12 mx-auto mb-2 text-muted-foreground/30" />
                <p className="font-bold">No hay denuncias de contenido registradas</p>
              </div>
            ) : (
              <div className="space-y-3">
                {reports.map((r: any) => (
                  <div key={r.id} className="glass-panel p-4 rounded-2xl border border-destructive/30 space-y-2">
                    <div className="flex items-center justify-between">
                      <Badge className="bg-destructive/20 text-destructive text-xs">
                        Motivo: {r.reason || "Contenido inapropiado"}
                      </Badge>
                      <Badge className={r.status === "resolved" ? "bg-green-500/20 text-green-400" : "bg-amber-500/20 text-amber-400"}>
                        {r.status === "resolved" ? "Resuelto" : "Pendiente"}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      <p><strong>Tipo:</strong> {r.targetType} (ID: {r.targetId})</p>
                      {r.description && <p><strong>Detalle:</strong> {r.description}</p>}
                    </div>
                    {r.status === "pending" && (
                      <div className="flex justify-end gap-2 pt-2">
                        <Button
                          size="sm"
                          variant="destructive"
                          className="rounded-xl text-xs"
                          onClick={async () => {
                            await resolveReport(r.id, "actioned");
                            toast({ title: "Contenido/usuario sancionado" });
                            void refetchReports();
                          }}
                        >
                          Eliminar Contenido / Sancionar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-xl text-xs"
                          onClick={async () => {
                            await resolveReport(r.id, "dismissed");
                            toast({ title: "Reporte descartado" });
                            void refetchReports();
                          }}
                        >
                          Descartar Reporte
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── TAB 7: TICKETS DE SOPORTE ───────────────────────────────────── */}
        {activeTab === "tickets" && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-blue-400" /> Tickets y Mensajes de Ayuda
            </h3>

            {tickets.length === 0 ? (
              <div className="glass-panel p-12 rounded-3xl text-center text-muted-foreground">
                <HelpCircle className="w-12 h-12 mx-auto mb-2 text-muted-foreground/30" />
                <p className="font-bold">No hay tickets de soporte abiertos</p>
              </div>
            ) : (
              <div className="space-y-3">
                {tickets.map((t: any) => (
                  <div key={t.id} className="glass-panel p-5 rounded-2xl border border-border/40 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-sm">{t.subject || "Consulta de Usuario"}</h4>
                      <Badge className={t.status === "resolved" ? "bg-green-500/20 text-green-400" : "bg-blue-500/20 text-blue-400"}>
                        {t.status === "resolved" ? "Resuelto ✓" : "Abierto"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground bg-white/5 p-3 rounded-xl leading-relaxed">
                      {t.message}
                    </p>
                    {t.adminReply && (
                      <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 text-xs">
                        <span className="font-bold text-primary block mb-1">Respuesta del Administrador:</span>
                        <p className="text-muted-foreground">{t.adminReply}</p>
                      </div>
                    )}
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-xl text-xs"
                        onClick={() => setSelectedTicket(t)}
                      >
                        Responder / Gestionar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Modal de Comprobante en Grande */}
        {selectedVoucherUrl && (
          <AppModal open onClose={() => setSelectedVoucherUrl(null)} className="w-full max-w-xl">
            <div className="glass-panel p-6 rounded-3xl border border-primary/30 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-base">Comprobante de Depósito</h3>
                <button onClick={() => setSelectedVoucherUrl(null)}>
                  <XCircle className="w-5 h-5 text-muted-foreground hover:text-foreground" />
                </button>
              </div>
              <div className="rounded-2xl overflow-hidden bg-black p-2 max-h-[75vh] flex items-center justify-center">
                <img src={selectedVoucherUrl} className="max-h-[70vh] object-contain" alt="Comprobante" />
              </div>
            </div>
          </AppModal>
        )}

        {/* Modal de Inspección KYC */}
        {selectedVerif && (
          <AppModal open onClose={() => setSelectedVerif(null)} className="w-full max-w-2xl">
            <div className="glass-panel p-6 rounded-3xl border border-primary/30 max-h-[90vh] overflow-y-auto space-y-5">
              <div className="flex items-center justify-between border-b border-border/40 pb-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-6 h-6 text-cyan-400" />
                  <h3 className="text-xl font-bold">Inspección de Documento KYC</h3>
                </div>
                <button onClick={() => setSelectedVerif(null)} className="text-muted-foreground hover:text-foreground">
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs bg-white/5 p-4 rounded-xl font-mono">
                <div>Solicitante: <strong>{selectedVerif.userName}</strong></div>
                <div>ID Usuario: <strong>{selectedVerif.userId}</strong></div>
                <div>Tipo Documento: <strong>{selectedVerif.documentType}</strong></div>
                <div>Número: <strong>{selectedVerif.documentNumber}</strong></div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {selectedVerif.frontImageUrl && (
                  <div className="space-y-1 text-center">
                    <span className="text-[11px] text-muted-foreground font-semibold">Foto Frontal</span>
                    <div className="rounded-xl overflow-hidden border border-primary/30 bg-black/50 p-1">
                      <img src={selectedVerif.frontImageUrl} className="w-full h-44 object-contain" alt="Frente" />
                    </div>
                  </div>
                )}

                {selectedVerif.backImageUrl && (
                  <div className="space-y-1 text-center">
                    <span className="text-[11px] text-muted-foreground font-semibold">Foto Reverso</span>
                    <div className="rounded-xl overflow-hidden border border-primary/30 bg-black/50 p-1">
                      <img src={selectedVerif.backImageUrl} className="w-full h-44 object-contain" alt="Reverso" />
                    </div>
                  </div>
                )}
              </div>

              {selectedVerif.selfieImageUrl && (
                <div className="space-y-1 text-center">
                  <span className="text-[11px] text-cyan-400 font-bold">Selfie con Documento</span>
                  <div className="rounded-xl overflow-hidden border border-cyan-400/50 bg-black/50 p-1 max-w-sm mx-auto">
                    <img src={selectedVerif.selfieImageUrl} className="w-full h-48 object-contain" alt="Selfie" />
                  </div>
                </div>
              )}

              <div className="p-4 rounded-2xl bg-white/5 border border-border/40 space-y-3">
                <Button
                  className="w-full bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold py-3"
                  onClick={() => handleApproveKyc(selectedVerif)}
                  disabled={reviewVerif.isPending}
                >
                  ✓ Aprobar y Otorgar Verificación
                </Button>

                <div className="pt-2 border-t border-border/30 space-y-2">
                  <Input
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Motivo del rechazo..."
                    className="bg-black/30 text-xs rounded-xl"
                  />
                  <Button
                    variant="destructive"
                    size="sm"
                    className="w-full rounded-xl"
                    onClick={() => handleRejectKyc(selectedVerif)}
                    disabled={reviewVerif.isPending}
                  >
                    ✕ Rechazar con Motivo
                  </Button>
                </div>
              </div>
            </div>
          </AppModal>
        )}

        {/* Modal de Respuesta a Ticket */}
        {selectedTicket && (
          <AppModal open onClose={() => setSelectedTicket(null)} className="w-full max-w-lg">
            <div className="glass-panel p-6 rounded-3xl border border-primary/30 space-y-4">
              <h3 className="text-lg font-bold">Gestionar Ticket de Soporte</h3>
              <p className="text-xs text-muted-foreground">{selectedTicket.message}</p>
              <textarea
                value={ticketReplyText}
                onChange={(e) => setTicketReplyText(e.target.value)}
                placeholder="Escribe la respuesta para el usuario..."
                rows={3}
                className="w-full bg-black/30 border border-border/50 rounded-xl p-3 text-xs resize-none"
              />
              <Button
                className="w-full rounded-xl neon-btn text-xs font-bold"
                onClick={async () => {
                  await updateTicket.mutateAsync({
                    ticketId: selectedTicket.id,
                    status: "resolved",
                    reply: ticketReplyText,
                  });
                  toast({ title: "Ticket respondido y resuelto ✓" });
                  setSelectedTicket(null);
                  setTicketReplyText("");
                }}
              >
                Enviar Respuesta & Resolver
              </Button>
            </div>
          </AppModal>
        )}
      </div>
    </Shell>
  );
}
