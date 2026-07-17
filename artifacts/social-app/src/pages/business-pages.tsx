import { useState } from "react";
import { Link } from "wouter";
import { Shell } from "@/components/layout/Shell";
import { useGetBusinessPages } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CreateProfessionalEntityModal } from "@/components/create/CreateProfessionalEntityModal";
import { getPageTypeLabel } from "@/lib/page-types";
import { Building2, Plus, Search, Users, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export default function BusinessPages() {
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"mine" | "discover">("mine");
  const [showCreate, setShowCreate] = useState(false);

  const { data: myPages, isLoading: loadingMine } = useGetBusinessPages({ q: search || undefined, mine: true });
  const { data: discoverPages, isLoading: loadingDiscover } = useGetBusinessPages({
    q: search || undefined,
    discover: true,
  });

  const pages = tab === "mine" ? myPages : discoverPages;
  const isLoading = tab === "mine" ? loadingMine : loadingDiscover;

  return (
    <Shell>
      <div className="max-w-4xl mx-auto w-full p-4 pb-24">
        {showCreate && <CreateProfessionalEntityModal onClose={() => setShowCreate(false)} />}

        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold neon-title mb-2">Páginas y negocios</h1>
            <p className="text-sm text-muted-foreground neon-subtle max-w-lg">
              Crea páginas de marca, empresa o creador con seguidores propios. Aparecen al buscar en Explorar.
            </p>
          </div>
          <Button onClick={() => setShowCreate(true)} className="neon-btn rounded-xl shrink-0">
            <Plus className="w-4 h-4 mr-2" /> Crear página
          </Button>
        </div>

        <div className="relative mb-4">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar páginas por nombre o categoría..."
            className="pl-12 h-12 rounded-2xl neon-input"
          />
        </div>

        <div className="flex gap-2 mb-6">
          {(["mine", "discover"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-medium transition-all",
                tab === t ? "bg-primary text-primary-foreground shadow-[0_0_16px_hsl(var(--primary)/0.45)]" : "bg-white/5 text-muted-foreground hover:bg-white/10",
              )}
            >
              {t === "mine" ? "Mis páginas" : "Descubrir"}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="grid gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 glass-panel rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : (pages ?? []).length === 0 ? (
          <div className="page-create-modal rounded-3xl p-10 text-center">
            <Sparkles className="w-14 h-14 mx-auto mb-4 text-primary" />
            <p className="text-lg font-semibold neon-text mb-2">Crea tu primera página profesional</p>
            <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
              Elige entre negocio, creador, marca, artista y más. Tu página será visible en búsquedas.
            </p>
            <Button onClick={() => setShowCreate(true)} className="neon-btn rounded-xl">
              <Plus className="w-4 h-4 mr-2" /> Empezar
            </Button>
          </div>
        ) : (
          <div className="grid gap-4">
            {(pages ?? []).map((p: any) => (
              <Link key={p.id} href={`/business/${p.id}`}>
                <div className="glass-panel neon-border rounded-2xl p-4 flex items-center gap-4 hover:border-primary/50 transition-all cursor-pointer">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold text-xl shadow-[0_0_20px_hsl(var(--primary)/0.5)]">
                    {p.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold neon-text truncate">{p.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      @{p.slug} · {p.category}
                      {p.pageType ? ` · ${getPageTypeLabel(p.pageType)}` : ""}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{p.description}</p>
                  </div>
                  <div className="text-xs flex items-center gap-1 text-muted-foreground shrink-0">
                    <Users className="w-3.5 h-3.5" />
                    {p.followersCount}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {tab === "mine" && (pages ?? []).length > 0 && (
          <p className="text-xs text-center text-muted-foreground mt-6 flex items-center justify-center gap-1">
            <Building2 className="w-3.5 h-3.5" />
            Tip: usa la búsqueda global para que otros encuentren tus páginas
          </p>
        )}
      </div>
    </Shell>
  );
}
