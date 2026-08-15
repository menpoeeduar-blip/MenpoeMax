import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormSelect } from "@/components/ui/form-select";
import {
  Megaphone, Upload, X, Phone, Mail, Globe, MessageCircle,
  ChevronRight, Loader2, ImageIcon, CheckCircle2, Wallet,
  Calendar, AlertCircle, PlusCircle, Sparkles, Tag,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { uploadFile } from "@/lib/upload";
import { useCreatePost } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useGetWallet, useDeductWalletBalance, useDemoTopUpWallet } from "@/lib/gifts-api";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pageId?: string;
  groupId?: string;
  communityId?: string;
};

const CALL_TO_ACTION_OPTIONS = [
  { value: "whatsapp", label: "💬 Escribir por WhatsApp" },
  { value: "call", label: "📞 Llamar ahora" },
  { value: "email", label: "✉️ Enviar correo" },
  { value: "website", label: "🌐 Visitar sitio web" },
  { value: "more_info", label: "ℹ️ Más información" },
  { value: "buy_now", label: "🛒 Comprar ahora" },
];

const AD_CATEGORY_OPTIONS = [
  { value: "productos", label: "🛍️ Productos" },
  { value: "servicios", label: "🔧 Servicios" },
  { value: "inmuebles", label: "🏠 Inmuebles / Propiedades" },
  { value: "vehiculos", label: "🚗 Vehículos" },
  { value: "empleo", label: "💼 Empleo / Trabajo" },
  { value: "eventos", label: "🎉 Eventos" },
  { value: "restaurantes", label: "🍽️ Restaurantes / Comida" },
  { value: "tecnologia", label: "💻 Tecnología" },
  { value: "salud", label: "🏥 Salud y Bienestar" },
  { value: "otro", label: "📦 Otro" },
];

const DURATION_OPTIONS = [
  { id: "1_day", label: "1 Día", days: 1, cost: 10000, formattedCost: "$10.000 COP", badge: "Más rápido" },
  { id: "7_days", label: "1 Semana (7 días)", days: 7, cost: 50000, formattedCost: "$50.000 COP", badge: "Mejor valor" },
];

export function CreateAdCampaignModal({ open, onOpenChange, pageId, groupId, communityId }: Props) {
  const { toast } = useToast();
  const createPost = useCreatePost();
  const qc = useQueryClient();
  const { data: walletData, isLoading: walletLoading } = useGetWallet();
  const deductWallet = useDeductWalletBalance();
  const demoTopUp = useDemoTopUpWallet();

  // Duration plan state
  const [duration, setDuration] = useState<"1_day" | "7_days">("1_day");

  // Form fields
  const [productName, setProductName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("productos");
  const [price, setPrice] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [callToAction, setCallToAction] = useState("whatsapp");
  const [imageUrl, setImageUrl] = useState("");
  const [uploadingImg, setUploadingImg] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const imgInputRef = useRef<HTMLInputElement>(null);

  const selectedPlan = DURATION_OPTIONS.find((d) => d.id === duration) || DURATION_OPTIONS[0];
  const userBalance = walletData?.balance ?? 100000;
  const hasEnoughBalance = userBalance >= selectedPlan.cost;

  const handleUploadImage = async (file: File) => {
    setUploadingImg(true);
    try {
      const reader = new FileReader();
      reader.onload = (e) => setPreviewUrl(e.target?.result as string);
      reader.readAsDataURL(file);

      const url = await uploadFile(file, { purpose: "post" });
      setImageUrl(url);
      setPreviewUrl(url);
      toast({ title: "Imagen subida ✓" });
    } catch {
      toast({ title: "Error al subir imagen", variant: "destructive" });
    } finally {
      setUploadingImg(false);
    }
  };

  const resetForm = () => {
    setProductName(""); setDescription(""); setCategory("productos");
    setPrice(""); setWhatsapp(""); setPhone(""); setEmail("");
    setWebsite(""); setCallToAction("whatsapp"); setDuration("1_day");
    setImageUrl(""); setPreviewUrl(null);
  };

  const validate = () => {
    if (!productName.trim()) {
      toast({ title: "Nombre requerido", description: "Escribe el nombre del producto o servicio.", variant: "destructive" });
      return false;
    }
    if (!description.trim()) {
      toast({ title: "Descripción requerida", description: "Describe tu producto o servicio.", variant: "destructive" });
      return false;
    }
    if (!whatsapp.trim() && !phone.trim() && !email.trim() && !website.trim()) {
      toast({ title: "Contacto requerido", description: "Agrega al menos un medio de contacto (WhatsApp, teléfono, email o web).", variant: "destructive" });
      return false;
    }
    if (!hasEnoughBalance) {
      toast({
        title: "Saldo insuficiente en billetera",
        description: `Necesitas ${selectedPlan.formattedCost} para la campaña de ${selectedPlan.label}. Saldo actual: $${userBalance.toLocaleString("es-CO")} COP`,
        variant: "destructive",
      });
      return false;
    }
    return true;
  };

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      // 1. Debitar saldo de la billetera
      await deductWallet.mutateAsync({
        amount: selectedPlan.cost,
        description: `Campaña Publicitaria (${selectedPlan.label}): ${productName.trim()}`,
      });

      // 2. Calcular fecha de vencimiento
      const expiresAt = new Date(Date.now() + selectedPlan.days * 86400000).toISOString();

      const adData = {
        productName: productName.trim(),
        category,
        price: price.trim() || undefined,
        whatsapp: whatsapp.trim() || undefined,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        website: website.trim() || undefined,
        callToAction,
        duration: selectedPlan.id,
        durationLabel: selectedPlan.label,
        cost: selectedPlan.cost,
        formattedCost: selectedPlan.formattedCost,
        expiresAt,
        status: "active",
      };

      // 3. Crear publicación publicitaria
      createPost.mutate(
        {
          data: {
            content: description.trim(),
            postType: "ad",
            mediaUrls: imageUrl ? [imageUrl] : [],
            visibility: "publico",
            adData: JSON.stringify(adData),
            hashtags: [category, "publicidad", "anuncio"],
            pageId,
            groupId,
            communityId,
          },
        },
        {
          onSuccess: () => {
            toast({
              title: "✅ Campaña activada y publicada",
              description: `Se debitaron ${selectedPlan.formattedCost} de tu billetera. Tu anuncio estará activo por ${selectedPlan.label}.`,
            });
            qc.invalidateQueries({ queryKey: ["feed"] });
            qc.invalidateQueries({ queryKey: ["wallet"] });
            qc.invalidateQueries();
            resetForm();
            onOpenChange(false);
          },
          onError: () => {
            toast({ title: "Error al publicar", description: "No se pudo crear el anuncio.", variant: "destructive" });
          },
        }
      );
    } catch (err: any) {
      toast({
        title: "Error en la billetera",
        description: err?.message || "No se pudo completar el débito de la billetera.",
        variant: "destructive",
      });
    }
  };

  const handleDemoTopUp = async () => {
    try {
      await demoTopUp.mutateAsync(100000);
      toast({
        title: "💰 Saldo recargado",
        description: "Se han añadido +$100.000 COP a tu billetera para pruebas.",
      });
    } catch {
      toast({ title: "Error al recargar", variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v); }}>
      <DialogContent className="glass-panel neon-border max-w-lg rounded-3xl p-0 overflow-hidden max-h-[92vh] overflow-y-auto">
        {/* Header gradient */}
        <div className="bg-gradient-to-r from-amber-600/30 via-rose-600/20 to-violet-600/30 p-5 border-b border-border/30">
          <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/30 border border-amber-400/50 flex items-center justify-center">
              <Megaphone className="w-4 h-4 text-amber-400 animate-pulse" />
            </div>
            Crear Campaña Publicitaria
          </DialogTitle>
          <p className="text-xs text-white/60 mt-1">
            Promociona tu producto con presupuesto debitado de tu billetera
          </p>
        </div>

        <form onSubmit={handlePublish} className="p-5 space-y-4">
          {/* SECCIÓN 1: Duración y Billetera */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/10 via-black/40 to-violet-500/10 border border-amber-500/30 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <Calendar className="w-4 h-4" /> Duración de la Campaña
              </span>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 border border-white/20 text-xs font-semibold text-white">
                <Wallet className="w-3.5 h-3.5 text-emerald-400" />
                <span>${userBalance.toLocaleString("es-CO")} COP</span>
              </div>
            </div>

            {/* Selector de Planes */}
            <div className="grid grid-cols-2 gap-2.5">
              {DURATION_OPTIONS.map((opt) => {
                const active = duration === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setDuration(opt.id as any)}
                    className={`p-3 rounded-xl border text-left transition-all relative overflow-hidden ${
                      active
                        ? "bg-amber-500/20 border-amber-400 text-white shadow-lg shadow-amber-500/10"
                        : "bg-white/5 border-border/40 text-muted-foreground hover:bg-white/10"
                    }`}
                  >
                    {opt.badge && (
                      <span className="absolute top-2 right-2 text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/40 text-amber-200">
                        {opt.badge}
                      </span>
                    )}
                    <p className="text-xs font-bold text-white">{opt.label}</p>
                    <p className="text-sm font-black text-amber-400 mt-1">{opt.formattedCost}</p>
                  </button>
                );
              })}
            </div>

            {/* Estado de saldo / Alerta o Botón de recarga */}
            {!hasEnoughBalance ? (
              <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <span className="truncate">Saldo insuficiente para {selectedPlan.label}</span>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleDemoTopUp}
                  disabled={demoTopUp.isPending}
                  className="h-7 px-2.5 text-[11px] rounded-lg border-red-500/40 text-red-300 hover:bg-red-500/20 shrink-0 gap-1"
                >
                  <PlusCircle className="w-3 h-3" />
                  +100 mil (Demo)
                </Button>
              </div>
            ) : (
              <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[11px] flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Saldo suficiente. Se debitarán <strong>{selectedPlan.formattedCost}</strong> al publicar.</span>
              </div>
            )}
          </div>

          {/* Image Upload */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-2 block">
              Imagen del Producto / Servicio
            </label>
            <input
              ref={imgInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleUploadImage(f); }}
            />
            {previewUrl ? (
              <div className="relative rounded-2xl overflow-hidden border border-primary/30 h-40 group">
                <img src={previewUrl} className="w-full h-full object-cover" alt="Preview" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => imgInputRef.current?.click()}
                    className="px-3 py-1.5 bg-white/20 backdrop-blur-sm rounded-xl text-white text-xs font-semibold hover:bg-white/30"
                  >
                    Cambiar
                  </button>
                  <button
                    type="button"
                    onClick={() => { setImageUrl(""); setPreviewUrl(null); }}
                    className="p-1.5 bg-red-500/60 rounded-full text-white hover:bg-red-500/80"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                {imageUrl && <div className="absolute top-2 right-2 bg-emerald-500/90 rounded-full p-1"><CheckCircle2 className="w-3.5 h-3.5 text-white" /></div>}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => imgInputRef.current?.click()}
                disabled={uploadingImg}
                className="w-full h-36 border-2 border-dashed border-border/50 hover:border-primary/60 rounded-2xl bg-white/5 flex flex-col items-center justify-center gap-2 transition-all group"
              >
                {uploadingImg ? (
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                ) : (
                  <>
                    <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <ImageIcon className="w-5 h-5 text-primary" />
                    </div>
                    <p className="text-xs font-semibold text-primary">Subir imagen</p>
                    <p className="text-[10px] text-muted-foreground">JPG, PNG o WEBP • Recomendado 1200×628px</p>
                  </>
                )}
              </button>
            )}
          </div>

          {/* Product name + Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">
                Nombre del Producto / Servicio *
              </label>
              <Input
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="Ej: Laptop Dell XPS 15"
                className="neon-input rounded-xl text-sm"
                required
                maxLength={80}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">Categoría</label>
              <FormSelect
                value={category}
                onValueChange={setCategory}
                options={AD_CATEGORY_OPTIONS}
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1">
              Descripción del anuncio *
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe tu producto o servicio de forma clara y atractiva. Incluye características, beneficios, condiciones..."
              className="w-full bg-white/5 border border-border/40 rounded-xl p-3 text-sm focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/40 resize-none min-h-[90px]"
              required
              maxLength={500}
            />
            <p className="text-[10px] text-muted-foreground/50 text-right mt-0.5">{description.length}/500</p>
          </div>

          {/* Price */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1">
              Precio del producto <span className="text-muted-foreground/50">(opcional)</span>
            </label>
            <Input
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="Ej: $150 / Bs. 350 / Consultar"
              className="neon-input rounded-xl text-sm"
              maxLength={40}
            />
          </div>

          {/* Contact Info */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Información de Contacto <span className="text-red-400">*</span> <span className="text-[10px] normal-case font-normal">(al menos uno)</span>
            </p>

            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-400">
                <MessageCircle className="w-4 h-4" />
              </div>
              <Input
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="WhatsApp: +58 412 1234567"
                className="neon-input rounded-xl text-sm pl-9"
                maxLength={30}
                type="tel"
              />
            </div>

            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-sky-400">
                <Phone className="w-4 h-4" />
              </div>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Teléfono fijo o celular (opcional)"
                className="neon-input rounded-xl text-sm pl-9"
                maxLength={30}
                type="tel"
              />
            </div>

            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-400">
                <Mail className="w-4 h-4" />
              </div>
              <Input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Correo electrónico (opcional)"
                className="neon-input rounded-xl text-sm pl-9"
                maxLength={80}
                type="email"
              />
            </div>

            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-violet-400">
                <Globe className="w-4 h-4" />
              </div>
              <Input
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="Sitio web o tienda (opcional)"
                className="neon-input rounded-xl text-sm pl-9"
                maxLength={120}
                type="url"
              />
            </div>
          </div>

          {/* Call to action button */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1">
              Botón de llamado a la acción
            </label>
            <FormSelect
              value={callToAction}
              onValueChange={setCallToAction}
              options={CALL_TO_ACTION_OPTIONS}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1 rounded-xl"
              onClick={() => { resetForm(); onOpenChange(false); }}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={createPost.isPending || uploadingImg || deductWallet.isPending || !hasEnoughBalance}
              className="flex-1 rounded-xl font-bold bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white shadow-lg shadow-amber-500/20 gap-2"
            >
              {createPost.isPending || deductWallet.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Megaphone className="w-4 h-4" />
              )}
              {createPost.isPending || deductWallet.isPending ? "Debitando y publicando..." : `Pagar ${selectedPlan.formattedCost} y Publicar`}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
