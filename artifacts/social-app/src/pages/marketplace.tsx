import { useState, useEffect, useRef } from "react";
import { Shell } from "@/components/layout/Shell";
import {
  useGetListings,
  useGetMarketplaceCategories,
  useGetListing,
  useCreateListing,
  useGetMyListings,
  useUpdateListing,
  useDeleteListing,
  useRecordListingView,
  useStartConversationWithUser,
  useGetMe,
  getGetListingQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  MapPin,
  Tag,
  ShoppingBag,
  Plus,
  ArrowLeft,
  Package,
  Car,
  Home,
  Smartphone,
  Wrench,
  Shirt,
  X,
  Share2,
  Sprout,
  Plane,
  PawPrint,
  Coffee,
  Baby,
  Bike,
  Sparkles,
  Building2,
  Gamepad2,
  Music,
  BookOpen,
  Ticket,
  HardHat,
  Footprints,
  MessageCircle,
  Trash2,
  CheckCircle2,
  Eye,
  Loader2,
  Edit3,
  ImagePlus,
  Radio,
  SlidersHorizontal,
  ArrowUpDown,
  Phone,
  CheckCircle,
} from "lucide-react";
import { FormSelect } from "@/components/ui/form-select";
import { AppModal } from "@/components/ui/app-modal";
import { formatCOP } from "@/lib/format-currency";
import { uploadFile } from "@/lib/upload";
import { DEFAULT_MARKETPLACE_CATEGORY, MARKETPLACE_CATEGORIES } from "@/lib/marketplace-categories";
import { useToast } from "@/hooks/use-toast";
import { MarketplaceShareModal, type MarketplaceListingShareData } from "@/components/marketplace/MarketplaceShareModal";

const CONDITIONS = [
  { id: "new", name: "Nuevo (Sellado)" },
  { id: "like_new", name: "Como nuevo" },
  { id: "good", name: "Buen estado" },
  { id: "fair", name: "Estado regular" },
  { id: "for_parts", name: "Para piezas / repuestos" },
];

const CONDITION_LABELS: Record<string, string> = Object.fromEntries(CONDITIONS.map((c) => [c.id, c.name]));

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  "agro-insumos": Sprout,
  "paquetes-turismo": Plane,
  "envases-plastico-vidrio": Package,
  mascotas: PawPrint,
  "bebidas-comestibles": Coffee,
  "accesorios-bebe": Baby,
  "vehiculos-autos": Car,
  "motos-cuatrimotos": Bike,
  inmuebles: Home,
  electronica: Smartphone,
  "repuestos-vehiculos": Wrench,
  "belleza-cuidados": Sparkles,
  "industrias-oficinas": Building2,
  videojuegos: Gamepad2,
  "instrumentos-musicales": Music,
  "libros-revistas": BookOpen,
  "boletas-espectaculos": Ticket,
  "construccion-obras": HardHat,
  "ropa-hombre": Shirt,
  "calzado-damas": Footprints,
};

type MarketplaceTab = "explore" | "mine";

function CreateListingModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({
    title: "",
    description: "",
    price: "",
    category: DEFAULT_MARKETPLACE_CATEGORY,
    condition: "good",
    location: "",
    contactPhone: "",
  });
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const createListing = useCreateListing();
  const qc = useQueryClient();
  const { toast } = useToast();

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    setUploading(true);
    try {
      for (const file of files) {
        const url = await uploadFile(file, { purpose: "post" });
        setImageUrls((prev) => [...prev, url]);
      }
    } catch {
      setError("No se pudo subir la imagen.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const removeImage = (index: number) => {
    setImageUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.title.trim()) {
      setError("El título del producto es obligatorio.");
      return;
    }
    if (!form.price || isNaN(Number(form.price)) || Number(form.price) <= 0) {
      setError("Ingresa un precio válido en pesos colombianos (COP).");
      return;
    }

    createListing.mutate(
      {
        data: {
          title: form.title.trim(),
          description: form.description.trim(),
          price: Number(form.price),
          currency: "COP",
          category: form.category,
          condition: form.condition,
          location: form.location.trim() || undefined,
          contactPhone: form.contactPhone.trim() || undefined,
          imageUrls,
        },
      },
      {
        onSuccess: () => {
          toast({
            title: "¡Producto publicado con éxito! 🛍️",
            description: "Tu anuncio ya está visible para toda la comunidad en el Marketplace.",
          });
          qc.invalidateQueries();
          onClose();
        },
        onError: () => setError("Error al crear el anuncio. Intenta de nuevo."),
      }
    );
  };

  return (
    <AppModal open onClose={onClose} className="w-full max-w-lg">
      <div className="glass-panel neon-border rounded-3xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto space-y-4">
        <div className="flex items-center justify-between border-b border-border/40 pb-3">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-6 h-6 text-primary" />
            <h2 className="text-xl font-bold neon-title">Publicar Producto en Venta</h2>
          </div>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
              Título del Producto *
            </label>
            <Input
              value={form.title}
              onChange={set("title")}
              placeholder="Ej: iPhone 14 Pro Max 256GB Libre"
              className="rounded-xl bg-white/5 text-sm"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
              Descripción Detallada
            </label>
            <textarea
              value={form.description}
              onChange={set("description")}
              rows={3}
              placeholder="Describe el estado, accesorios incluidos, tiempo de uso, garantía, etc..."
              className="w-full rounded-xl bg-white/5 border border-input p-3 text-xs resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                Precio (COP) *
              </label>
              <Input
                type="number"
                min="0"
                step="1000"
                value={form.price}
                onChange={set("price")}
                placeholder="Ej: 2500000"
                className="rounded-xl bg-white/5 font-mono text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                Ubicación / Ciudad
              </label>
              <Input
                value={form.location}
                onChange={set("location")}
                placeholder="Ej: Medellín / Bogotá"
                className="rounded-xl bg-white/5 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                Categoría *
              </label>
              <FormSelect
                value={form.category}
                onValueChange={(v) => setForm((f) => ({ ...f, category: v as any }))}
                options={MARKETPLACE_CATEGORIES.map((c) => ({ value: c.id, label: c.name }))}
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                Condición / Estado *
              </label>
              <FormSelect
                value={form.condition}
                onValueChange={(v) => setForm((f) => ({ ...f, condition: v }))}
                options={CONDITIONS.map((c) => ({ value: c.id, label: c.name }))}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
              WhatsApp / Teléfono de Contacto (Opcional)
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 absolute left-3 top-3 text-emerald-400" />
              <Input
                value={form.contactPhone}
                onChange={set("contactPhone")}
                placeholder="Ej: +57 300 1234567"
                className="pl-9 rounded-xl bg-white/5 text-xs font-mono"
              />
            </div>
            <span className="text-[10px] text-muted-foreground mt-0.5 block">
              Permite que los compradores te escriban por WhatsApp con un solo clic.
            </span>
          </div>

          {/* Subida de Fotos */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
              Fotos del Producto ({imageUrls.length} adjuntas)
            </label>
            <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-primary/50 cursor-pointer text-xs font-bold text-primary hover:bg-primary/10 transition-colors">
              <ImagePlus className="w-4 h-4" /> {uploading ? "Subiendo fotos..." : "Adjuntar fotos del producto"}
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                disabled={uploading}
                onChange={handleImage}
              />
            </label>

            {imageUrls.length > 0 && (
              <div className="flex gap-2 mt-3 flex-wrap">
                {imageUrls.map((url, i) => (
                  <div key={i} className="relative group w-16 h-16 rounded-xl overflow-hidden border border-border">
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeImage(i)}
                      className="absolute top-1 right-1 p-1 bg-black/70 rounded-full text-white hover:bg-red-500 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {error && <p className="text-xs text-destructive bg-destructive/10 p-2 rounded-lg">{error}</p>}

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1 rounded-xl" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              type="submit"
              className="flex-1 rounded-xl neon-btn font-bold"
              disabled={createListing.isPending || uploading}
            >
              {createListing.isPending ? "Publicando..." : "Publicar Anuncio"}
            </Button>
          </div>
        </form>
      </div>
    </AppModal>
  );
}

function EditListingModal({ listing, onClose }: { listing: any; onClose: () => void }) {
  const [form, setForm] = useState({
    title: listing.title || "",
    description: listing.description || "",
    price: String(listing.price || ""),
    category: listing.category || DEFAULT_MARKETPLACE_CATEGORY,
    condition: listing.condition || "good",
    location: listing.location || "",
    contactPhone: listing.contactPhone || "",
    isAvailable: listing.isAvailable !== false,
  });
  const [imageUrls, setImageUrls] = useState<string[]>(listing.imageUrls || []);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const updateListing = useUpdateListing();
  const qc = useQueryClient();
  const { toast } = useToast();

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    setUploading(true);
    try {
      for (const file of files) {
        const url = await uploadFile(file, { purpose: "post" });
        setImageUrls((prev) => [...prev, url]);
      }
    } catch {
      setError("No se pudo subir la imagen.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const removeImage = (index: number) => {
    setImageUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.title.trim()) {
      setError("El título es obligatorio.");
      return;
    }
    if (!form.price || isNaN(Number(form.price)) || Number(form.price) <= 0) {
      setError("Ingresa un precio válido en COP.");
      return;
    }

    updateListing.mutate(
      {
        listingId: listing.id,
        data: {
          title: form.title.trim(),
          description: form.description.trim(),
          price: Number(form.price),
          category: form.category,
          condition: form.condition,
          location: form.location.trim() || undefined,
          contactPhone: form.contactPhone.trim() || undefined,
          isAvailable: form.isAvailable,
          imageUrls,
        },
      },
      {
        onSuccess: () => {
          toast({ title: "Anuncio actualizado con éxito ✓" });
          qc.invalidateQueries();
          onClose();
        },
        onError: () => setError("Error al actualizar el anuncio."),
      }
    );
  };

  return (
    <AppModal open onClose={onClose} className="w-full max-w-lg">
      <div className="glass-panel neon-border rounded-3xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto space-y-4">
        <div className="flex items-center justify-between border-b border-border/40 pb-3">
          <h2 className="text-xl font-bold neon-title">Editar Producto</h2>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
              Título *
            </label>
            <Input value={form.title} onChange={set("title")} className="rounded-xl bg-white/5 text-sm" required />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
              Descripción
            </label>
            <textarea
              value={form.description}
              onChange={set("description")}
              rows={3}
              className="w-full rounded-xl bg-white/5 border border-input p-3 text-xs resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                Precio (COP) *
              </label>
              <Input
                type="number"
                min="0"
                step="1000"
                value={form.price}
                onChange={set("price")}
                className="rounded-xl bg-white/5 font-mono text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                Ubicación
              </label>
              <Input
                value={form.location}
                onChange={set("location")}
                placeholder="Ciudad, País"
                className="rounded-xl bg-white/5 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                Categoría *
              </label>
              <FormSelect
                value={form.category}
                onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}
                options={MARKETPLACE_CATEGORIES.map((c) => ({ value: c.id, label: c.name }))}
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                Condición *
              </label>
              <FormSelect
                value={form.condition}
                onValueChange={(v) => setForm((f) => ({ ...f, condition: v }))}
                options={CONDITIONS.map((c) => ({ value: c.id, label: c.name }))}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
              WhatsApp / Teléfono de Contacto
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 absolute left-3 top-3 text-emerald-400" />
              <Input
                value={form.contactPhone}
                onChange={set("contactPhone")}
                placeholder="Ej: +57 300 1234567"
                className="pl-9 rounded-xl bg-white/5 text-xs font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
              Disponibilidad
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, isAvailable: true }))}
                className={`flex-1 py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                  form.isAvailable
                    ? "bg-emerald-500/20 border-emerald-400 text-emerald-300"
                    : "bg-white/5 border-border/40 text-muted-foreground"
                }`}
              >
                ✓ Disponible
              </button>
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, isAvailable: false }))}
                className={`flex-1 py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                  !form.isAvailable
                    ? "bg-amber-500/20 border-amber-400 text-amber-300"
                    : "bg-white/5 border-border/40 text-muted-foreground"
                }`}
              >
                Vendido
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
              Fotos del Producto
            </label>
            <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-dashed border-primary/40 cursor-pointer text-xs font-bold text-primary hover:bg-white/5 transition-colors">
              <ImagePlus className="w-4 h-4" /> {uploading ? "Subiendo..." : "Agregar más fotos"}
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                disabled={uploading}
                onChange={handleImage}
              />
            </label>
            {imageUrls.length > 0 && (
              <div className="flex gap-2 mt-3 flex-wrap">
                {imageUrls.map((url, i) => (
                  <div key={i} className="relative group w-16 h-16 rounded-xl overflow-hidden border border-border">
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeImage(i)}
                      className="absolute top-1 right-1 p-1 bg-black/70 rounded-full text-white hover:bg-red-500 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1 rounded-xl" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              type="submit"
              className="flex-1 rounded-xl neon-btn font-bold"
              disabled={updateListing.isPending || uploading}
            >
              {updateListing.isPending ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </div>
        </form>
      </div>
    </AppModal>
  );
}

function ListingDetail({
  listingId,
  onBack,
}: {
  listingId: string;
  onBack: () => void;
}) {
  const { data: listing, isLoading } = useGetListing(listingId, {
    query: { enabled: !!listingId, queryKey: getGetListingQueryKey(listingId) },
  });
  const { data: me } = useGetMe();
  const recordView = useRecordListingView();
  const startConversation = useStartConversationWithUser();
  const updateListing = useUpdateListing();
  const deleteListing = useDeleteListing();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const viewedRef = useRef(false);
  const [activeImgIdx, setActiveImgIdx] = useState(0);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  useEffect(() => {
    if (!listingId || viewedRef.current) return;
    viewedRef.current = true;
    recordView.mutate({ listingId });
  }, [listingId]);

  const isOwner = me?.id && listing?.sellerId === me.id;

  const contactSellerInChat = () => {
    if (!listing?.sellerId) return;
    const msg = `Hola, me interesa tu anuncio "${listing.title}" (${formatCOP(listing.price)}). ¿Sigue disponible?`;
    startConversation.mutate(
      { userId: listing.sellerId, initialMessage: msg },
      {
        onSuccess: (res) => {
          toast({ title: "Chat abierto", description: "Te llevamos a Mensajes con el vendedor." });
          setLocation(`/messages?conv=${res.conversationId}`);
        },
        onError: () => toast({ title: "No se pudo abrir el chat", variant: "destructive" }),
      }
    );
  };

  const contactViaWhatsApp = () => {
    const phone = (listing?.contactPhone || "").replace(/[^0-9]/g, "");
    const msg = `Hola! Vi tu producto en Menpoe Marketplace: "${listing?.title}" (${formatCOP(listing?.price)}). ¿Sigue disponible?`;
    const url = phone
      ? `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(msg)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const toggleSoldStatus = () => {
    const nextStatus = !listing?.isAvailable;
    updateListing.mutate(
      { listingId, data: { isAvailable: nextStatus } },
      {
        onSuccess: () =>
          toast({
            title: nextStatus ? "Marcado como disponible ✓" : "Marcado como vendido ✓",
          }),
        onError: () => toast({ title: "Error al actualizar", variant: "destructive" }),
      }
    );
  };

  const removeListing = () => {
    if (!window.confirm("¿Eliminar este anuncio permanentemente? No se puede deshacer.")) return;
    deleteListing.mutate(
      { listingId },
      {
        onSuccess: () => {
          toast({ title: "Anuncio eliminado" });
          onBack();
        },
        onError: () => toast({ title: "No se pudo eliminar", variant: "destructive" }),
      }
    );
  };

  if (isLoading)
    return (
      <div className="flex items-center justify-center p-20">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );

  if (!listing) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <p className="mb-4">Anuncio no encontrado</p>
        <Button variant="outline" onClick={onBack}>
          Volver al Marketplace
        </Button>
      </div>
    );
  }

  const images = listing.imageUrls || [];
  const currentImage = images[activeImgIdx] || images[0];

  return (
    <div className="max-w-3xl mx-auto w-full pb-16 space-y-6">
      {showEditModal && <EditListingModal listing={listing} onClose={() => setShowEditModal(false)} />}
      {showShareModal && (
        <MarketplaceShareModal open onClose={() => setShowShareModal(false)} listing={listing as any} />
      )}

      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Volver al catálogo de Marketplace
      </button>

      {/* Main Image Gallery */}
      {currentImage ? (
        <div className="space-y-3">
          <div className="rounded-3xl overflow-hidden aspect-video bg-black/60 border border-border/40 relative shadow-2xl flex items-center justify-center">
            <img src={currentImage} className="w-full h-full object-contain" alt={listing.title} />
            {!listing.isAvailable && (
              <div className="absolute inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center">
                <Badge className="text-base bg-amber-500 text-black font-extrabold px-6 py-2 rounded-full shadow-lg">
                  VENDIDO
                </Badge>
              </div>
            )}
          </div>
          {/* Thumbnails */}
          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {images.map((img: string, idx: number) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveImgIdx(idx)}
                  className={`w-18 h-18 rounded-2xl overflow-hidden border-2 flex-none transition-all ${
                    activeImgIdx === idx
                      ? "border-cyan-400 scale-105 shadow-[0_0_12px_rgba(6,182,212,0.5)]"
                      : "border-border/40 opacity-70 hover:opacity-100"
                  }`}
                >
                  <img src={img} className="w-full h-full object-cover" alt="" />
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-3xl bg-gradient-to-br from-primary/10 to-accent/10 aspect-video flex items-center justify-center border border-border/40">
          <Package className="w-20 h-20 text-muted-foreground/30" />
        </div>
      )}

      {/* Card de Información Detallada */}
      <div className="glass-panel neon-border rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="space-y-2 flex-1 min-w-[240px]">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="text-xs border-cyan-400/40 text-cyan-300">
                {CONDITION_LABELS[listing.condition] ?? listing.condition}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {MARKETPLACE_CATEGORIES.find((c) => c.id === listing.category)?.name ?? listing.category}
              </Badge>
              {listing.isAvailable ? (
                <Badge className="text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                  ✓ Disponible
                </Badge>
              ) : (
                <Badge className="text-xs bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                  Vendido
                </Badge>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground break-words">
              {listing.title}
            </h1>
          </div>

          <div className="text-3xl sm:text-4xl font-extrabold text-cyan-300 neon-text whitespace-nowrap">
            {formatCOP(listing.price)}
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap border-y border-border/30 py-3">
          {listing.location && (
            <span className="flex items-center gap-1">
              <MapPin className="w-4 h-4 text-primary" /> {listing.location}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Eye className="w-4 h-4 text-cyan-400" /> {listing.viewsCount ?? 0} visualizaciones
          </span>
        </div>

        {/* Descripción */}
        <div className="space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
            Descripción del Vendedor
          </span>
          <p className="text-sm text-foreground/90 leading-relaxed break-words whitespace-pre-line bg-white/5 p-4 rounded-2xl border border-white/10">
            {listing.description || "Sin descripción proporcionada por el vendedor."}
          </p>
        </div>

        {/* Vendedor */}
        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-primary/10 to-accent/10 rounded-2xl border border-primary/20 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <img
              src={listing.seller?.avatarUrl ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${listing.seller?.id}`}
              className="w-12 h-12 rounded-full object-cover bg-muted cursor-pointer ring-2 ring-primary/40"
              alt=""
              onClick={() => listing.seller?.id && setLocation(`/profile/${listing.seller.id}`)}
            />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  className="font-bold text-sm hover:text-primary neon-text truncate"
                  onClick={() => listing.seller?.id && setLocation(`/profile/${listing.seller.id}`)}
                >
                  {listing.seller?.displayName || "Vendedor de Menpoe"}
                </button>
                {listing.seller?.isVerified && <CheckCircle className="w-4 h-4 text-primary" />}
              </div>
              <div className="text-xs text-muted-foreground">Vendedor de la comunidad</div>
            </div>
          </div>

          <Button
            size="sm"
            variant="outline"
            className="rounded-xl text-xs"
            onClick={() => listing.seller?.id && setLocation(`/profile/${listing.seller.id}`)}
          >
            Ver Perfil
          </Button>
        </div>

        {/* ACCIONES DEL VENDEDOR O COMPRADOR */}
        {isOwner ? (
          <div className="space-y-2.5 pt-2">
            <Button
              className="w-full neon-btn rounded-2xl font-bold gap-2 py-3 text-sm"
              onClick={() => setShowShareModal(true)}
            >
              <Radio className="w-4 h-4 text-cyan-300" /> 📣 Compartir Anuncio (En el Feed o Redes)
            </Button>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Button
                className="w-full rounded-2xl font-bold gap-2"
                variant="outline"
                onClick={() => setShowEditModal(true)}
              >
                <Edit3 className="w-4 h-4 text-primary" /> Editar Anuncio
              </Button>
              <Button
                className="w-full rounded-2xl font-bold gap-2"
                variant="secondary"
                onClick={toggleSoldStatus}
                disabled={updateListing.isPending}
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                {listing.isAvailable ? "Marcar como Vendido" : "Marcar como Disponible"}
              </Button>
            </div>
            <Button
              className="w-full rounded-2xl font-bold gap-2"
              variant="destructive"
              onClick={removeListing}
              disabled={deleteListing.isPending}
            >
              <Trash2 className="w-4 h-4" /> Eliminar Anuncio
            </Button>
          </div>
        ) : (
          <div className="space-y-3 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Botón WhatsApp */}
              <Button
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold gap-2 py-3 shadow-lg hover:shadow-emerald-600/30 transition-all"
                size="lg"
                onClick={contactViaWhatsApp}
                disabled={!listing.isAvailable}
              >
                <MessageCircle className="w-5 h-5" /> Contactar por WhatsApp
              </Button>

              {/* Botón Chat Menpoe */}
              <Button
                className="w-full neon-btn rounded-2xl font-bold gap-2 py-3"
                size="lg"
                onClick={contactSellerInChat}
                disabled={!listing.isAvailable || startConversation.isPending}
              >
                {startConversation.isPending ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <MessageCircle className="w-5 h-5" />
                )}
                Chat Privado en Menpoe
              </Button>
            </div>

            <Button
              variant="outline"
              className="w-full rounded-2xl gap-2 font-bold py-2.5"
              onClick={() => setShowShareModal(true)}
            >
              <Share2 className="w-4 h-4 text-cyan-400" /> Compartir en el Inicio o Redes Sociales
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function ListingsGrid({
  listings,
  isLoading,
  onOpen,
  onShare,
}: {
  listings?: Array<any>;
  isLoading: boolean;
  onOpen: (id: string) => void;
  onShare: (listing: any) => void;
}) {
  if (isLoading) {
    return (
      <>
        {[...Array(8)].map((_, i) => (
          <div key={i} className="glass-panel rounded-3xl aspect-[3/4] animate-pulse" />
        ))}
      </>
    );
  }

  if (!listings?.length) {
    return (
      <div className="col-span-full text-center py-20 text-muted-foreground space-y-3">
        <ShoppingBag className="w-16 h-16 mx-auto text-muted-foreground/30" />
        <h3 className="neon-text font-bold text-lg">No se encontraron productos</h3>
        <p className="text-xs text-muted-foreground">Prueba ajustando los filtros o buscando otra palabra clave.</p>
      </div>
    );
  }

  return (
    <>
      {listings.map((listing) => (
        <div
          key={listing.id}
          className="glass-panel neon-border rounded-3xl overflow-hidden hover:scale-[1.02] transition-all text-left group relative flex flex-col shadow-xl cursor-pointer bg-white/5"
          onClick={() => onOpen(listing.id)}
        >
          {/* Imagen de Portada */}
          <div className="aspect-square bg-gradient-to-br from-primary/10 to-accent/10 relative overflow-hidden w-full">
            {listing.imageUrls?.[0] ? (
              <img
                src={listing.imageUrls[0]}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                alt={listing.title}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Package className="w-12 h-12 text-muted-foreground/30" />
              </div>
            )}

            {!listing.isAvailable && (
              <div className="absolute inset-0 bg-black/65 backdrop-blur-xs flex items-center justify-center">
                <span className="text-black font-extrabold text-xs px-3 py-1 bg-amber-400 rounded-full shadow-md">
                  Vendido
                </span>
              </div>
            )}

            {/* Badge de Condición */}
            <div className="absolute bottom-2 left-2">
              <Badge className="bg-black/60 backdrop-blur-xs text-[10px] text-white/90 border border-white/20 font-medium">
                {CONDITION_LABELS[listing.condition] ?? listing.condition}
              </Badge>
            </div>

            {/* Botón de Compartir Rápido */}
            <button
              type="button"
              className="absolute top-2 right-2 z-10 w-8 h-8 rounded-full bg-black/60 border border-white/20 flex items-center justify-center text-white/90 hover:text-white hover:bg-black/90 backdrop-blur-xs shadow-lg transition-transform hover:scale-110"
              onClick={(e) => {
                e.stopPropagation();
                onShare(listing);
              }}
              title="Compartir Producto"
            >
              <Share2 className="w-3.5 h-3.5 text-cyan-300" />
            </button>
          </div>

          {/* Información del Producto */}
          <div className="p-3.5 flex-1 flex flex-col justify-between space-y-2">
            <div>
              <div className="font-bold text-sm truncate text-foreground group-hover:text-primary transition-colors">
                {listing.title}
              </div>
              <div className="text-cyan-300 font-extrabold mt-1 text-base neon-text">
                {formatCOP(listing.price)}
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/30">
              {listing.location ? (
                <div className="flex items-center gap-1 truncate">
                  <MapPin className="w-3 h-3 text-primary flex-none" />
                  <span className="truncate">{listing.location}</span>
                </div>
              ) : (
                <span>Menpoe Social</span>
              )}
              <span className="flex items-center gap-0.5 text-cyan-400/80">
                <Eye className="w-3 h-3" /> {listing.viewsCount ?? 0}
              </span>
            </div>
          </div>
        </div>
      ))}
    </>
  );
}

export default function Marketplace() {
  const [, params] = useRoute("/marketplace/:id");
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedCondition, setSelectedCondition] = useState<string>("all");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "price_asc" | "price_desc">("newest");
  const [showFilters, setShowFilters] = useState(false);

  const [selectedListingId, setSelectedListingId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [shareTargetListing, setShareTargetListing] = useState<any | null>(null);
  const [tab, setTab] = useState<MarketplaceTab>("explore");

  const { data: listings = [], isLoading } = useGetListings({
    q: search || undefined,
    category: selectedCategory ?? undefined,
  });
  const { data: myListings = [], isLoading: loadingMine } = useGetMyListings();

  useEffect(() => {
    if (params?.id) setSelectedListingId(params.id);
  }, [params?.id]);

  const openListing = (id: string) => {
    setSelectedListingId(id);
    setLocation(`/marketplace/${id}`);
  };

  const closeListing = () => {
    setSelectedListingId(null);
    setLocation("/marketplace");
  };

  const rawListings = tab === "mine" ? myListings : listings;
  const displayLoading = tab === "mine" ? loadingMine : isLoading;

  // Filtrado y Ordenación Avanzada
  const processedListings = (rawListings || [])
    .filter((l: any) => {
      if (selectedCondition !== "all" && l.condition !== selectedCondition) return false;
      if (minPrice && l.price < Number(minPrice)) return false;
      if (maxPrice && l.price > Number(maxPrice)) return false;
      return true;
    })
    .sort((a: any, b: any) => {
      if (sortBy === "price_asc") return a.price - b.price;
      if (sortBy === "price_desc") return b.price - a.price;
      return String(b.createdAt || "").localeCompare(String(a.createdAt || ""));
    });

  return (
    <Shell>
      <div className="max-w-6xl mx-auto w-full p-4 pb-24 space-y-6">
        {showCreate && <CreateListingModal onClose={() => setShowCreate(false)} />}
        {shareTargetListing && (
          <MarketplaceShareModal
            open
            onClose={() => setShareTargetListing(null)}
            listing={shareTargetListing}
          />
        )}

        {selectedListingId ? (
          <ListingDetail listingId={selectedListingId} onBack={closeListing} />
        ) : (
          <>
            {/* Header Marketplace */}
            <div className="glass-panel p-6 rounded-3xl border border-primary/30 shadow-2xl relative overflow-hidden bg-gradient-to-r from-primary/15 via-background to-accent/15">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-primary/20 text-primary border border-primary/40 font-mono text-xs px-2.5 py-0.5">
                      🛍️ MARKETPLACE OFICIAL
                    </Badge>
                    <span className="text-xs text-muted-foreground font-mono">COMPRA & VENTA DIRECTA</span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                    Menpoe Marketplace
                  </h1>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Publica tus productos, compártelos en tu muro o en redes sociales y conecta con compradores de inmediato.
                  </p>
                </div>

                <Button
                  className="neon-btn rounded-2xl font-bold gap-2 py-3 px-5 self-start sm:self-auto shadow-lg"
                  onClick={() => setShowCreate(true)}
                >
                  <Plus className="w-5 h-5" /> Vender un Producto
                </Button>
              </div>
            </div>

            {/* Pestañas Principales: Explorar / Mis Publicaciones */}
            <div className="flex items-center justify-between gap-3 border-b border-border/40 pb-2 flex-wrap">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setTab("explore")}
                  className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
                    tab === "explore"
                      ? "bg-primary text-primary-foreground shadow-[0_0_15px_rgba(0,180,216,0.4)]"
                      : "bg-white/5 text-muted-foreground hover:bg-white/10"
                  }`}
                >
                  <ShoppingBag className="w-4 h-4" /> Explorar Catálogo
                </button>
                <button
                  type="button"
                  onClick={() => setTab("mine")}
                  className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
                    tab === "mine"
                      ? "bg-primary text-primary-foreground shadow-[0_0_15px_rgba(0,180,216,0.4)]"
                      : "bg-white/5 text-muted-foreground hover:bg-white/10"
                  }`}
                >
                  <Package className="w-4 h-4" /> Mis Publicaciones ({myListings?.length ?? 0})
                </button>
              </div>

              <Button
                variant="outline"
                size="sm"
                className={`rounded-xl text-xs gap-1.5 ${showFilters ? "border-primary text-primary" : ""}`}
                onClick={() => setShowFilters(!showFilters)}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" /> Filtros Avanzados
              </Button>
            </div>

            {/* Barra de Búsqueda y Filtros Rápidos */}
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar productos por nombre, marca o modelo..."
                  className="pl-10 rounded-2xl bg-white/5 text-xs sm:text-sm py-2.5"
                />
              </div>

              {/* Filtros Desplegables */}
              {showFilters && (
                <div className="p-4 rounded-2xl glass-panel border border-border/40 space-y-3 animate-in fade-in">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground block mb-1">
                        Ordenar por
                      </label>
                      <FormSelect
                        value={sortBy}
                        onValueChange={(v: any) => setSortBy(v)}
                        options={[
                          { value: "newest", label: "Más recientes" },
                          { value: "price_asc", label: "Menor precio" },
                          { value: "price_desc", label: "Mayor precio" },
                        ]}
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-muted-foreground block mb-1">
                        Condición
                      </label>
                      <FormSelect
                        value={selectedCondition}
                        onValueChange={(v) => setSelectedCondition(v)}
                        options={[
                          { value: "all", label: "Todas las condiciones" },
                          ...CONDITIONS.map((c) => ({ value: c.id, label: c.name })),
                        ]}
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-muted-foreground block mb-1">
                        Rango de Precio (COP)
                      </label>
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          placeholder="Mín"
                          value={minPrice}
                          onChange={(e) => setMinPrice(e.target.value)}
                          className="bg-black/30 text-xs rounded-xl"
                        />
                        <Input
                          type="number"
                          placeholder="Máx"
                          value={maxPrice}
                          onChange={(e) => setMaxPrice(e.target.value)}
                          className="bg-black/30 text-xs rounded-xl"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Categorías Visuales */}
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                <button
                  type="button"
                  onClick={() => setSelectedCategory(null)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all shrink-0 ${
                    !selectedCategory
                      ? "bg-primary text-primary-foreground shadow-[0_0_10px_rgba(0,180,216,0.5)]"
                      : "bg-white/5 text-muted-foreground hover:bg-white/10"
                  }`}
                >
                  Todas las Categorías
                </button>
                {MARKETPLACE_CATEGORIES.map((cat) => {
                  const Icon = CATEGORY_ICONS[cat.id] || Tag;
                  const selected = selectedCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCategory(selected ? null : cat.id)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all shrink-0 flex items-center gap-1.5 ${
                        selected
                          ? "bg-primary text-primary-foreground font-bold shadow-[0_0_10px_rgba(0,180,216,0.5)]"
                          : "bg-white/5 text-muted-foreground hover:bg-white/10"
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5 text-cyan-400" />
                      {cat.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Grid de Productos */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              <ListingsGrid
                listings={processedListings}
                isLoading={displayLoading}
                onOpen={openListing}
                onShare={(l) => setShareTargetListing(l)}
              />
            </div>
          </>
        )}
      </div>
    </Shell>
  );
}
