import { useGetAnalytics } from "@workspace/api-client-react";
import { BarChart3, Eye, Heart, Share2, TrendingUp, Users } from "lucide-react";

export function ProfileStatsTab() {
  const { data: stats, isLoading } = useGetAnalytics();

  if (isLoading) {
    return <div className="h-40 glass-panel rounded-2xl animate-pulse" />;
  }

  const cards = [
    { label: "Publicaciones", value: stats?.postsCount ?? 0, icon: BarChart3, color: "text-primary" },
    { label: "Seguidores", value: stats?.followersCount ?? 0, icon: Users, color: "text-accent" },
    { label: "Siguiendo", value: stats?.followingCount ?? 0, icon: Users, color: "text-cyan-400" },
    { label: "Likes recibidos", value: stats?.likesReceived ?? 0, icon: Heart, color: "text-pink-400" },
    { label: "Vistas", value: stats?.viewsReceived ?? 0, icon: Eye, color: "text-emerald-400" },
    { label: "Compartidos", value: stats?.sharesReceived ?? 0, icon: Share2, color: "text-violet-400" },
  ];

  return (
    <div className="space-y-4">
      <div className="glass-panel neon-border neon-run rounded-2xl p-4 flex items-center gap-3">
        <TrendingUp className="w-8 h-8 text-primary" />
        <div>
          <p className="text-sm text-muted-foreground">Índice de actividad (estimado)</p>
          <p className="text-2xl font-bold neon-title">+{stats?.weeklyGrowth ?? 0}%</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {cards.map((c) => (
          <div key={c.label} className="glass-panel neon-border neon-run-soft rounded-2xl p-4">
            <c.icon className={`w-5 h-5 mb-2 ${c.color}`} />
            <p className="text-2xl font-bold neon-text">{c.value}</p>
            <p className="text-xs text-muted-foreground">{c.label}</p>
          </div>
        ))}
      </div>

      {stats?.topPost && (
        <div className="glass-panel neon-border rounded-2xl p-5">
          <p className="text-sm font-semibold neon-text mb-2">Publicación con más interacción</p>
          <p className="text-sm line-clamp-3">{stats.topPost.content}</p>
          <p className="text-xs text-muted-foreground mt-2">
            {stats.topPost.likesCount ?? 0} likes · {stats.topPost.viewsCount ?? 0} vistas
          </p>
        </div>
      )}
    </div>
  );
}
