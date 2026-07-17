import { Shell } from "@/components/layout/Shell";
import { ProfileStatsTab } from "@/components/profile/ProfileStatsTab";
import { BarChart3 } from "lucide-react";
import { Link } from "wouter";
import { useGetMe } from "@workspace/api-client-react";

/** Dashboard de estadísticas (también en perfil → Estadísticas). */
export default function Analytics() {
  const { data: me } = useGetMe();

  return (
    <Shell>
      <div className="max-w-2xl mx-auto w-full p-4 pb-24">
        <div className="glass-panel neon-border neon-run rounded-2xl p-5 mb-4 flex items-start gap-3">
          <BarChart3 className="w-8 h-8 text-primary flex-none" />
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold neon-title">Estadísticas</h1>
            <p className="text-sm text-muted-foreground">Alcance real de tus publicaciones y audiencia</p>
            {me?.id && (
              <Link href={`/profile/${me.id}?tab=stats`} className="text-xs text-primary hover:underline mt-1 inline-block">
                Abrir en mi perfil →
              </Link>
            )}
          </div>
        </div>
        <ProfileStatsTab />
      </div>
    </Shell>
  );
}
