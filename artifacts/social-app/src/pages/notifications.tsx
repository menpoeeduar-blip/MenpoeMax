import { Shell } from "@/components/layout/Shell";
import { useGetNotifications, useMarkAllNotificationsRead } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Heart, MessageCircle, UserPlus, Share2, Bell, Briefcase, CheckCheck } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useLocation } from "wouter";

const TYPE_ICONS: Record<string, { icon: React.ElementType; color: string }> = {
  like: { icon: Heart, color: "text-red-400 bg-red-400/10" },
  comment: { icon: MessageCircle, color: "text-blue-400 bg-blue-400/10" },
  follow: { icon: UserPlus, color: "text-green-400 bg-green-400/10" },
  share: { icon: Share2, color: "text-purple-400 bg-purple-400/10" },
  job_match: { icon: Briefcase, color: "text-amber-400 bg-amber-400/10" },
  system: { icon: Bell, color: "text-primary bg-primary/10" },
  message: { icon: MessageCircle, color: "text-cyan-400 bg-cyan-400/10" },
  mention: { icon: Bell, color: "text-primary bg-primary/10" },
};

export default function Notifications() {
  const { data: notifications, isLoading } = useGetNotifications();
  const markAllRead = useMarkAllNotificationsRead();
  const qc = useQueryClient();
  const [, setLocation] = useLocation();
  const [showPrefs, setShowPrefs] = useState(false);
  const [prefs, setPrefs] = useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem("social_notif_prefs_v1");
      return raw
        ? JSON.parse(raw)
        : { like: true, comment: true, follow: true, message: true, system: true };
    } catch {
      return { like: true, comment: true, follow: true, message: true, system: true };
    }
  });
  const savePrefs = (next: Record<string, boolean>) => {
    setPrefs(next);
    try {
      localStorage.setItem("social_notif_prefs_v1", JSON.stringify(next));
    } catch {}
  };

  const filtered = (notifications ?? []).filter((n) => prefs[n.type] ?? true);
  const unreadCount = filtered.filter((n) => !n.isRead).length ?? 0;

  return (
    <Shell>
      <div className="max-w-2xl mx-auto w-full p-4 pb-24">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Notificaciones</h1>
            {unreadCount > 0 && <p className="text-sm text-muted-foreground">{unreadCount} sin leer</p>}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setShowPrefs((v) => !v)}>
              Preferencias
            </Button>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => markAllRead.mutate(undefined, { onSuccess: () => qc.invalidateQueries() })}
                disabled={markAllRead.isPending}
                data-testid="button-mark-all-read"
              >
                <CheckCheck className="w-4 h-4 mr-2" />Marcar todas
              </Button>
            )}
          </div>
        </div>
        {showPrefs && (
          <div className="glass-panel rounded-2xl p-4 mb-4">
            <p className="text-sm font-semibold mb-3">Tipos de notificación</p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {Object.keys(prefs).map((k) => (
                <label key={k} className="flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-white/5">
                  <input
                    type="checkbox"
                    checked={prefs[k]}
                    onChange={(e) => savePrefs({ ...prefs, [k]: e.target.checked })}
                  />
                  <span className="capitalize">{k}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-2">
          {isLoading
            ? [...Array(6)].map((_, i) => <div key={i} className="h-16 glass-panel rounded-2xl animate-pulse" />)
            : filtered.length === 0
              ? (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-4">
                  <Bell className="w-16 h-16 text-muted-foreground/30" />
                  <div className="text-center">
                    <p className="font-medium">¡Todo al día!</p>
                    <p className="text-sm">No hay notificaciones todavía</p>
                  </div>
                </div>
              )
              : filtered.map((notif) => {
                const typeInfo = TYPE_ICONS[notif.type] ?? TYPE_ICONS.system;
                const Icon = typeInfo.icon;
                return (
                  <div key={notif.id} className={`glass-panel rounded-2xl p-4 flex items-start gap-3 transition-opacity ${notif.isRead ? "opacity-60" : ""}`} data-testid={`notif-${notif.id}`}>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-none ${typeInfo.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    {notif.actor && (
                      <img
                        src={notif.actor.avatarUrl ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${notif.actor.id}`}
                        className="w-10 h-10 rounded-full object-cover bg-muted flex-none -ml-3 cursor-pointer"
                        alt=""
                        onClick={() => setLocation(`/profile/${notif.actor.id}`)}
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{notif.title}</p>
                      {notif.body && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{notif.body}</p>}
                      <p className="text-xs text-muted-foreground mt-1">hace {formatDistanceToNow(new Date(notif.createdAt))}</p>
                    </div>
                    {!notif.isRead && <div className="w-2 h-2 rounded-full bg-primary flex-none mt-2" />}
                  </div>
                );
              })
          }
        </div>
      </div>
    </Shell>
  );
}
