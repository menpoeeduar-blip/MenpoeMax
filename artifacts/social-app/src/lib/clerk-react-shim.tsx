import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  onAuthStateChanged,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";
import { useLocation } from "wouter";
import { auth } from "./firebase";
import { getDevUserId, queryClient, setDevUserId } from "./queryClient";
import { SignInForm, SignUpForm } from "@/components/auth/AuthForms";

type Listener = (payload: { user: User | null }) => void;

type AuthContextValue = {
  user: User | null;
  isLoaded: boolean;
  isSignedIn: boolean;
  signOut: () => Promise<void>;
  openUserProfile: () => void;
  addListener: (cb: Listener) => () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("Auth context missing");
  return ctx;
}

export function ClerkProvider({
  children,
}: {
  children: ReactNode;
  publishableKey?: string;
  proxyUrl?: string;
  appearance?: unknown;
  signInUrl?: string;
  signUpUrl?: string;
  routerPush?: (to: string) => void;
  routerReplace?: (to: string) => void;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [, setLocation] = useLocation();
  const listenersRef = useState(new Set<Listener>())[0];

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);
      setIsLoaded(true);
      listenersRef.forEach((cb) => cb({ user: nextUser }));
      window.__clerkAuthToken = async () => (await nextUser?.getIdToken()) ?? null;
    });
    return unsubscribe;
  }, [listenersRef]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoaded,
      isSignedIn: !!user,
      signOut: async () => {
        setDevUserId(null);
        try {
          await firebaseSignOut(auth);
        } catch {
          /* sin sesión Firebase activa */
        }
        queryClient.clear();
        setLocation("/sign-in");
      },
      openUserProfile: () => {
        const id = user?.uid || getDevUserId();
        setLocation(id ? `/profile/${id}` : "/profile");
      },
      addListener: (cb) => {
        listenersRef.add(cb);
        return () => listenersRef.delete(cb);
      },
    }),
    [isLoaded, listenersRef, setLocation, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const { isLoaded, isSignedIn } = useAuthContext();
  return { isLoaded, isSignedIn };
}

export function useClerk() {
  const { signOut, openUserProfile, addListener } = useAuthContext();
  return { signOut, openUserProfile, addListener };
}

export function useUser() {
  const { user } = useAuthContext();
  if (!user) return { user: null };
  return {
    user: {
      id: user.uid,
      imageUrl: user.photoURL ?? undefined,
      fullName: user.displayName ?? user.email ?? "Usuario",
      username: user.email?.split("@")[0] ?? "usuario",
    },
  };
}

export function RedirectToSignIn() {
  const [, setLocation] = useLocation();
  useEffect(() => {
    setLocation("/sign-in");
  }, [setLocation]);
  return null;
}

export function SignIn({ signUpUrl }: { routing?: string; path?: string; signUpUrl?: string }) {
  return <SignInForm signUpUrl={signUpUrl?.replace(/^\//, "/") || "/sign-up"} />;
}

export function SignUp({ signInUrl }: { routing?: string; path?: string; signInUrl?: string }) {
  return <SignUpForm signInUrl={signInUrl?.replace(/^\//, "/") || "/sign-in"} />;
}

export function UserButton() {
  const { user } = useUser();
  if (!user) return null;
  return (
    <img
      src={user.imageUrl ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`}
      className="w-8 h-8 rounded-full object-cover"
      alt=""
    />
  );
}

declare global {
  interface Window {
    __clerkAuthToken?: () => Promise<string | null>;
  }
}
