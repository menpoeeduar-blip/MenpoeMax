import { useState } from "react";
import { useGetAlbums, useCreateAlbum, useAddAlbumPhoto, useGetAlbumPhotos } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Image, Plus, Star } from "lucide-react";
import { uploadFile, LOCAL_STORAGE_BUDGET_HINT } from "@/lib/upload";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

export function ProfilePhotosTab() {
  const { data: albums } = useGetAlbums();
  const createAlbum = useCreateAlbum();
  const addPhoto = useAddAlbumPhoto();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [uploading, setUploading] = useState(false);
  const { data: photos } = useGetAlbumPhotos(selectedId || "");

  const handleCreate = () => {
    if (!name.trim()) return;
    createAlbum.mutate(
      { name },
      {
        onSuccess: (album) => {
          setName("");
          setSelectedId(album.id);
          toast({ title: "Álbum creado" });
        },
        onError: () => toast({ title: "Error", description: "No se pudo crear el álbum", variant: "destructive" }),
      },
    );
  };

  const addPhotoOnce = (albumId: string, mediaUrl: string) =>
    new Promise<void>((resolve, reject) => {
      addPhoto.mutate(
        { albumId, mediaUrl, isFeatured: false },
        {
          onSuccess: () => resolve(),
          onError: () => reject(new Error("No se pudo guardar foto")),
        },
      );
    });

  const handleUploadMany = async (albumId: string, files: File[]) => {
    setUploading(true);
    try {
      for (const file of files) {
        const url = await uploadFile(file, { purpose: "post" });
        await addPhotoOnce(albumId, url);
      }
      qc.invalidateQueries({ queryKey: ["album-photos", albumId] });
      qc.invalidateQueries({ queryKey: ["albums"] });
      toast({ title: "Fotos subidas", description: `${files.length} foto(s) agregadas al álbum.` });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error de subida";
      toast({ title: "No se pudo subir", description: `${msg}. ${LOCAL_STORAGE_BUDGET_HINT}`, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="glass-panel neon-border rounded-2xl p-4 flex flex-col sm:flex-row gap-2">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre del álbum..." className="neon-input rounded-xl flex-1" />
        <Button onClick={handleCreate} disabled={createAlbum.isPending} className="neon-btn rounded-xl shrink-0">
          <Plus className="w-4 h-4 mr-1" /> Crear álbum
        </Button>
      </div>

      {(albums ?? []).length === 0 ? (
        <div className="text-center py-12 text-muted-foreground glass-panel rounded-2xl">
          <Image className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Aún no tienes álbumes</p>
          <p className="text-sm mt-1">Crea un álbum y sube tus fotos</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {(albums ?? []).map((album: { id: string; name: string; coverUrl?: string; photosCount?: number }) => (
            <button
              key={album.id}
              type="button"
              onClick={() => setSelectedId(album.id)}
              className={`glass-panel neon-border rounded-2xl overflow-hidden text-left transition-all ${selectedId === album.id ? "ring-2 ring-primary" : ""}`}
            >
              <div className="aspect-square bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center">
                {album.coverUrl ? <img src={album.coverUrl} className="w-full h-full object-cover" alt="" /> : <Image className="w-10 h-10 text-primary/60" />}
              </div>
              <div className="p-3">
                <div className="font-semibold text-sm neon-text">{album.name}</div>
                <div className="text-xs text-muted-foreground">{album.photosCount ?? 0} fotos</div>
              </div>
            </button>
          ))}
        </div>
      )}

      {selectedId && (
        <div className="glass-panel neon-border rounded-2xl p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold neon-text">Fotos del álbum</h3>
            <label className={`neon-btn cursor-pointer inline-flex items-center gap-1 px-3 py-2 rounded-xl text-sm bg-primary text-primary-foreground ${uploading ? "opacity-60 pointer-events-none" : ""}`}>
              <Plus className="w-4 h-4" /> {uploading ? "Subiendo..." : "Subir fotos"}
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                disabled={uploading}
                onChange={(e) => {
                  const files = Array.from(e.target.files ?? []);
                  if (files.length > 0) void handleUploadMany(selectedId, files);
                  e.target.value = "";
                }}
              />
            </label>
          </div>
          {(photos ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Este álbum está vacío. Sube tu primera foto.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {(photos ?? []).map((p: { id: string; mediaUrl: string; isFeatured?: boolean }) => (
                <a key={p.id} href={p.mediaUrl} target="_blank" rel="noreferrer" className="relative rounded-xl overflow-hidden aspect-square block">
                  <img src={p.mediaUrl} className="w-full h-full object-cover" alt="" />
                  {p.isFeatured && <Star className="absolute top-2 right-2 w-5 h-5 text-amber-400 fill-amber-400" />}
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
