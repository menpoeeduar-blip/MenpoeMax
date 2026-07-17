import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
  },
});

export const DEV_USER_KEY = "__dev_user_id__";

function canUseDevUserShortcut(): boolean {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  return import.meta.env.DEV && (host === "localhost" || host === "127.0.0.1");
}

export function getDevUserId(): string | null {
  try {
    if (!canUseDevUserShortcut()) {
      localStorage.removeItem(DEV_USER_KEY);
      return null;
    }
    return localStorage.getItem(DEV_USER_KEY);
  } catch { return null; }
}

export function setDevUserId(id: string | null) {
  try {
    if (id && canUseDevUserShortcut()) localStorage.setItem(DEV_USER_KEY, id);
    else localStorage.removeItem(DEV_USER_KEY);
  } catch { /* noop */ }
}

export async function apiRequest(method: string, url: string, body?: unknown): Promise<Response> {
  const token = await window.__clerkAuthToken?.();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  const devId = getDevUserId();
  if (devId) {
    headers["X-Dev-User-Id"] = devId;
  }
  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  return response;
}

declare global {
  interface Window {
    __clerkAuthToken?: () => Promise<string | null>;
  }
}
