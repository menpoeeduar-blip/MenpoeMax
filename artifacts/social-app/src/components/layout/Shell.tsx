import { Link, useLocation } from "wouter";
import { useUser, useClerk } from "@clerk/react";
import {
  Home, Compass, PlaySquare, MessageSquare, Bell,
  Briefcase, ShoppingBag, Users, Calendar, Radio, Menu,
  LogOut, UserCog, Moon, Sun, UserPlus,
  Image, Bookmark, Building2, BarChart3, Shield, HelpCircle,
  Sparkles, Settings2, Cake, Clock, Cog, Coins, ShieldCheck, FileText, Flag,
} from "lucide-react";
import { GlobalSearch } from "@/components/layout/GlobalSearch";
import { ScrollToTopFab } from "@/components/ScrollToTopFab";
import { BrandLogo } from "@/components/BrandLogo";
import { PwaInstallPrompt } from "@/components/PwaInstallPrompt";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState } from "react";
import { AstralBackground } from "@/components/AstralBackground";
import { PageTransition } from "@/components/PageTransition";
import { useGetMe, useGetUnreadNotificationsCount, useIsAdmin } from "@workspace/api-client-react";
import { ScrollArea } from "@/components/ui/scroll-area";

// ─── Grupos de Navegación Profesional ────────────────────────────────────────

const TOP_NAV_ITEMS = [
  { icon: Home, label: "Inicio", href: "/" },
  { icon: Compass, label: "Explorar", href: "/explore" },
  { icon: PlaySquare, label: "Reels", href: "/reels" },
  { icon: MessageSquare, label: "Mensajes", href: "/messages" },
  { icon: UserPlus, label: "Amigos", href: "/friends" },
  { icon: Bell, label: "Notificaciones", href: "/notifications" },
];

const SOCIAL_SECTIONS = [
  { icon: Users, label: "Comunidades", href: "/communities" },
  { icon: Calendar, label: "Eventos", href: "/events" },
  { icon: Radio, label: "En vivo", href: "/streams" },
  { icon: Clock, label: "Recuerdos", href: "/memories" },
  { icon: Cake, label: "Cumpleaños", href: "/birthdays" },
];

const BIZ_SECTIONS = [
  { icon: Briefcase, label: "Empleos", href: "/jobs" },
  { icon: FileText, label: "Mi hoja de vida", href: "/resume" },
  { icon: ShoppingBag, label: "Marketplace", href: "/marketplace" },
  { icon: Building2, label: "Páginas y negocios", href: "/business" },
  { icon: Coins, label: "Billetera y regalos", href: "/wallet" },
  { icon: Sparkles, label: "Promocionar", href: "/promote" },
];

const PROFILE_SECTIONS = [
  { icon: Sparkles, label: "Avatares y stickers", href: "avatars" },
  { icon: Image, label: "Fotos y álbumes", href: "photos" },
  { icon: Bookmark, label: "Guardados", href: "saved" },
  { icon: BarChart3, label: "Estadísticas", href: "stats" },
];

const UTILITY_SECTIONS = [
  { icon: Cog, label: "Configuración", href: "/settings" },
  { icon: Shield, label: "Privacidad", href: "/privacy" },
  { icon: HelpCircle, label: "Ayuda y soporte", href: "/help" },
];

function profileHubSections(profileId: string) {
  const base = `/profile/${profileId}`;
  return PROFILE_SECTIONS.map((s) => ({ ...s, href: `${base}?tab=${s.href}` }));
}

function NavLink({ item, location }: { item: { icon: typeof Home; label: string; href: string; badge?: string }; location: string }) {
  const [pathOnly, queryPart] = item.href.split("?");
  const currentSearch = typeof window !== "undefined" ? window.location.search : "";
  const isActive = queryPart
    ? location === pathOnly && currentSearch.includes(queryPart)
    : location === item.href || location.startsWith(item.href + "/");
  return (
    <Link href={item.href} className={cn(
      "flex items-center gap-3 px-3 py-2 rounded-xl transition-all text-sm",
      isActive ? "bg-primary/25 text-primary shadow-[0_0_16px_hsl(var(--primary)/0.455)] neon-text" : "text-muted-foreground hover:bg-white/8 hover:text-primary/95"
    )}>
      <item.icon className="w-4 h-4 flex-none" />
      <span className="truncate">{item.label}</span>
      {item.badge && <span className="ml-auto text-[9px] px-1.5 py-0.5 rounded-full bg-accent/30 text-accent">{item.badge}</span>}
    </Link>
  );
}

export function Shell({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user } = useUser();
  const { signOut } = useClerk();
  const [darkMode, setDarkMode] = useState(true);
  const { data: unreadCount } = useGetUnreadNotificationsCount();
  const { data: me } = useGetMe();
  const { data: isAdmin } = useIsAdmin();
  const profileId = me?.id || user?.id || "";
  const headerAvatar =
    me?.avatarUrl || user?.imageUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profileId || "guest"}`;
  const profileHref = profileId ? `/profile/${profileId}` : "/profile";
  const profileSections = profileId ? profileHubSections(profileId) : [];
  const adminItems = isAdmin
    ? [
        { icon: ShieldCheck, label: "Admin — Recargas", href: "/admin/gifts" },
        { icon: Flag, label: "Admin — Moderación", href: "/admin/reports" },
      ]
    : [];
  const isReelsPage = location === "/reels";

  return (
    <div className="min-h-screen bg-transparent text-foreground relative">
      <AstralBackground />
      <header className="fixed top-0 z-50 w-full border-b border-primary/30 bg-background/55 backdrop-blur-xl neon-chrome overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[2px] overflow-hidden">
          <div className="h-full w-1/3 animate-[neon-line-sweep_2.8s_linear_infinite] bg-gradient-to-r from-transparent via-cyan-400 to-fuchsia-500 shadow-[0_0_12px_#22d3ee]" />
        </div>
        <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between px-3 md:px-6">
          <div className="flex items-center gap-3">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden"><Menu className="w-5 h-5" /></Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80 glass-panel neon-border neon-run border-r p-0">
                <ScrollArea className="h-full p-4">
                  <div className="flex items-center gap-2 mb-6">
                    <BrandLogo size="sm" showWordmark={false} href={false} />
                    <span className="text-lg font-bold neon-title">
                      Menpoe<span className="bg-gradient-to-r from-fuchsia-400 to-pink-500 bg-clip-text text-transparent">Max</span>
                    </span>
                  </div>
                  <p className="text-[10px] uppercase tracking-widest text-primary/80 mb-2 font-semibold">Navegación</p>
                  {TOP_NAV_ITEMS.map((item) => <NavLink key={item.href} item={item} location={location} />)}
                  <p className="text-[10px] uppercase tracking-widest text-accent/80 mt-4 mb-2 font-semibold">Red Social</p>
                  {SOCIAL_SECTIONS.map((item) => <NavLink key={item.href} item={item} location={location} />)}
                  <p className="text-[10px] uppercase tracking-widest text-primary/80 mt-4 mb-2 font-semibold">Negocios y Empleo</p>
                  {BIZ_SECTIONS.map((item) => <NavLink key={item.href} item={item} location={location} />)}
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-4 mb-2 font-semibold">Más</p>
                  {UTILITY_SECTIONS.map((item) => <NavLink key={item.href} item={item} location={location} />)}
                  {adminItems.map((item) => <NavLink key={item.href} item={item} location={location} />)}
                </ScrollArea>
              </SheetContent>
            </Sheet>
            <Link href="/" className="flex items-center gap-2">
              <BrandLogo size="sm" showWordmark={false} href={false} />
              <span className="text-lg font-bold neon-title hidden sm:inline">
                Menpoe<span className="bg-gradient-to-r from-fuchsia-400 to-pink-500 bg-clip-text text-transparent">Max</span>
              </span>
            </Link>
            <GlobalSearch />
          </div>
          <nav className="hidden md:flex items-center gap-1 flex-none">
            {TOP_NAV_ITEMS.map((item) => {
              const isActive = location === item.href;
              const isNotif = item.href === "/notifications";
              return (
                <Link key={item.href} href={item.href} className={cn(
                  "h-11 min-w-12 px-3 rounded-xl flex items-center justify-center transition-all relative",
                  isActive ? "bg-primary/25 text-primary shadow-[0_0_18px_hsl(var(--primary)/0.455)]" : "text-muted-foreground hover:bg-white/8"
                )}>
                  <item.icon className="w-5 h-5" />
                  {isNotif && (unreadCount ?? 0) > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-accent text-[9px] font-bold text-white shadow-[0_0_12px_hsl(var(--accent)/0.8)]">
                      {(unreadCount ?? 0) > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
          <div className="flex items-center gap-2">
            <button onClick={() => setDarkMode(!darkMode)} className="h-9 w-9 rounded-full glass-panel neon-border flex items-center justify-center">
              {darkMode ? <Sun className="w-4 h-4 text-primary" /> : <Moon className="w-4 h-4" />}
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="h-9 w-9 rounded-full overflow-hidden ring-2 ring-primary/50 shadow-[0_0_12px_hsl(var(--primary)/0.4)]" type="button">
                  <img src={headerAvatar} className="w-full h-full object-cover" alt="" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="glass-panel neon-border w-56">
                <DropdownMenuItem asChild>
                  <Link href={profileHref} className="flex items-center cursor-pointer">
                    <UserCog className="w-4 h-4 mr-2" /> Mi Perfil
                  </Link>
                </DropdownMenuItem>
                
                {/* ── Secciones de Perfil Agrupadas aquí en el Dropdown ── */}
                {profileSections.length > 0 && (
                  <>
                    <DropdownMenuSeparator className="bg-primary/20" />
                    {profileSections.map((item) => (
                      <DropdownMenuItem asChild key={item.href}>
                        <Link href={item.href} className="flex items-center cursor-pointer">
                          <item.icon className="w-4 h-4 mr-2 text-accent" /> {item.label}
                        </Link>
                      </DropdownMenuItem>
                    ))}
                  </>
                )}
                
                <DropdownMenuSeparator className="bg-primary/20" />
                <DropdownMenuItem asChild><Link href="/settings"><Cog className="w-4 h-4 mr-2" /> Configuración</Link></DropdownMenuItem>
                <DropdownMenuItem asChild><Link href="/privacy"><Shield className="w-4 h-4 mr-2" /> Privacidad</Link></DropdownMenuItem>
                <DropdownMenuSeparator className="bg-primary/20" />
                <DropdownMenuItem
                  className="text-red-400 focus:text-red-300"
                  onSelect={(e) => {
                    e.preventDefault();
                    void signOut();
                  }}
                >
                  <LogOut className="w-4 h-4 mr-2" /> Cerrar sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1400px] pt-16">
        <aside className="hidden lg:flex flex-col w-64 xl:w-72 border-r border-primary/20 h-[calc(100vh-4rem)] sticky top-16">
          <ScrollArea className="flex-1 p-4">
            <div className="glass-panel neon-border rounded-2xl p-3 mb-4">
              <Link href={profileHref} className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-white/8">
                <img src={headerAvatar} className="w-10 h-10 rounded-full ring-2 ring-primary/40 object-cover" alt="" />
                <div className="overflow-hidden">
                  <span className="text-sm font-medium neon-text block truncate">{user?.fullName || "Perfil"}</span>
                  <span className="text-xs text-muted-foreground">@{user?.username || "usuario"}</span>
                </div>
              </Link>
            </div>
            
            <p className="text-[10px] uppercase tracking-widest text-accent font-semibold px-2 mb-2 neon-subtle">Red Social</p>
            <div className="space-y-0.5 mb-5">
              {SOCIAL_SECTIONS.map((item) => <NavLink key={item.href} item={item} location={location} />)}
            </div>
            
            <p className="text-[10px] uppercase tracking-widest text-primary font-semibold px-2 mb-2 neon-subtle">Negocios y Empleo</p>
            <div className="space-y-0.5 mb-5">
              {BIZ_SECTIONS.map((item) => <NavLink key={item.href} item={item} location={location} />)}
            </div>
            
            {adminItems.length > 0 && (
              <>
                <p className="text-[10px] uppercase tracking-widest text-red-400 font-semibold px-2 mb-2 neon-subtle">Administración</p>
                <div className="space-y-0.5 mb-5">
                  {adminItems.map((item) => <NavLink key={item.href} item={item} location={location} />)}
                </div>
              </>
            )}

            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold px-2 mb-2 neon-subtle">Más</p>
            <div className="space-y-0.5">
              {UTILITY_SECTIONS.map((item) => <NavLink key={item.href} item={item} location={location} />)}
            </div>
          </ScrollArea>
        </aside>
        
        <main
          className={cn(
            "flex-1 min-w-0 flex flex-col min-h-0",
            isReelsPage
              ? "mb-16 md:mb-0 h-[calc(100dvh-8rem)] md:h-[calc(100vh-4rem)] max-h-[calc(100dvh-8rem)] md:max-h-[calc(100vh-4rem)] overflow-hidden p-0"
              : "mb-16 md:mb-0 min-h-[calc(100vh-4rem)]",
          )}
        >
          <PageTransition key={location} fill={isReelsPage}>
            {children}
          </PageTransition>
        </main>
      </div>

      {!isReelsPage && <ScrollToTopFab />}
      <PwaInstallPrompt />

      <nav className="md:hidden fixed bottom-0 w-full h-16 border-t border-primary/30 bg-background/50 backdrop-blur-2xl z-50 flex items-center justify-around overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] overflow-hidden">
          <div className="h-full w-1/3 animate-[neon-line-sweep_3.4s_linear_infinite] bg-gradient-to-r from-transparent via-fuchsia-400 to-cyan-400" />
        </div>
        {TOP_NAV_ITEMS.slice(0, 5).map((item) => (
          <Link key={item.href} href={item.href} className={cn("p-2 rounded-xl", location === item.href ? "text-primary shadow-[0_0_12px_hsl(var(--primary)/0.5)]" : "text-muted-foreground")}>
            <item.icon className="w-6 h-6" />
          </Link>
        ))}
      </nav>
    </div>
  );
}
