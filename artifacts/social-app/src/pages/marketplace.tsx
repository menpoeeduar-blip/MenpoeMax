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
  MessageCircle, Trash2, CheckCircle2, Eye, Loader2,
} from "lucide-react";
import { shareEntity } from "@/lib/share";
import { FormSelect } from "@/components/ui/form-select";
import { AppModal } from "@/components/ui/app-modal";
import { formatCOP } from "@/lib/format-currency";
import { uploadFile } from "@/lib/upload";
import { ImagePlus } from "lucide-react";
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

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.title.trim()) { setError("El título es obligatorio"); return; }
    if (!form.price || isNaN(Number(form.price)) || Number(form.price) <= 0) { setError("Ingresa un precio válido en COP"); return; }

    createListing.mutate(
      { data: { title: form.title, description: form.description, price: Number(form.price), currency: "COP", category: form.category, condition: form.condition, location: form.location || undefined, imageUrls } },
      {
        onSuccess: () => { qc.invalidateQueries(); onClose(); },
        onError: () => setError("Error al crear el anuncio. Intenta de nuevo."),
      },
    );
  };

  return (
    <AppModal open onClose={onClose} className="w-full max-w-md">
      <div className="glass-panel rounded-2xl p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">Publicar anuncio</h2>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Título *</label>
            <Input value={form.title} onChange={set("title")} placeholder="¿Qué estás vendiendo?" className="rounded-xl bg-white/5" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Descripción</label>
            <textarea value={form.description} onChange={set("description")} placeholder="Describe tu producto..." rows={3}
              className="w-full rounded-xl bg-white/5 border border-input px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Precio (COP) *</label>
              <Input type="number" min="0" step="1000" value={form.price} onChange={set("price")} placeholder="150000" className="rounded-xl bg-white/5" />
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
            <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-dashed border-primary/40 cursor-pointer text-sm">
              <ImagePlus className="w-4 h-4" /> {uploading ? "Subiendo..." : "Agregar imagen"}
              <input type="file" accept="image/*" multiple className="hidden" disabled={uploading} onChange={handleImage} />
            </label>
            {imageUrls.length > 0 && (
              <div className="flex gap-2 mt-2 flex-wrap">
                {imageUrls.map((url, i) => (
                  <img key={i} src={url} alt="" className="w-16 h-16 rounded-lg object-cover" />
                ))}
              </div>
            )}
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1 rounded-xl" onClick={onClose}>Cancelar</Button>
            <Button type="submit" className="flex-1 rounded-xl" disabled={createListing.isPending}>
              {createListing.isPending ? "Publicando..." : "Publicar"}
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

  const markSold = () => {
    updateListing.mutate(
      { listingId, data: { isAvailable: false } },
      {
        onSuccess: () => toast({ title: "Marcado como vendido" }),
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

  return (
    <div className="max-w-2xl mx-auto">
      <button type="button" onClick={onBack} className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" />Volver al marketplace
      </button>
      {(listing.imageUrls?.length ?? 0) > 0 ? (
        <div className="rounded-2xl overflow-hidden mb-6 aspect-video bg-muted">
          <img src={listing.imageUrls?.[0]} className="w-full h-full object-cover" alt={listing.title} />
        </div>
      ) : (
        <div className="rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 mb-6 aspect-video flex items-center justify-center">
          <Package className="w-16 h-16 text-muted-foreground/30" />
        </div>
      )}
      <div className="glass-panel rounded-2xl p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h1 className="text-2xl font-bold mb-1">{listing.title}</h1>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="text-xs">{CONDITION_LABELS[listing.condition] ?? listing.condition}</Badge>
              <Badge variant="outline" className="text-xs">{MARKETPLACE_CATEGORIES.find((c) => c.id === listing.category)?.name ?? listing.category}</Badge>
              {!listing.isAvailable && <Badge className="text-xs bg-amber-500/20 text-amber-300 border-amber-500/30">Vendido</Badge>}
            </div>
          </div>
          <div className="text-3xl font-bold text-primary whitespace-nowrap">{formatCOP(listing.price)}</div>
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
          {listing.location && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{listing.location}</span>}
          <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5" />{listing.viewsCount ?? 0} vistas</span>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed mb-6">{listing.description || "Sin descripción."}</p>
        <div className="flex items-center gap-3 mb-6 p-4 bg-white/5 rounded-xl">
          <img
            src={listing.seller.avatarUrl ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${listing.seller.id}`}
            className="w-10 h-10 rounded-full object-cover bg-muted cursor-pointer"
            alt=""
            onClick={() => setLocation(`/profile/${listing.seller.id}`)}
          />
          <div>
            <button
              type="button"
              className="font-medium text-sm hover:text-primary"
              onClick={() => setLocation(`/profile/${listing.seller.id}`)}
            >
              {listing.seller.displayName}
            </button>
            <div className="text-xs text-muted-foreground">Vendedor</div>
          </div>
        </div>

        {isOwner ? (
          <div className="space-y-2">
            {listing.isAvailable && (
              <Button className="w-full rounded-xl" variant="secondary" onClick={markSold} disabled={updateListing.isPending}>
                <CheckCircle2 className="w-4 h-4 mr-2" />Marcar como vendido
              </Button>
            )}
            <Button className="w-full rounded-xl" variant="destructive" onClick={removeListing} disabled={deleteListing.isPending}>
              <Trash2 className="w-4 h-4 mr-2" />Eliminar anuncio
            </Button>
          </div>
        ) : (
          <Button
            className="w-full rounded-xl"
            size="lg"
            data-testid="button-contact-seller"
            onClick={contactSeller}
            disabled={!listing.isAvailable || startConversation.isPending}
          >
            {startConversation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <MessageCircle className="w-4 h-4 mr-2" />}
            Contactar vendedor
          </Button>
        )}

        <Button
          variant="outline"
          className="w-full mt-2 rounded-xl"
          onClick={() => shareEntity({ title: listing.title, text: "Mira este producto", path: `/marketplace/${listing.id}` })}
        >
          <Share2 className="w-4 h-4 mr-2" />Compartir anuncio
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
        <p>No se encontraron anuncios</p>
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
          className="glass-panel rounded-2xl overflow-hidden hover:scale-[1.02] transition-transform text-left group relative"
          data-testid={`card-listing-${listing.id}`}
        >
          <div className="aspect-square bg-gradient-to-br from-primary/10 to-accent/10 relative overflow-hidden">
            {listing.imageUrls?.[0]
              ? <img src={listing.imageUrls[0]} className="w-full h-full object-cover group-hover:scale-105 transition-transform" alt={listing.title} />
              : <div className="w-full h-full flex items-center justify-center"><Package className="w-10 h-10 text-muted-foreground/30" /></div>}
            {!listing.isAvailable && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <span className="text-white text-xs font-medium px-2 py-1 bg-black/50 rounded-full">Vendido</span>
              </div>
            )}
          </div>
          <div className="p-3">
            <div className="font-medium text-sm truncate">{listing.title}</div>
            <div className="text-primary font-bold mt-1">{formatCOP(listing.price)}</div>
            {listing.location && <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1"><MapPin className="w-3 h-3" />{listing.location}</div>}
          </div>
          <button
            type="button"
            className="absolute top-2 right-2 z-10 w-8 h-8 rounded-full bg-black/40 border border-border flex items-center justify-center text-white/80 hover:text-white"
            onClick={(e) => {
              e.stopPropagation();
              shareEntity({ title: listing.title, text: "Mira este producto", path: `/marketplace/${listing.id}` });
            }}
          >
            <Share2 className="w-4 h-4" />
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
      <div className="max-w-5xl mx-auto w-full p-4 pb-24">
        {showCreate && <CreateListingModal onClose={() => setShowCreate(false)} />}

        {selectedListingId ? (
          <ListingDetail listingId={selectedListingId} onBack={closeListing} />
        ) : (
          <>
            <div className="flex items-center justify-between mb-6 gap-3">
              <div>
                <h1 className="text-3xl font-bold">Marketplace</h1>
                <p className="text-muted-foreground text-sm">Compra y vende cerca de ti, en pesos colombianos</p>
              </div>
              <Button className="rounded-2xl flex-none" data-testid="button-create-listing" onClick={() => setShowCreate(true)}>
                <Plus className="w-4 h-4 mr-2" />Vender
              </Button>
            </div>

            <div className="flex gap-2 mb-4 p-1 rounded-xl bg-white/5 w-fit">
              <button
                type="button"
                onClick={() => setTab("explore")}
                className={cn("px-4 py-2 rounded-lg text-sm font-medium transition-colors", tab === "explore" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
              >
                Explorar
              </button>
              <button
                type="button"
                onClick={() => setTab("mine")}
                className={cn("px-4 py-2 rounded-lg text-sm font-medium transition-colors", tab === "mine" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
                data-testid="tab-my-listings"
              >
                Mis anuncios
              </button>
            </div>

            {tab === "explore" && (
              <>
                <div className="relative mb-4">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar productos..." className="pl-12 h-12 rounded-2xl bg-white/5" data-testid="input-marketplace-search" />
                </div>

                <div className="flex gap-2 overflow-x-auto pb-3 mb-6">
                  <button type="button" onClick={() => setSelectedCategory(null)} className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all flex-none ${!selectedCategory ? "bg-primary text-primary-foreground" : "bg-white/5 text-muted-foreground hover:bg-white/10"}`}>
                    <ShoppingBag className="w-4 h-4" />Todos
                  </button>
                  {categories?.map((cat) => {
                    const Icon = CATEGORY_ICONS[cat.id] ?? Tag;
                    return (
                      <button key={cat.id} type="button" onClick={() => setSelectedCategory(selectedCategory === cat.id ? null : cat.id)} className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all flex-none ${selectedCategory === cat.id ? "bg-primary text-primary-foreground" : "bg-white/5 text-muted-foreground hover:bg-white/10"}`} data-testid={`filter-category-${cat.id}`}>
                        <Icon className="w-4 h-4" />{cat.name}
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {tab === "mine" && (
              <p className="text-sm text-muted-foreground mb-4">Administra tus publicaciones: márcalas vendidas o elimínalas.</p>
            )}

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              <ListingsGrid listings={displayListings} isLoading={displayLoading} onOpen={openListing} />
            </div>
          </>
        )}
      </div>
    </Shell>
  );
}
