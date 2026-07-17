import { Shell } from "@/components/layout/Shell";
import { ProfileSavedTab } from "@/components/profile/ProfileSavedTab";
import { Bookmark } from "lucide-react";
import { Link } from "wouter";
import { useGetMe } from "@workspace/api-client-react";

/** Página dedicada de guardados (también disponible en el perfil). */
export default function Saved() {
  const { data: me } = useGetMe();

  return (
    <Shell>
      <div className="max-w-2xl mx-auto w-full p-4 pb-24">
        <div className="glass-panel neon-border neon-run rounded-2xl p-5 mb-4 flex items-start gap-3">
          <Bookmark className="w-8 h-8 text-primary flex-none" />
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold neon-title">Guardados</h1>
            <p className="text-sm text-muted-foreground">Publicaciones y empleos que marcaste para más tarde</p>
            {me?.id && (
              <Link href={`/profile/${me.id}?tab=saved`} className="text-xs text-primary hover:underline mt-1 inline-block">
                Ver también en mi perfil →
              </Link>
            )}
          </div>
        </div>
        <ProfileSavedTab />
      </div>
    </Shell>
  );
}
