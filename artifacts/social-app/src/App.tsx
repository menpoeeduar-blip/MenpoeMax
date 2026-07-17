import { useEffect, useRef, useState } from "react";
import { ClerkProvider, SignIn, SignUp, useClerk, useAuth, RedirectToSignIn, useUser } from '@clerk/react';
import { dark } from '@clerk/themes';
import { Switch, Route, useLocation, Router as WouterRouter } from 'wouter';
import { QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { queryClient, setDevUserId, getDevUserId, DEV_USER_KEY } from "./lib/queryClient";
import { useGetMe } from "@workspace/api-client-react";
import { db } from "./lib/firebase";
import { doc, setDoc } from "firebase/firestore";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AIChatWidget } from "@/components/AIChatWidget";
import { SettingsBootstrap } from "@/components/SettingsBootstrap";
import { AstralBackground } from "@/components/AstralBackground";

import Feed from "./pages/feed";
import Explore from "./pages/explore";
import Reels from "./pages/reels";
import Messages from "./pages/messages";
import Notifications from "./pages/notifications";
import Jobs from "./pages/jobs";
import Marketplace from "./pages/marketplace";
import Communities from "./pages/communities";
import Events from "./pages/events";
import Streams from "./pages/streams";
import Friends from "./pages/friends";
import Profile from "./pages/profile";
import NotFound from "./pages/not-found";
import Photos from "./pages/photos";
import Saved from "./pages/saved";
import Privacy from "./pages/privacy";
import Help from "./pages/help";
import BusinessPages from "./pages/business-pages";
import BusinessPageDetail from "./pages/business-page-detail";
import Analytics from "./pages/analytics";
import Promote from "./pages/promote";
import CommunityAdmin from "./pages/community-admin";
import Birthdays from "./pages/birthdays";
import Memories from "./pages/memories";
import SettingsPage from "./pages/settings";
import Legal from "./pages/legal";
import WalletPage from "./pages/wallet";
import AdminGiftsPage from "./pages/admin-gifts";
import AdminReportsPage from "./pages/admin-reports";
import ResumePage from "./pages/resume";

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string;
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL as string;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

const clerkAppearance = {
  baseTheme: dark,
  variables: {
    colorPrimary: "hsl(195, 100%, 62%)",
    colorBackground: "hsl(260, 65%, 4%)",
    colorInputBackground: "hsl(258, 55%, 10%)",
    colorInputText: "white",
    colorNeutral: "hsl(240, 22%, 78%)",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "w-[440px] max-w-full overflow-hidden rounded-2xl border border-border shadow-2xl",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
  },
};

const DEV_USERS = [
  { id: "2l0s8v0kapbei4esxc", label: "Admin", username: "sofia_tech (Admin)", role: "admin", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=sofia" },
  { id: "9c8cnoxhr31nvvjiom", label: "Usuario", username: "carlos_dev (Usuario)", role: "user", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=carlos" },
];

function SignInPage() {
  const [, setLocation] = useLocation();
  const [devLoading, setDevLoading] = useState<string | null>(null);
  const showDevQuickAccess =
    import.meta.env.DEV &&
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");

  const handleDevLogin = (userId: string) => {
    setDevLoading(userId);
    setDevUserId(userId);
    queryClient.clear();
    setTimeout(() => setLocation("/"), 100);
  };

  return (
    <div className="relative">
      <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
      {showDevQuickAccess && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-20 w-full max-w-[440px] px-4">
          <div className="glass-panel neon-border rounded-2xl p-4 opacity-90 hover:opacity-100 transition-opacity">
            <div className="text-[10px] text-muted-foreground text-center mb-2 font-medium uppercase tracking-wider">
              Acceso rápido (desarrollo)
            </div>
            <div className="grid grid-cols-2 gap-2">
              {DEV_USERS.map((u) => (
                <button
                  key={u.id}
                  onClick={() => handleDevLogin(u.id)}
                  disabled={devLoading === u.id}
                  className="flex items-center gap-2 p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-border/50 text-left disabled:opacity-50"
                >
                  <img src={u.avatar} className="w-8 h-8 rounded-full" alt="" />
                  <div className="min-w-0">
                    <div className="text-xs font-semibold truncate">{u.label}</div>
                    <div className="text-[10px] text-muted-foreground truncate">{u.username}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SignUpPage() {
  return <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />;
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const qc = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (
        prevUserIdRef.current !== undefined &&
        prevUserIdRef.current !== userId
      ) {
        qc.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, qc]);

  return null;
}

function PresenceHeartbeat() {
  const { user } = useUser();

  useEffect(() => {
    if (!user?.id) return;
    let stopped = false;
    const writePresence = async (online: boolean) => {
      try {
        await setDoc(doc(db, "users", user.id), { online, lastSeenAt: new Date().toISOString(), updatedAt: new Date().toISOString() }, { merge: true });
      } catch {
        // Non-blocking if Firestore is temporarily unavailable.
      }
    };

    writePresence(true);
    const timer = setInterval(() => writePresence(true), 60_000);
    const onHidden = () => {
      if (document.visibilityState === "hidden") writePresence(false);
      else writePresence(true);
    };
    document.addEventListener("visibilitychange", onHidden);
    const onBeforeUnload = () => { if (!stopped) writePresence(false); };
    window.addEventListener("beforeunload", onBeforeUnload);

    return () => {
      stopped = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onHidden);
      window.removeEventListener("beforeunload", onBeforeUnload);
      writePresence(false);
    };
  }, [user?.id]);

  return null;
}

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { isSignedIn, isLoaded } = useAuth();
  const devUserId = getDevUserId();

  if (!isLoaded && !devUserId) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isSignedIn && !devUserId) {
    return <RedirectToSignIn />;
  }

  return <Component />;
}

function ProfileRedirect() {
  const { data: me } = useGetMe();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (me?.id) setLocation(`/profile/${me.id}`, { replace: true });
  }, [me?.id, setLocation]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function AppRoutes() {
  return (
    <Switch>
      <Route path="/sign-in/*?" component={SignInPage} />
      <Route path="/sign-up/*?" component={SignUpPage} />
      <Route path="/" component={() => <ProtectedRoute component={Feed} />} />
      <Route path="/explore" component={() => <ProtectedRoute component={Explore} />} />
      <Route path="/reels" component={() => <ProtectedRoute component={Reels} />} />
      <Route path="/messages" component={() => <ProtectedRoute component={Messages} />} />
      <Route path="/notifications" component={() => <ProtectedRoute component={Notifications} />} />
      <Route path="/resume" component={() => <ProtectedRoute component={ResumePage} />} />
      <Route path="/jobs" component={() => <ProtectedRoute component={Jobs} />} />
      <Route path="/jobs/:id" component={() => <ProtectedRoute component={Jobs} />} />
      <Route path="/marketplace" component={() => <ProtectedRoute component={Marketplace} />} />
      <Route path="/marketplace/:id" component={() => <ProtectedRoute component={Marketplace} />} />
      <Route path="/communities" component={() => <ProtectedRoute component={Communities} />} />
      <Route path="/communities/:id" component={() => <ProtectedRoute component={Communities} />} />
      <Route path="/events" component={() => <ProtectedRoute component={Events} />} />
      <Route path="/events/:id" component={() => <ProtectedRoute component={Events} />} />
      <Route path="/streams" component={() => <ProtectedRoute component={Streams} />} />
      <Route path="/streams/:id" component={() => <ProtectedRoute component={Streams} />} />
      <Route path="/friends" component={() => <ProtectedRoute component={Friends} />} />
      <Route path="/photos" component={() => <ProtectedRoute component={Photos} />} />
      <Route path="/saved" component={() => <ProtectedRoute component={Saved} />} />
      <Route path="/settings" component={() => <ProtectedRoute component={SettingsPage} />} />
      <Route path="/privacy" component={() => <ProtectedRoute component={Privacy} />} />
      <Route path="/legal" component={() => <ProtectedRoute component={Legal} />} />
      <Route path="/help" component={() => <ProtectedRoute component={Help} />} />
      <Route path="/business" component={() => <ProtectedRoute component={BusinessPages} />} />
      <Route path="/business/:id" component={() => <ProtectedRoute component={BusinessPageDetail} />} />
      <Route path="/analytics" component={() => <ProtectedRoute component={Analytics} />} />
      <Route path="/promote" component={() => <ProtectedRoute component={Promote} />} />
      <Route path="/wallet" component={() => <ProtectedRoute component={WalletPage} />} />
      <Route path="/admin/gifts" component={() => <ProtectedRoute component={AdminGiftsPage} />} />
      <Route path="/admin/reports" component={() => <ProtectedRoute component={AdminReportsPage} />} />
      <Route path="/community-admin" component={() => <ProtectedRoute component={CommunityAdmin} />} />
      <Route path="/birthdays" component={() => <ProtectedRoute component={Birthdays} />} />
      <Route path="/memories" component={() => <ProtectedRoute component={Memories} />} />
      <Route path="/profile" component={() => <ProtectedRoute component={ProfileRedirect} />} />
      <Route path="/profile/" component={() => <ProtectedRoute component={ProfileRedirect} />} />
      <Route path="/profile/:userId" component={() => <ProtectedRoute component={Profile} />} />
      <Route path="/u/:userId" component={() => <ProtectedRoute component={Profile} />} />
      <Route component={NotFound} />
    </Switch>
  );
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <ClerkQueryClientCacheInvalidator />
          <PresenceHeartbeat />
          <SettingsBootstrap />
          <AppRoutes />
          <AIChatWidget />
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  return (
    <WouterRouter base={basePath}>
      <ClerkProviderWithRoutes />
    </WouterRouter>
  );
}

export default App;
