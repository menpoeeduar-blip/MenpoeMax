import { useState } from "react";
import { Sparkles, Trash2, Check, Plus, Sticker } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useGetMyAvatars,
  useSaveAvatarStudio,
  useSetPrimaryAvatar,
  useDeleteAvatar,
  useUpdateMe,
} from "@workspace/api-client-react";
import { AvatarStudio } from "@/components/avatar/AvatarStudio";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import type { AvatarStudioConfig } from "@/lib/avatar-studio/types";
import { resolveStickerImageUrl } from "@/lib/avatar-studio/render";

export function ProfileAvatarsTab() {
  const { data: avatars, isLoading } = useGetMyAvatars();
  const saveAvatar = useSaveAvatarStudio();
  const setPrimary = useSetPrimaryAvatar();
  const deleteAvatar = useDeleteAvatar();
  const updateMe = useUpdateMe();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [showStudio, setShowStudio] = useState(false);

  const handleSave = async (config: AvatarStudioConfig, name: string) => {
    try {
      const saved = await saveAvatar.mutateAsync({ config, name });
      setShowStudio(false);
      qc.invalidateQueries({ queryKey: ["my-avatars"] });
      qc.invalidateQueries({ queryKey: ["my-stickers"] });
      qc.invalidateQueries({ queryKey: ["me"] });
      if (saved?.previewUrl) {
        updateMe.mutate({ data: { avatarUrl: saved.previewUrl } });
      }
      toast({
        title: "¡Avatar creado!",
        description: `${saved?.stickers?.length ?? 8} stickers listos para usar en chats y comentarios.`,
      });
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "No se pudo guardar el avatar",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="glass-panel rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Estudio de avatares
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Diseña tu personaje estilo Facebook y obtén stickers para chats, comentarios y publicaciones.
          </p>
        </div>
        <Button className="rounded-xl neon-btn shrink-0" onClick={() => setShowStudio(true)} data-testid="button-open-avatar-studio">
          <Plus className="w-4 h-4 mr-2" /> Crear avatar
        </Button>
      </div>

      {isLoading ? (
        <div className="h-40 glass-panel rounded-2xl animate-pulse" />
      ) : (avatars?.length ?? 0) === 0 ? (
        <div className="text-center py-16 glass-panel rounded-2xl">
          <Sparkles className="w-14 h-14 mx-auto mb-4 text-primary/30" />
          <p className="font-medium mb-1">Aún no tienes avatares personalizados</p>
          <p className="text-sm text-muted-foreground mb-4">Crea el tuyo y úsalo como sticker en toda la red</p>
          <Button className="rounded-xl" onClick={() => setShowStudio(true)}>Empezar ahora</Button>
        </div>
      ) : (
        <div className="space-y-6">
          {avatars.map((avatar) => (
            <div key={avatar.id} className="glass-panel rounded-2xl p-5" data-testid={`avatar-card-${avatar.id}`}>
              <div className="flex items-start gap-4 mb-4">
                <img
                  src={avatar.previewUrl || resolveStickerImageUrl(avatar.config, undefined, avatar.previewUrl)}
                  alt={avatar.name}
                  className="w-20 h-20 rounded-2xl bg-white/5 border border-border/30 object-contain p-1"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-semibold">{avatar.name}</h4>
                    {avatar.isPrimary && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/20 text-primary font-medium">Principal</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {(avatar.stickers?.length ?? 0)} stickers · {new Date(avatar.createdAt).toLocaleDateString("es-ES")}
                  </p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {!avatar.isPrimary && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-xl h-8"
                        onClick={() =>
                          setPrimary.mutate(
                            { avatarId: avatar.id },
                            {
                              onSuccess: () => {
                                qc.invalidateQueries();
                                toast({ title: "Avatar principal actualizado" });
                              },
                            },
                          )
                        }
                      >
                        <Check className="w-3.5 h-3.5 mr-1" /> Usar como perfil
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="destructive"
                      className="rounded-xl h-8"
                      onClick={() => {
                        if (!window.confirm("¿Eliminar este avatar y sus stickers?")) return;
                        deleteAvatar.mutate(
                          { avatarId: avatar.id },
                          {
                            onSuccess: () => {
                              qc.invalidateQueries();
                              toast({ title: "Avatar eliminado" });
                            },
                          },
                        );
                      }}
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1" /> Eliminar
                    </Button>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                  <Sticker className="w-3.5 h-3.5" /> Stickers generados
                </p>
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                  {(avatar.stickers ?? []).map((s) => (
                    <div key={s.id} className="aspect-square rounded-xl bg-white/5 border border-border/30 p-1 flex flex-col items-center">
                      <img
                        src={resolveStickerImageUrl(avatar.config, s.expressionKey, s.imageUrl)}
                        alt={s.label}
                        className="w-full h-full object-contain"
                      />
                      <span className="text-[9px] text-muted-foreground mt-0.5 truncate w-full text-center">{s.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <AvatarStudio
        open={showStudio}
        onClose={() => setShowStudio(false)}
        onSave={handleSave}
        saving={saveAvatar.isPending}
      />
    </div>
  );
}