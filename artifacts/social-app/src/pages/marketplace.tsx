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
  Search, MapPin, Tag, ShoppingBag, Plus, ArrowLeft, Package, Car, Home, Smartphone, Wrench, Shirt, X, Share2,
  Sprout, Plane, PawPrint, Coffee, Baby, Bike, Sparkles, Building2, Gamepad2, Music, BookOpen, Ticket, HardHat, Footprints,
  MessageCircle, Trash2, CheckCircle2, Eye, Loader2, Edit3, ImagePlus, RefreshCw, Check,
} from "lucide-react";
import { shareEntity } from "@/lib/share";
import { FormSelect } from "@/components/ui/form-select";
import { AppModal } from "@/components/ui/app-modal";
import { formatCOP } from "@/lib/format-currency";
import { uploadFile } from "@/lib/upload";
import { DEFAULT_MARKETPLACE_CATEGORY, MARKETPLACE_CATEGORIES } from "@/lib/marketplace-categories";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const CONDITIONS = [
  { id: "new", name: "Nuevo" },
  { id: "like_new", name: "Como nuevo" },
  { id: "good", name: "Buen estado" },
  { id: "fair", name: "Estado regular" },
  { id: "for_parts", name: "Para piezas" },
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
  });
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const createListing = useCreateListing();
  const qc = useQueryClient();

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
      setError("No se pudo subir la imagen");
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
    if (!form.title.trim()) { setError("El título es obligatorio"); return; }
    if (!form.price || isNaN(Number(form.price)) || Number(form.price) <= 0) { setError("Ingresa un precio válido en COP"); return; }

    createListing.mutate(
      { data: { title: form.title.trim(), description: form.description.trim(), price: Number(form.price), currency: "COP", category: form.category, condition: form.condition, location: form.location.trim() || undefined, imageUrls } },
      {
        onSuccess: () => { qc.invalidateQueries(); onClose(); },
        onError: () => setError("Error al crear el anuncio. Intenta de nuevo."),
      },
    );
  };

  return (
    <AppModal open onClose={onClose} className="w-full max-w-md">
      <div className="glass-panel neon-border rounded-3xl p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold neon-title">Publicar anuncio</h2>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Título del producto *</label>
            <Input value={form.title} onChange={set("title")} placeholder="¿Qué estás vendiendo?" className="rounded-xl bg-white/5" required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Descripción</label>
            <textarea value={form.description} onChange={set("description")} placeholder="Describe características, estado, detalles..." rows={3}
              className="w-full rounded-xl bg-white/5 border border-input px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Precio (COP) *</label>
              <Input type="number" min="0" step="1000" value={form.price} onChange={set("price")} placeholder="150000" className="rounded-xl bg-white/5" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Ubicación</label>
              <Input value={form.location} onChange={set("location")} placeholder="Ciudad, País" className="rounded-xl bg-white/5" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Categoría *</label>
              <FormSelect value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))} options={MARKETPLACE_CATEGORIES.map((c) => ({ value: c.id, label: c.name }))} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Condición *</label>
              <FormSelect value={form.condition} onValueChange={(v) => setForm((f) => ({ ...f, condition: v }))} options={CONDITIONS.map((c) => ({ value: c.id, label: c.name }))} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Fotos del producto</label>
            <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-dashed border-primary/40 cursor-pointer text-sm hover:bg-white/5 transition-colors">
              <ImagePlus className="w-4 h-4 text-primary" /> {uploading ? "Subiendo..." : "Agregar fotos"}
              <input type="file" accept="image/*" multiple className="hidden" disabled={uploading} onChange={handleImage} />
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

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1 rounded-xl" onClick={onClose}>Cancelar</Button>
            <Button type="submit" className="flex-1 rounded-xl neon-btn font-bold" disabled={createListing.isPending || uploading}>
              {createListing.isPending ? "Publicando..." : "Publicar anuncio"}
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
    isAvailable: listing.isAvailable ?? true,
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
      setError("No se pudo subir la imagen");
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
    if (!form.title.trim()) { setError("El título es obligatorio"); return; }
    if (!form.price || isNaN(Number(form.price)) || Number(form.price) <= 0) { setError("Ingresa un precio válido en COP"); return; }

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
          isAvailable: form.isAvailable,
          imageUrls,
        },
      },
      {
        onSuccess: () => {
          toast({ title: "Anuncio actualizado ✓" });
          qc.invalidateQueries();
          onClose();
        },
        onError: () => setError("Error al actualizar el anuncio."),
      },
    );
  };

  return (
    <AppModal open onClose={onClose} className="w-full max-w-md">
      <div className="glass-panel neon-border rounded-3xl p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold neon-title">Editar producto</h2>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Título *</label>
            <Input value={form.title} onChange={set("title")} className="rounded-xl bg-white/5" required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Descripción</label>
            <textarea value={form.description} onChange={set("description")} rows={3}
              className="w-full rounded-xl bg-white/5 border border-input px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Precio (COP) *</label>
              <Input type="number" min="0" step="1000" value={form.price} onChange={set("price")} className="rounded-xl bg-white/5" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Ubicación</label>
              <Input value={form.location} onChange={set("location")} placeholder="Ciudad, País" className="rounded-xl bg-white/5" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Categoría *</label>
              <FormSelect value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))} options={MARKETPLACE_CATEGORIES.map((c) => ({ value: c.id, label: c.name }))} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Condición *</label>
              <FormSelect value={form.condition} onValueChange={(v) => setForm((f) => ({ ...f, condition: v }))} options={CONDITIONS.map((c) => ({ value: c.id, label: c.name }))} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Estado del anuncio</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, isAvailable: true }))}
                className={`flex-1 py-2 px-3 rounded-xl border text-xs font-semibold transition-all ${
                  form.isAvailable
                    ? "bg-emerald-500/20 border-emerald-400 text-emerald-300"
                    : "bg-white/5 border-border/40 text-muted-foreground"
                }`}
              >
                Disponible
              </button>
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, isAvailable: false }))}
                className={`flex-1 py-2 px-3 rounded-xl border text-xs font-semibold transition-all ${
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
            <label className="block text-sm font-medium mb-1">Fotos del producto</label>
            <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-dashed border-primary/40 cursor-pointer text-sm hover:bg-white/5 transition-colors">
              <ImagePlus className="w-4 h-4 text-primary" /> {uploading ? "Subiendo..." : "Agregar fotos"}
              <input type="file" accept="image/*" multiple className="hidden" disabled={uploading} onChange={handleImage} />
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

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1 rounded-xl" onClick={onClose}>Cancelar</Button>
            <Button type="submit" className="flex-1 rounded-xl neon-btn font-bold" disabled={updateListing.isPending || uploading}>
              {updateListing.isPending ? "Guardando..." : "Guardar cambios"}
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
  const { data: listing, isLoading } = useGetListing(listingId, { query: { enabled: !!listingId, queryKey: getGetListingQueryKey(listingId) } });
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

  useEffect(() => {
    if (!listingId || viewedRef.current) return;
    viewedRef.current = true;
    recordView.mutate({ listingId });
  }, [listingId]);

  const isOwner = me?.id && listing?.sellerId === me.id;

  const contactSeller = () => {
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
      },
    );
  };

  const toggleSoldStatus = () => {
    const nextStatus = !listing?.isAvailable;
    updateListing.mutate(
      { listingId, data: { isAvailable: nextStatus } },
      {
        onSuccess: () => toast({ title: nextStatus ? "Marcado como disponible" : "Marcado como vendido" }),
        onError: () => toast({ title: "Error al actualizar", variant: "destructive" }),
      },
    );
  };

  const removeListing = () => {
    if (!window.confirm("¿Eliminar este anuncio? No se puede deshacer.")) return;
    deleteListing.mutate(
      { listingId },
      {
        onSuccess: () => { toast({ title: "Anuncio eliminado" }); onBack(); },
        onError: () => toast({ title: "No se pudo eliminar", variant: "destructive" }),
      },
    );
  };

  if (isLoading) return <div className="flex items-center justify-center p-20"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  if (!listing) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <p className="mb-4">Anuncio no encontrado</p>
        <Button variant="outline" onClick={onBack}>Volver</Button>
      </div>
    );
  }

  const images = listing.imageUrls || [];
  const currentImage = images[activeImgIdx] || images[0];

  return (
    <div className="max-w-2xl mx-auto w-full max-w-full overflow-x-hidden">
      {showEditModal && <EditListingModal listing={listing} onClose={() => setShowEditModal(false)} />}

      <button type="button" onClick={onBack} className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" />Volver al marketplace
      </button>

      {/* Main Image Gallery */}
      {currentImage ? (
        <div className="mb-6 space-y-2">
          <div className="rounded-2xl overflow-hidden aspect-video bg-black/40 border border-border/40 relative">
            <img src={currentImage} className="w-full h-full object-contain" alt={listing.title} />
            {!listing.isAvailable && (
              <div className="absolute inset-0 bg-black/65 backdrop-blur-xs flex items-center justify-center">
                <Badge className="text-sm bg-amber-500 text-black font-bold px-4 py-1">VENDIDO</Badge>
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
                  className={`w-16 h-16 rounded-xl overflow-hidden border-2 flex-none transition-all ${
                    activeImgIdx === idx ? "border-primary scale-105" : "border-border/40 opacity-70 hover:opacity-100"
                  }`}
                >
                  <img src={img} className="w-full h-full object-cover" alt="" />
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 mb-6 aspect-video flex items-center justify-center">
          <Package className="w-16 h-16 text-muted-foreground/30" />
        </div>
      )}

      <div className="glass-panel neon-border rounded-3xl p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold mb-1 break-words">{listing.title}</h1>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="text-xs">{CONDITION_LABELS[listing.condition] ?? listing.condition}</Badge>
              <Badge variant="outline" className="text-xs">{MARKETPLACE_CATEGORIES.find((c) => c.id === listing.category)?.name ?? listing.category}</Badge>
              {!listing.isAvailable && <Badge className="text-xs bg-amber-500/20 text-amber-300 border-amber-500/30">Vendido</Badge>}
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold neon-title whitespace-nowrap">{formatCOP(listing.price)}</div>
        </div>

        <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
          {listing.location && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-primary" />{listing.location}</span>}
          <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5 text-accent" />{listing.viewsCount ?? 0} vistas</span>
        </div>

        <p className="text-sm text-muted-foreground leading-relaxed mb-6 break-words whitespace-pre-line">{listing.description || "Sin descripción."}</p>

        <div className="flex items-center gap-3 mb-6 p-4 bg-white/5 rounded-2xl border border-white/10">
          <img
            src={listing.seller?.avatarUrl ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${listing.seller?.id}`}
            className="w-10 h-10 rounded-full object-cover bg-muted cursor-pointer ring-2 ring-primary/30"
            alt=""
            onClick={() => listing.seller?.id && setLocation(`/profile/${listing.seller.id}`)}
          />
          <div className="min-w-0">
            <button
              type="button"
              className="font-semibold text-sm hover:text-primary neon-text truncate block max-w-full"
              onClick={() => listing.seller?.id && setLocation(`/profile/${listing.seller.id}`)}
            >
              {listing.seller?.displayName || "Vendedor"}
            </button>
            <div className="text-xs text-muted-foreground">Vendedor de la comunidad</div>
          </div>
        </div>

        {isOwner ? (
          <div className="space-y-2">
            <Button className="w-full rounded-xl font-bold gap-2" variant="outline" onClick={() => setShowEditModal(true)}>
              <Edit3 className="w-4 h-4 text-primary" /> Editar anuncio
            </Button>
            <Button className="w-full rounded-xl font-bold gap-2" variant="secondary" onClick={toggleSoldStatus} disabled={updateListing.isPending}>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              {listing.isAvailable ? "Marcar como vendido" : "Marcar como disponible"}
            </Button>
            <Button className="w-full rounded-xl font-bold gap-2" variant="destructive" onClick={removeListing} disabled={deleteListing.isPending}>
              <Trash2 className="w-4 h-4" /> Eliminar anuncio
            </Button>
          </div>
        ) : (
          <Button
            className="w-full rounded-xl neon-btn font-bold gap-2"
            size="lg"
            data-testid="button-contact-seller"
            onClick={contactSeller}
            disabled={!listing.isAvailable || startConversation.isPending}
          >
            {startConversation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageCircle className="w-4 h-4" />}
            Contactar vendedor por chat
          </Button>
        )}

        <Button
          variant="outline"
          className="w-full mt-2 rounded-xl gap-2"
          onClick={() => shareEntity({ title: listing.title, text: "Mira este producto en el Marketplace de MenpoeMax", path: `/marketplace/${listing.id}` })}
        >
          <Share2 className="w-4 h-4 text-accent" /> Compartir anuncio
        </Button>
      </div>
    </div>
  );
}

function ListingsGrid({
  listings,
  isLoading,
  onOpen,
}: {
  listings?: Array<{ id: string; title: string; price: number; location?: string; imageUrls?: string[]; isAvailable?: boolean }>;
  isLoading: boolean;
  onOpen: (id: string) => void;
}) {
  if (isLoading) {
    return (
      <>
        {[...Array(8)].map((_, i) => <div key={i} className="glass-panel rounded-2xl aspect-[3/4] animate-pulse" />)}
      </>
    );
  }
  if (!listings?.length) {
    return (
      <div className="col-span-full text-center py-16 text-muted-foreground">
        <ShoppingBag className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
        <p className="neon-text font-medium">No se encontraron anuncios</p>
        <p className="text-xs text-muted-foreground mt-1">Sé el primero en publicar un producto</p>
      </div>
    );
  }
  return (
    <>
      {listings.map((listing) => (
        <button
          key={listing.id}
          type="button"
          onClick={() => onOpen(listing.id)}
          className="glass-panel neon-border rounded-2xl overflow-hidden hover:scale-[1.02] transition-transform text-left group relative flex flex-col"
          data-testid={`card-listing-${listing.id}`}
        >
          <div className="aspect-square bg-gradient-to-br from-primary/10 to-accent/10 relative overflow-hidden w-full">
            {listing.imageUrls?.[0]
              ? <img src={listing.imageUrls[0]} className="w-full h-full object-cover group-hover:scale-105 transition-transform" alt={listing.title} />
              : <div className="w-full h-full flex items-center justify-center"><Package className="w-10 h-10 text-muted-foreground/30" /></div>}
            {!listing.isAvailable && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center">
                <span className="text-white text-xs font-bold px-2.5 py-1 bg-amber-500 text-black rounded-full">Vendido</span>
              </div>
            )}
          </div>
          <div className="p-3 flex-1 flex flex-col justify-between">
            <div>
              <div className="font-semibold text-sm truncate neon-text">{listing.title}</div>
              <div className="text-primary font-black mt-1 text-base">{formatCOP(listing.price)}</div>
            </div>
            {listing.location && <div className="flex items-center gap-1 text-[11px] text-muted-foreground mt-1 truncate"><MapPin className="w-3 h-3 text-primary shrink-0" />{listing.location}</div>}
          </div>
          <button
            type="button"
            className="absolute top-2 right-2 z-10 w-8 h-8 rounded-full bg-black/50 border border-white/20 flex items-center justify-center text-white/80 hover:text-white backdrop-blur-xs"
            onClick={(e) => {
              e.stopPropagation();
              shareEntity({ title: listing.title, text: "Mira este producto en el Marketplace", path: `/marketplace/${listing.id}` });
            }}
            title="Compartir"
          >
            <Share2 className="w-3.5 h-3.5" />
          </button>
        </button>
      ))}
    </>
  );
}

export default function Marketplace() {
  const [, params] = useRoute("/marketplace/:id");
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedListingId, setSelectedListingId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [tab, setTab] = useState<MarketplaceTab>("explore");

  const { data: categories } = useGetMarketplaceCategories();
  const { data: listings, isLoading } = useGetListings({
    q: search || undefined,
    category: selectedCategory ?? undefined,
  });
  const { data: myListings, isLoading: loadingMine } = useGetMyListings();

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

  const displayListings = tab === "mine" ? myListings : listings;
  const displayLoading = tab === "mine" ? loadingMine : isLoading;

  return (
    <Shell>
      <div className="max-w-5xl mx-auto w-full p-4 pb-24 max-w-full overflow-x-hidden">
        {showCreate && <CreateListingModal onClose={() => setShowCreate(false)} />}

        {selectedListingId ? (
          <ListingDetail listingId={selectedListingId} onBack={closeListing} />
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
              <div>
                <h1 className="text-3xl font-bold neon-title flex items-center gap-2">
                  <ShoppingBag className="w-8 h-8 text-primary" /> Marketplace
                </h1>
                <p className="text-muted-foreground text-sm mt-1">Compra y vende productos directamente en la comunidad</p>
              </div>
              <Button className="neon-btn rounded-2xl font-bold gap-2" onClick={() => setShowCreate(true)}>
                <Plus className="w-4 h-4" /> Vender producto
              </Button>
            </div>

            {/* Search & Tabs */}
            <div className="space-y-4 mb-6">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar productos..."
                    className="pl-9 rounded-2xl bg-white/5 text-sm"
                  />
                </div>
              </div>

              {/* Tabs */}
              <div className="flex gap-2 border-b border-border/30 pb-2 overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setTab("explore")}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all shrink-0 ${
                    tab === "explore" ? "bg-primary/20 text-primary border border-primary/40 neon-text" : "text-muted-foreground hover:bg-white/5"
                  }`}
                >
                  Explorar todos los productos
                </button>
                <button
                  type="button"
                  onClick={() => setTab("mine")}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all shrink-0 ${
                    tab === "mine" ? "bg-primary/20 text-primary border border-primary/40 neon-text" : "text-muted-foreground hover:bg-white/5"
                  }`}
                >
                  Mis publicaciones ({myListings?.length ?? 0})
                </button>
              </div>

              {/* Category Pills */}
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                <button
                  type="button"
                  onClick={() => setSelectedCategory(null)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all shrink-0 ${
                    !selectedCategory ? "bg-primary text-primary-foreground font-bold" : "bg-white/5 text-muted-foreground hover:bg-white/10"
                  }`}
                >
                  Todas las categorías
                </button>
                {MARKETPLACE_CATEGORIES.map((cat) => {
                  const Icon = CATEGORY_ICONS[cat.id] || Tag;
                  const selected = selectedCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCategory(selected ? null : cat.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all shrink-0 flex items-center gap-1.5 ${
                        selected ? "bg-primary text-primary-foreground font-bold" : "bg-white/5 text-muted-foreground hover:bg-white/10"
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {cat.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              <ListingsGrid listings={displayListings} isLoading={displayLoading} onOpen={openListing} />
            </div>
          </>
        )}
      </div>
    </Shell>
  );
}
