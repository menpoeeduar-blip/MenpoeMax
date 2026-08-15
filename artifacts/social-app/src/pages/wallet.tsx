import { useState, useRef } from "react";
import { Shell } from "@/components/layout/Shell";
import {
  useGetWallet,
  useGetWalletTransactions,
  useGetBankingConfig,
  useRequestCustomTopUp,
  useTransferFundsToUser,
  useSearchUsersForTransfer,
  useGetMe,
  type BankingConfig,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AppModal } from "@/components/ui/app-modal";
import { formatCOP } from "@/lib/format-currency";
import { uploadFile } from "@/lib/upload";
import {
  Coins,
  Clock,
  ArrowDownLeft,
  ArrowUpRight,
  Sparkles,
  Send,
  CreditCard,
  Building2,
  Copy,
  Check,
  CheckCircle,
  Search,
  User,
  UploadCloud,
  FileText,
  XCircle,
  ExternalLink,
  ShieldCheck,
  History,
  QrCode,
  Smartphone,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const PRESET_AMOUNTS = [
  { value: 10000, label: "$ 10.000 COP" },
  { value: 25000, label: "$ 25.000 COP" },
  { value: 50000, label: "$ 50.000 COP" },
  { value: 100000, label: "$ 100.000 COP" },
  { value: 200000, label: "$ 200.000 COP" },
  { value: 500000, label: "$ 500.000 COP" },
];

type PaymentMethodType = "nequi" | "mercadopago" | "bancolombia" | "daviplata";

export default function WalletPage() {
  const { data: wallet, isLoading: loadingWallet } = useGetWallet();
  const { data: transactions = [], isLoading: loadingTx } = useGetWalletTransactions();
  const { data: bankingConfig } = useGetBankingConfig();
  const { data: me } = useGetMe();
  const requestTopUp = useRequestCustomTopUp();
  const transferFunds = useTransferFundsToUser();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<"deposit" | "transfer" | "history">("deposit");

  // ─── ESTADOS DE DEPÓSITO ───────────────────────────────────────────────────
  const [selectedAmount, setSelectedAmount] = useState<number>(50000);
  const [customAmountStr, setCustomAmountStr] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>("nequi");
  const [receiptUrl, setReceiptUrl] = useState<string>("");
  const [reference, setReference] = useState<string>("");
  const [depositNote, setDepositNote] = useState<string>("");
  const [uploadingReceipt, setUploadingReceipt] = useState<boolean>(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ─── ESTADOS DE TRANSFERENCIA P2P ──────────────────────────────────────────
  const [userQuery, setUserQuery] = useState("");
  const [selectedRecipient, setSelectedRecipient] = useState<any | null>(null);
  const [transferAmount, setTransferAmount] = useState("");
  const [transferConcept, setTransferConcept] = useState("");
  const [showSuccessTransferModal, setShowSuccessTransferModal] = useState(false);
  const [lastTransferReceipt, setLastTransferReceipt] = useState<any | null>(null);

  const { data: foundUsers = [], isLoading: searchingUsers } = useSearchUsersForTransfer(userQuery);

  const currentBalance = wallet?.balance ?? 0;
  const depositAmount = customAmountStr ? Number(customAmountStr) : selectedAmount;

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast({ title: "Copiado al portapapeles ✓", description: text });
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleUploadReceipt = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingReceipt(true);
    try {
      const url = await uploadFile(file, { purpose: "post" });
      setReceiptUrl(url);
      toast({ title: "Comprobante cargado ✓" });
    } catch {
      toast({ title: "Error al cargar comprobante", variant: "destructive" });
    } finally {
      setUploadingReceipt(false);
      e.target.value = "";
    }
  };

  const handleSendDepositRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!depositAmount || depositAmount < 5000) {
      toast({ title: "Monto inválido", description: "El depósito mínimo es $5.000 COP.", variant: "destructive" });
      return;
    }

    const methodLabels: Record<PaymentMethodType, string> = {
      nequi: "Nequi",
      mercadopago: "Mercado Pago",
      bancolombia: "Bancolombia",
      daviplata: "Daviplata",
    };

    try {
      await requestTopUp.mutateAsync({
        amount: depositAmount,
        paymentMethod,
        paymentMethodLabel: methodLabels[paymentMethod],
        receiptUrl,
        reference: reference.trim(),
        note: depositNote.trim(),
      });

      toast({
        title: "¡Solicitud de depósito enviada! 🚀",
        description: `Tu depósito de ${formatCOP(depositAmount)} por ${methodLabels[paymentMethod]} está en revisión.`,
      });

      setReceiptUrl("");
      setReference("");
      setDepositNote("");
      setCustomAmountStr("");
      setActiveTab("history");
    } catch (err: any) {
      toast({ title: "Error en depósito", description: err.message, variant: "destructive" });
    }
  };

  const handleExecuteTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecipient) {
      toast({ title: "Selecciona un destinatario", variant: "destructive" });
      return;
    }
    const amountNum = Number(transferAmount);
    if (!amountNum || amountNum < 1000) {
      toast({ title: "Monto inválido", description: "La transferencia mínima es $1.000 COP.", variant: "destructive" });
      return;
    }
    if (amountNum > currentBalance) {
      toast({
        title: "Saldo insuficiente",
        description: `Tienes ${formatCOP(currentBalance)} disponibles.`,
        variant: "destructive",
      });
      return;
    }

    try {
      const res = await transferFunds.mutateAsync({
        recipientUserId: selectedRecipient.id,
        recipientName: selectedRecipient.displayName || selectedRecipient.username,
        amount: amountNum,
        concept: transferConcept.trim() || "Transferencia directa",
      });

      setLastTransferReceipt({
        amount: amountNum,
        recipient: selectedRecipient,
        concept: transferConcept.trim() || "Transferencia directa",
        date: new Date().toISOString(),
      });
      setShowSuccessTransferModal(true);

      setSelectedRecipient(null);
      setUserQuery("");
      setTransferAmount("");
      setTransferConcept("");
    } catch (err: any) {
      toast({ title: "Error en transferencia", description: err.message, variant: "destructive" });
    }
  };

  return (
    <Shell>
      <div className="max-w-4xl mx-auto w-full p-4 pb-24 space-y-6">
        {/* Modal de Comprobante Exitoso de Transferencia */}
        {showSuccessTransferModal && lastTransferReceipt && (
          <AppModal open onClose={() => setShowSuccessTransferModal(false)} className="w-full max-w-md">
            <div className="glass-panel neon-border rounded-3xl p-6 text-center space-y-4 shadow-2xl">
              <div className="w-16 h-16 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center mx-auto border border-green-500/40">
                <CheckCircle className="w-10 h-10" />
              </div>
              <h3 className="text-xl font-extrabold text-foreground">¡Transferencia Exitosa!</h3>
              <p className="text-3xl font-extrabold text-green-400 neon-text">
                {formatCOP(lastTransferReceipt.amount)}
              </p>

              <div className="p-4 rounded-2xl bg-white/5 border border-border/40 text-left text-xs space-y-2 font-mono">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Destinatario:</span>
                  <span className="font-bold text-foreground">{lastTransferReceipt.recipient.displayName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Usuario:</span>
                  <span className="text-primary">@{lastTransferReceipt.recipient.username}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Concepto:</span>
                  <span className="text-foreground">{lastTransferReceipt.concept}</span>
                </div>
                <div className="flex justify-between border-t border-border/30 pt-2">
                  <span className="text-muted-foreground">Fecha y Hora:</span>
                  <span className="text-muted-foreground">{format(new Date(lastTransferReceipt.date), "dd/MM/yyyy HH:mm")}</span>
                </div>
              </div>

              <Button
                className="w-full rounded-xl neon-btn font-bold py-3"
                onClick={() => setShowSuccessTransferModal(false)}
              >
                Listo
              </Button>
            </div>
          </AppModal>
        )}

        {/* Tarjeta Principal de Saldo */}
        <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-primary/30 shadow-2xl relative overflow-hidden bg-gradient-to-r from-primary/15 via-background to-accent/15">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Badge className="bg-primary/20 text-primary border border-primary/40 font-mono text-xs px-2.5 py-0.5">
                  💰 BILLETERA DIGITAL
                </Badge>
                <span className="text-xs text-muted-foreground font-mono">MENPOE PAY · COLOMBIA</span>
              </div>
              <h1 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Saldo Disponible
              </h1>
              <div className="text-3xl sm:text-5xl font-black text-cyan-300 neon-text tracking-tight">
                {loadingWallet ? "..." : formatCOP(currentBalance)}
              </div>
              <p className="text-xs text-muted-foreground">
                Úsalo para enviar regalos, comprar en Marketplace, promocionar anuncios o transferir a otros usuarios.
              </p>
            </div>

            <div className="flex sm:flex-col gap-2">
              <Button
                className="flex-1 sm:flex-none rounded-2xl neon-btn font-bold text-xs gap-1.5 py-2.5"
                onClick={() => setActiveTab("deposit")}
              >
                <ArrowDownLeft className="w-4 h-4 text-cyan-300" /> Depositar
              </Button>
              <Button
                variant="outline"
                className="flex-1 sm:flex-none rounded-2xl text-xs font-bold gap-1.5 py-2.5 border-primary/40 text-primary hover:bg-primary/10"
                onClick={() => setActiveTab("transfer")}
              >
                <Send className="w-4 h-4 text-primary" /> Transferir
              </Button>
            </div>
          </div>
        </div>

        {/* Notificación de Recarga Pendiente */}
        {wallet?.pendingTopUp && (
          <div className="glass-panel rounded-2xl p-4 flex items-start gap-3 border border-amber-500/30 bg-amber-500/10 shadow-lg">
            <Clock className="w-5 h-5 text-amber-400 shrink-0 mt-0.5 animate-pulse" />
            <div className="text-xs space-y-0.5">
              <p className="font-bold text-amber-300">Tienes una solicitud de depósito en proceso</p>
              <p className="text-muted-foreground">
                Monto: <strong>{wallet.pendingTopUp.priceLabel || formatCOP(wallet.pendingTopUp.tokens)}</strong>. El administrador validará el pago y acreditará tu saldo de inmediato.
              </p>
            </div>
          </div>
        )}

        {/* Pestañas de Navegación */}
        <div className="flex gap-2 border-b border-border/40 pb-2">
          <button
            type="button"
            onClick={() => setActiveTab("deposit")}
            className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
              activeTab === "deposit"
                ? "bg-primary text-primary-foreground shadow-[0_0_15px_rgba(0,180,216,0.4)]"
                : "bg-white/5 text-muted-foreground hover:bg-white/10"
            }`}
          >
            <CreditCard className="w-4 h-4" /> Depositar / Recargar
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("transfer")}
            className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
              activeTab === "transfer"
                ? "bg-primary text-primary-foreground shadow-[0_0_15px_rgba(0,180,216,0.4)]"
                : "bg-white/5 text-muted-foreground hover:bg-white/10"
            }`}
          >
            <Send className="w-4 h-4" /> Transferir a Usuario
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("history")}
            className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
              activeTab === "history"
                ? "bg-primary text-primary-foreground shadow-[0_0_15px_rgba(0,180,216,0.4)]"
                : "bg-white/5 text-muted-foreground hover:bg-white/10"
            }`}
          >
            <History className="w-4 h-4" /> Historial de Movimientos ({transactions.length})
          </button>
        </div>

        {/* ─── PESTAÑA 1: DEPÓSITOS Y MÉTODOS DE PAGO ──────────────────────── */}
        {activeTab === "deposit" && (
          <form onSubmit={handleSendDepositRequest} className="space-y-6">
            {/* Paso 1: Seleccionar Monto */}
            <div className="glass-panel p-6 rounded-3xl border border-border/40 space-y-4 shadow-xl">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center">
                  1
                </span>
                <h3 className="font-bold text-base text-foreground">Selecciona el Monto a Depositar</h3>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {PRESET_AMOUNTS.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => {
                      setSelectedAmount(item.value);
                      setCustomAmountStr("");
                    }}
                    className={`p-3.5 rounded-2xl border text-left transition-all ${
                      selectedAmount === item.value && !customAmountStr
                        ? "bg-primary/20 border-cyan-400 text-cyan-300 font-extrabold shadow-[0_0_12px_rgba(6,182,212,0.3)]"
                        : "bg-white/5 border-border/40 hover:border-primary/40 text-muted-foreground"
                    }`}
                  >
                    <div className="text-sm font-bold text-foreground">{item.label}</div>
                  </button>
                ))}
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">
                  O ingresa otro monto personalizado (COP):
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-3 text-xs font-bold text-primary">$</span>
                  <Input
                    type="number"
                    min="5000"
                    step="1000"
                    placeholder="Monto mínimo $5.000 COP"
                    value={customAmountStr}
                    onChange={(e) => setCustomAmountStr(e.target.value)}
                    className="pl-7 rounded-xl bg-white/5 text-sm font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Paso 2: Seleccionar Método de Pago */}
            <div className="glass-panel p-6 rounded-3xl border border-border/40 space-y-4 shadow-xl">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center">
                  2
                </span>
                <h3 className="font-bold text-base text-foreground">Elige el Método de Depósito</h3>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {/* Nequi */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod("nequi")}
                  className={`p-4 rounded-2xl border flex flex-col items-center justify-center text-center transition-all ${
                    paymentMethod === "nequi"
                      ? "bg-purple-500/20 border-purple-400 text-purple-300 shadow-[0_0_15px_rgba(168,85,247,0.4)]"
                      : "bg-white/5 border-border/40 hover:border-purple-400/40 text-muted-foreground"
                  }`}
                >
                  <Smartphone className="w-7 h-7 mb-1 text-purple-400" />
                  <span className="text-xs font-bold">Nequi</span>
                  <span className="text-[10px] opacity-70">Transferencia o QR</span>
                </button>

                {/* Mercado Pago */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod("mercadopago")}
                  className={`p-4 rounded-2xl border flex flex-col items-center justify-center text-center transition-all ${
                    paymentMethod === "mercadopago"
                      ? "bg-blue-500/20 border-blue-400 text-blue-300 shadow-[0_0_15px_rgba(59,130,246,0.4)]"
                      : "bg-white/5 border-border/40 hover:border-blue-400/40 text-muted-foreground"
                  }`}
                >
                  <CreditCard className="w-7 h-7 mb-1 text-blue-400" />
                  <span className="text-xs font-bold">Mercado Pago</span>
                  <span className="text-[10px] opacity-70">Alias / Tarjetas</span>
                </button>

                {/* Bancolombia */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod("bancolombia")}
                  className={`p-4 rounded-2xl border flex flex-col items-center justify-center text-center transition-all ${
                    paymentMethod === "bancolombia"
                      ? "bg-amber-500/20 border-amber-400 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.4)]"
                      : "bg-white/5 border-border/40 hover:border-amber-400/40 text-muted-foreground"
                  }`}
                >
                  <Building2 className="w-7 h-7 mb-1 text-amber-400" />
                  <span className="text-xs font-bold">Bancolombia</span>
                  <span className="text-[10px] opacity-70">Ahorros / Corriente</span>
                </button>

                {/* Daviplata */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod("daviplata")}
                  className={`p-4 rounded-2xl border flex flex-col items-center justify-center text-center transition-all ${
                    paymentMethod === "daviplata"
                      ? "bg-red-500/20 border-red-400 text-red-300 shadow-[0_0_15px_rgba(239,68,68,0.4)]"
                      : "bg-white/5 border-border/40 hover:border-red-400/40 text-muted-foreground"
                  }`}
                >
                  <Smartphone className="w-7 h-7 mb-1 text-red-400" />
                  <span className="text-xs font-bold">Daviplata</span>
                  <span className="text-[10px] opacity-70">Transferencia móvil</span>
                </button>
              </div>

              {/* Información Oficial de la Cuenta Seleccionada */}
              <div className="p-4 rounded-2xl bg-white/5 border border-primary/30 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-cyan-300 uppercase tracking-wider">
                    Datos de Pago Oficiales — Realiza la transferencia a:
                  </span>
                  <Badge className="bg-primary/20 text-primary text-[10px]">Verificado Oficial ✓</Badge>
                </div>

                {/* NEQUI */}
                {paymentMethod === "nequi" && (
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-black/30">
                      <div>
                        <span className="text-muted-foreground block text-[11px]">Número Celular Nequi:</span>
                        <strong className="font-mono text-sm text-foreground">
                          {bankingConfig?.nequiPhone || "3123456789"}
                        </strong>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-8 gap-1 text-xs"
                        onClick={() => copyToClipboard(bankingConfig?.nequiPhone || "3123456789", "nequiPhone")}
                      >
                        {copiedKey === "nequiPhone" ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                        Copiar
                      </Button>
                    </div>

                    <div className="p-2.5 rounded-xl bg-black/30">
                      <span className="text-muted-foreground block text-[11px]">Titular de la cuenta:</span>
                      <strong className="text-foreground">{bankingConfig?.nequiName || "Menpoe Social Pagos"}</strong>
                    </div>

                    {bankingConfig?.nequiQrUrl && (
                      <div className="text-center pt-2">
                        <span className="text-[11px] text-muted-foreground block mb-1">Escanea el código QR de Nequi:</span>
                        <img
                          src={bankingConfig.nequiQrUrl}
                          className="w-40 h-40 object-contain mx-auto rounded-xl border border-purple-400/40 p-1 bg-white"
                          alt="QR Nequi"
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* MERCADO PAGO */}
                {paymentMethod === "mercadopago" && (
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-black/30">
                      <div>
                        <span className="text-muted-foreground block text-[11px]">Alias Mercado Pago:</span>
                        <strong className="font-mono text-sm text-foreground">
                          {bankingConfig?.mpAlias || "menpoe.mp"}
                        </strong>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-8 gap-1 text-xs"
                        onClick={() => copyToClipboard(bankingConfig?.mpAlias || "menpoe.mp", "mpAlias")}
                      >
                        {copiedKey === "mpAlias" ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                        Copiar
                      </Button>
                    </div>

                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-black/30">
                      <div>
                        <span className="text-muted-foreground block text-[11px]">Correo Mercado Pago:</span>
                        <strong className="font-mono text-sm text-foreground">
                          {bankingConfig?.mpEmail || "pagos@menpoe.com"}
                        </strong>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-8 gap-1 text-xs"
                        onClick={() => copyToClipboard(bankingConfig?.mpEmail || "pagos@menpoe.com", "mpEmail")}
                      >
                        {copiedKey === "mpEmail" ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                        Copiar
                      </Button>
                    </div>

                    {bankingConfig?.mpPaymentLink && (
                      <div className="pt-1">
                        <a
                          href={bankingConfig.mpPaymentLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs text-cyan-400 hover:underline font-bold"
                        >
                          <ExternalLink className="w-3.5 h-3.5" /> Pagar directamente mediante el Link Oficial de Mercado Pago
                        </a>
                      </div>
                    )}
                  </div>
                )}

                {/* BANCOLOMBIA */}
                {paymentMethod === "bancolombia" && (
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-black/30">
                      <div>
                        <span className="text-muted-foreground block text-[11px]">Número de Cuenta ({bankingConfig?.bancolombiaType || "Ahorros"}):</span>
                        <strong className="font-mono text-sm text-foreground">
                          {bankingConfig?.bancolombiaAccount || "123-456789-01"}
                        </strong>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-8 gap-1 text-xs"
                        onClick={() => copyToClipboard(bankingConfig?.bancolombiaAccount || "123-456789-01", "bancolombiaAccount")}
                      >
                        {copiedKey === "bancolombiaAccount" ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                        Copiar
                      </Button>
                    </div>
                    <div className="p-2.5 rounded-xl bg-black/30">
                      <span className="text-muted-foreground block text-[11px]">Titular:</span>
                      <strong className="text-foreground">{bankingConfig?.bancolombiaName || "Menpoe Social S.A.S."}</strong>
                    </div>
                  </div>
                )}

                {/* DAVIPLATA */}
                {paymentMethod === "daviplata" && (
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-black/30">
                      <div>
                        <span className="text-muted-foreground block text-[11px]">Número Celular Daviplata:</span>
                        <strong className="font-mono text-sm text-foreground">
                          {bankingConfig?.daviplataPhone || "3123456789"}
                        </strong>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-8 gap-1 text-xs"
                        onClick={() => copyToClipboard(bankingConfig?.daviplataPhone || "3123456789", "daviplataPhone")}
                      >
                        {copiedKey === "daviplataPhone" ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                        Copiar
                      </Button>
                    </div>
                    <div className="p-2.5 rounded-xl bg-black/30">
                      <span className="text-muted-foreground block text-[11px]">Titular:</span>
                      <strong className="text-foreground">{bankingConfig?.daviplataName || "Menpoe Social Pagos"}</strong>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Paso 3: Adjuntar Comprobante */}
            <div className="glass-panel p-6 rounded-3xl border border-border/40 space-y-4 shadow-xl">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center">
                  3
                </span>
                <h3 className="font-bold text-base text-foreground">Adjunta el Comprobante de Pago</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">
                    Número de Comprobante / Referencia
                  </label>
                  <Input
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    placeholder="Ej: M12345678 / Ref: 89012"
                    className="rounded-xl bg-white/5 text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">
                    Nota o Comentario (Opcional)
                  </label>
                  <Input
                    value={depositNote}
                    onChange={(e) => setDepositNote(e.target.value)}
                    placeholder="Ej: Depósito desde cuenta personal..."
                    className="rounded-xl bg-white/5 text-xs"
                  />
                </div>
              </div>

              {/* Caja de subida de imagen */}
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleUploadReceipt}
                />

                {uploadingReceipt ? (
                  <div className="p-6 border border-dashed border-primary/50 rounded-2xl flex flex-col items-center justify-center gap-2 bg-white/5">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    <span className="text-xs text-muted-foreground">Subiendo comprobante...</span>
                  </div>
                ) : receiptUrl ? (
                  <div className="relative w-full max-w-sm mx-auto rounded-2xl overflow-hidden border border-primary/50 group">
                    <img src={receiptUrl} className="w-full h-44 object-contain bg-black/60 p-2" alt="Comprobante" />
                    <button
                      type="button"
                      onClick={() => setReceiptUrl("")}
                      className="absolute top-2 right-2 bg-black/80 text-white p-1.5 rounded-full hover:bg-red-600 transition-colors"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full p-6 border border-dashed border-border/60 hover:border-primary/60 rounded-2xl flex flex-col items-center justify-center gap-2 bg-white/5 hover:bg-white/10 transition-all text-muted-foreground hover:text-foreground"
                  >
                    <UploadCloud className="w-8 h-8 text-cyan-400" />
                    <span className="text-xs font-bold text-cyan-300">
                      Subir foto o captura del comprobante / voucher
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      Formatos JPG, PNG o captura de pantalla
                    </span>
                  </button>
                )}
              </div>

              <Button
                type="submit"
                className="w-full rounded-2xl neon-btn font-extrabold text-sm py-3.5 shadow-xl"
                disabled={requestTopUp.isPending || uploadingReceipt}
              >
                {requestTopUp.isPending ? "Enviando solicitud..." : `Confirmar Depósito de ${formatCOP(depositAmount)}`}
              </Button>
            </div>
          </form>
        )}

        {/* ─── PESTAÑA 2: TRANSFERENCIA DE FONDOS P2P ─────────────────────── */}
        {activeTab === "transfer" && (
          <form onSubmit={handleExecuteTransfer} className="space-y-6">
            <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-primary/30 space-y-5 shadow-xl">
              <div className="space-y-1 border-b border-border/30 pb-3">
                <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
                  <Send className="w-5 h-5 text-cyan-400" /> Transferencia Inmediata entre Usuarios
                </h3>
                <p className="text-xs text-muted-foreground">
                  Transfiere saldo en COP a cualquier amigo o vendedor en Menpoe al instante y sin comisiones.
                </p>
              </div>

              {/* Paso 1: Buscar Destinatario */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                  1. Destinatario (Buscar por @usuario, nombre, correo o teléfono)
                </label>

                {selectedRecipient ? (
                  <div className="flex items-center justify-between p-3.5 rounded-2xl bg-primary/15 border border-primary/40">
                    <div className="flex items-center gap-3">
                      <img
                        src={selectedRecipient.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedRecipient.id}`}
                        className="w-11 h-11 rounded-full object-cover bg-muted border border-primary/40"
                        alt=""
                      />
                      <div>
                        <div className="font-bold text-sm text-foreground flex items-center gap-1.5">
                          {selectedRecipient.displayName || selectedRecipient.username}
                          {selectedRecipient.isVerified && <CheckCircle className="w-3.5 h-3.5 text-primary" />}
                        </div>
                        <div className="text-xs text-primary font-mono">@{selectedRecipient.username}</div>
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="rounded-xl text-xs"
                      onClick={() => setSelectedRecipient(null)}
                    >
                      Cambiar
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2 relative">
                    <div className="relative">
                      <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-muted-foreground" />
                      <Input
                        value={userQuery}
                        onChange={(e) => setUserQuery(e.target.value)}
                        placeholder="Escribe el nombre o @usuario..."
                        className="pl-10 rounded-xl bg-white/5 text-xs py-2.5"
                      />
                    </div>

                    {searchingUsers && (
                      <div className="text-xs text-muted-foreground text-center py-2">Buscando usuarios...</div>
                    )}

                    {foundUsers.length > 0 && (
                      <div className="glass-panel border border-border/50 rounded-2xl p-2 space-y-1 max-h-48 overflow-y-auto">
                        {foundUsers.map((u) => (
                          <div
                            key={u.id}
                            onClick={() => {
                              setSelectedRecipient(u);
                              setUserQuery("");
                            }}
                            className="p-2.5 rounded-xl hover:bg-white/10 flex items-center justify-between cursor-pointer transition-colors"
                          >
                            <div className="flex items-center gap-2.5">
                              <img
                                src={u.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.id}`}
                                className="w-8 h-8 rounded-full object-cover bg-muted"
                                alt=""
                              />
                              <div>
                                <span className="font-bold text-xs text-foreground block">{u.displayName}</span>
                                <span className="text-[10px] text-muted-foreground font-mono">@{u.username}</span>
                              </div>
                            </div>
                            <Button size="sm" variant="ghost" className="h-7 text-xs text-cyan-400 font-bold">
                              Seleccionar
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Paso 2: Monto a Transferir */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    2. Monto a Transferir (COP)
                  </label>
                  <span className="text-xs text-muted-foreground">
                    Disponible: <strong className="text-cyan-300 font-mono">{formatCOP(currentBalance)}</strong>
                  </span>
                </div>

                <div className="relative">
                  <span className="absolute left-3.5 top-3 text-sm font-bold text-primary">$</span>
                  <Input
                    type="number"
                    min="1000"
                    max={currentBalance}
                    placeholder="Monto en COP"
                    value={transferAmount}
                    onChange={(e) => setTransferAmount(e.target.value)}
                    className="pl-8 rounded-xl bg-white/5 text-sm font-mono"
                    required
                  />
                </div>

                {/* Accesos rápidos de monto */}
                <div className="flex gap-2 pt-1">
                  {[10000, 25000, 50000, 100000].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setTransferAmount(String(Math.min(val, currentBalance)))}
                      className="px-2.5 py-1 rounded-lg bg-white/5 border border-border/40 text-[11px] text-muted-foreground hover:text-foreground hover:bg-white/10"
                    >
                      {formatCOP(val)}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setTransferAmount(String(currentBalance))}
                    className="px-2.5 py-1 rounded-lg bg-primary/20 border border-primary/40 text-[11px] text-cyan-300 font-bold hover:bg-primary/30"
                  >
                    Todo (Max)
                  </button>
                </div>
              </div>

              {/* Paso 3: Concepto */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                  3. Concepto o Motivo (Opcional)
                </label>
                <Input
                  value={transferConcept}
                  onChange={(e) => setTransferConcept(e.target.value)}
                  placeholder="Ej: Pago de producto, regalo, almuerzo..."
                  className="rounded-xl bg-white/5 text-xs"
                />
              </div>

              <Button
                type="submit"
                className="w-full rounded-2xl neon-btn font-extrabold text-sm py-3.5 shadow-xl"
                disabled={transferFunds.isPending || !selectedRecipient || !transferAmount || Number(transferAmount) > currentBalance}
              >
                {transferFunds.isPending ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
                {transferFunds.isPending
                  ? "Procesando transferencia..."
                  : `Enviar ${transferAmount ? formatCOP(Number(transferAmount)) : "$0 COP"} Ahora`}
              </Button>
            </div>
          </form>
        )}

        {/* ─── PESTAÑA 3: HISTORIAL DE MOVIMIENTOS ────────────────────────── */}
        {activeTab === "history" && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <History className="w-5 h-5 text-primary" /> Historial de Movimientos de la Billetera
            </h3>

            {transactions.length === 0 ? (
              <div className="glass-panel p-12 rounded-3xl text-center text-muted-foreground space-y-2">
                <Coins className="w-12 h-12 mx-auto text-muted-foreground/30" />
                <p className="font-bold">No tienes transacciones registradas aún</p>
                <p className="text-xs">Tus depósitos, transferencias y regalos recibidos aparecerán aquí.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {transactions.map((tx: any) => {
                  const isPositive = tx.amount > 0;
                  const isTransfer = tx.type?.includes("transfer");
                  const isTopUp = tx.type === "topup";
                  const isGift = tx.type?.includes("gift");

                  return (
                    <div
                      key={tx.id}
                      className="glass-panel p-4 rounded-2xl border border-border/40 flex items-center justify-between gap-3 hover:border-primary/40 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-none ${
                            isPositive
                              ? "bg-green-500/20 text-green-400 border border-green-500/30"
                              : "bg-red-500/20 text-red-400 border border-red-500/30"
                          }`}
                        >
                          {isPositive ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                        </div>

                        <div>
                          <div className="font-bold text-xs sm:text-sm text-foreground">
                            {isTopUp
                              ? "Depósito / Recarga de Fondos"
                              : isTransfer
                              ? isPositive
                                ? `Transferencia Recibida de ${tx.meta?.senderName || "Usuario"}`
                                : `Transferencia Enviada a ${tx.meta?.recipientName || "Usuario"}`
                              : isGift
                              ? isPositive
                                ? "Regalo Recibido en Publicación"
                                : "Regalo Enviado"
                              : tx.meta?.description || "Movimiento"}
                          </div>
                          <div className="text-[11px] text-muted-foreground flex items-center gap-2">
                            <span>
                              {format(new Date(tx.createdAt || Date.now()), "dd MMM yyyy, h:mm a", { locale: es })}
                            </span>
                            {tx.meta?.concept && (
                              <span>· Motivo: "{tx.meta.concept}"</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="text-right flex-none">
                        <div
                          className={`font-mono font-extrabold text-sm sm:text-base ${
                            isPositive ? "text-green-400" : "text-red-400"
                          }`}
                        >
                          {isPositive ? "+" : ""}{formatCOP(tx.amount)}
                        </div>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          Saldo: {formatCOP(tx.balanceAfter ?? 0)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </Shell>
  );
}
