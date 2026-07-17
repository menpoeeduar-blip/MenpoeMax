import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import {
  useSearchGlobal,
  useGetSearchHistory,
  getSearchGlobalQueryKey,
} from "@workspace/api-client-react";
import {
  Search,
  X,
  Building2,
  FileText,
  Briefcase,
  ShoppingBag,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getPageTypeLabel } from "@/lib/page-types";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

type AnyObj = Record<string, unknown>;

function useDebouncedValue<T>(value: T, delay = 280): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

type SearchResultsProps = {
  query: string;
  debouncedQuery: string;
  onNavigate: () => void;
  className?: string;
};

function SearchResultsPanel({ query, debouncedQuery, onNavigate, className }: SearchResultsProps) {
  const [, setLocation] = useLocation();
  const { data: results, isLoading } = useSearchGlobal(
    { q: debouncedQuery },
    {
      query: {
        enabled: debouncedQuery.length > 1,
        queryKey: getSearchGlobalQueryKey({ q: debouncedQuery }),
      },
    },
  );
  const { data: searchHistory } = useGetSearchHistory();

  const go = (path: string) => {
    onNavigate();
    setLocation(path);
  };

  if (query.length <= 1) {
    if ((searchHistory?.length ?? 0) === 0) {
      return (
        <div className={cn("p-4 text-sm text-muted-foreground text-center", className)}>
          Busca personas, grupos, páginas, empleos, marketplace y publicaciones
        </div>
      );
    }
    return (
      <div className={cn("p-3", className)}>
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 px-1">Recientes</p>
        <div className="flex flex-wrap gap-2">
          {(searchHistory ?? []).slice(0, 8).map((term: string) => (
            <button
              key={term}
              type="button"
              onClick={() => go(`/explore?q=${encodeURIComponent(term)}`)}
              className="px-3 py-1.5 rounded-full text-xs bg-white/5 hover:bg-primary/20 border border-border/40"
            >
              {term}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={cn("p-6 flex items-center justify-center gap-2 text-sm text-muted-foreground", className)}>
        <Loader2 className="w-4 h-4 animate-spin text-primary" />
        Buscando...
      </div>
    );
  }

  const users = results?.users ?? [];
  const communities = results?.communities ?? [];
  const pages = results?.pages ?? [];
  const posts = results?.posts ?? [];
  const jobs = (results as { jobs?: AnyObj[] })?.jobs ?? [];
  const listings = (results as { listings?: AnyObj[] })?.listings ?? [];
  const hasAny =
    users.length > 0 ||
    communities.length > 0 ||
    pages.length > 0 ||
    posts.length > 0 ||
    jobs.length > 0 ||
    listings.length > 0;

  if (!hasAny) {
    return (
      <div className={cn("p-4 text-sm text-muted-foreground text-center", className)}>
        Sin resultados para &quot;{query}&quot;
      </div>
    );
  }

  return (
    <div className={cn("max-h-[min(70vh,420px)] overflow-y-auto overscroll-contain", className)}>
      {users.length > 0 && (
        <section>
          <p className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border/30">
            Personas
          </p>
          {users.slice(0, 5).map((user: AnyObj) => (
            <button
              key={user.id}
              type="button"
              onClick={() => go(`/profile/${user.id}`)}
              className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/8 text-left transition-colors"
            >
              <img
                src={user.avatarUrl ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`}
                className="w-9 h-9 rounded-full object-cover bg-muted flex-none"
                alt=""
              />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium truncate">{user.displayName}</div>
                <div className="text-xs text-muted-foreground truncate">@{user.username}</div>
              </div>
            </button>
          ))}
        </section>
      )}

      {communities.length > 0 && (
        <section>
          <p className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border/30">
            Grupos y comunidades
          </p>
          {communities.slice(0, 5).map((c: AnyObj) => (
            <button
              key={c.id}
              type="button"
              onClick={() => go(`/communities/${c.id}`)}
              className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/8 text-left"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold flex-none">
                {(c.name || "G")[0]}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">{c.name}</div>
                <div className="text-xs text-muted-foreground">{c.membersCount ?? 0} miembros</div>
              </div>
            </button>
          ))}
        </section>
      )}

      {pages.length > 0 && (
        <section>
          <p className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border/30">
            Páginas y negocios
          </p>
          {pages.slice(0, 4).map((page: AnyObj) => (
            <button
              key={page.id}
              type="button"
              onClick={() => go(`/business/${page.id}`)}
              className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/8 text-left"
            >
              <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-primary/30 flex items-center justify-center flex-none">
                <Building2 className="w-4 h-4 text-primary" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">{page.name}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {page.category}
                  {page.pageType ? ` · ${getPageTypeLabel(page.pageType)}` : ""}
                </div>
              </div>
            </button>
          ))}
        </section>
      )}

      {jobs.length > 0 && (
        <section>
          <p className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border/30">
            Empleos
          </p>
          {jobs.slice(0, 4).map((job: AnyObj) => (
            <button
              key={job.id}
              type="button"
              onClick={() => go(`/jobs?job=${job.id}`)}
              className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/8 text-left"
            >
              <Briefcase className="w-5 h-5 text-primary flex-none" />
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">{job.title}</div>
                <div className="text-xs text-muted-foreground truncate">{job.company || job.location}</div>
              </div>
            </button>
          ))}
        </section>
      )}

      {listings.length > 0 && (
        <section>
          <p className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border/30">
            Marketplace
          </p>
          {listings.slice(0, 4).map((listing: AnyObj) => (
            <button
              key={listing.id}
              type="button"
              onClick={() => go(`/marketplace/${listing.id}`)}
              className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/8 text-left"
            >
              <ShoppingBag className="w-5 h-5 text-primary flex-none" />
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">{listing.title}</div>
                <div className="text-xs text-muted-foreground truncate">{listing.location || "Anuncio"}</div>
              </div>
            </button>
          ))}
        </section>
      )}

      {posts.length > 0 && (
        <section>
          <p className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border/30">
            Publicaciones
          </p>
          {posts.slice(0, 4).map((post: AnyObj) => (
            <button
              key={post.id}
              type="button"
              onClick={() => go(`/#post-${post.id}`)}
              className="w-full px-3 py-2.5 hover:bg-white/8 text-left"
            >
              <p className="text-sm line-clamp-2">{post.content}</p>
              <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                <FileText className="w-3 h-3" /> Publicación
              </p>
            </button>
          ))}
        </section>
      )}

      <button
        type="button"
        onClick={() => go(`/explore?q=${encodeURIComponent(query.trim())}`)}
        className="w-full px-3 py-3 text-sm text-primary hover:bg-primary/10 border-t border-border/30 font-medium"
      >
        Ver todos los resultados
      </button>
    </div>
  );
}

/** Buscador global estilo Facebook: barra en desktop, lupa + panel en móvil. */
export function GlobalSearch() {
  const [, setLocation] = useLocation();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const debouncedQuery = useDebouncedValue(query.trim(), 280);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  useEffect(() => {
    if (mobileOpen) {
      const t = setTimeout(() => inputRef.current?.focus(), 120);
      return () => clearTimeout(t);
    }
  }, [mobileOpen]);

  const closeAll = () => {
    setOpen(false);
    setMobileOpen(false);
  };

  const searchField = (
    <div className="relative flex items-center gap-2 rounded-full border border-primary/40 bg-card/50 px-3 py-2 neon-border w-full">
      <Search className="w-4 h-4 text-primary flex-none" />
      <input
        ref={inputRef}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setOpen(false);
            setMobileOpen(false);
          }
          if (e.key === "Enter" && query.trim()) {
            const q = query.trim();
            closeAll();
            setLocation(`/explore?q=${encodeURIComponent(q)}`);
          }
        }}
        className="bg-transparent outline-none text-sm w-full placeholder:text-muted-foreground min-h-[24px]"
        placeholder="Buscar en MenpoeMax"
        aria-label="Buscar personas, grupos y más"
        autoComplete="off"
      />
      {query && (
        <button
          type="button"
          onClick={() => setQuery("")}
          className="text-muted-foreground hover:text-foreground p-0.5"
          aria-label="Limpiar búsqueda"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop */}
      <div ref={containerRef} className="hidden md:block relative flex-1 max-w-[280px] lg:max-w-[360px] mx-1">
        {searchField}
        {open && (
          <div className="absolute top-full left-0 right-0 mt-2 glass-panel neon-border rounded-2xl shadow-2xl z-[100] overflow-hidden">
            <SearchResultsPanel
              query={query.trim()}
              debouncedQuery={debouncedQuery}
              onNavigate={closeAll}
            />
          </div>
        )}
      </div>

      {/* Móvil: lupa */}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="md:hidden h-10 w-10 rounded-full"
        onClick={() => setMobileOpen(true)}
        aria-label="Abrir buscador"
      >
        <Search className="w-5 h-5 text-primary" />
      </Button>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="top" className="glass-panel neon-border border-b p-0 pt-safe max-h-[92dvh] flex flex-col">
          <div className="p-4 border-b border-border/30 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-lg font-semibold neon-text">Buscar</h2>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="p-2 rounded-full hover:bg-white/10"
                aria-label="Cerrar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {searchField}
          </div>
          <SearchResultsPanel
            query={query.trim()}
            debouncedQuery={debouncedQuery}
            onNavigate={closeAll}
            className="flex-1"
          />
        </SheetContent>
      </Sheet>
    </>
  );
}
