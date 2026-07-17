import { useState } from "react";
import { X, Sticker, Loader2 } from "lucide-react";
import { useGetMyStickers } from "@workspace/api-client-react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";

export type StickerSelection = {
  imageUrl: string;
  label: string;
  stickerId: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onSelect: (sticker: StickerSelection) => void;
};

export function StickerPicker({ open, onClose, onSelect }: Props) {
  const { data: stickers, isLoading } = useGetMyStickers({ query: { enabled: open } });
  const [tab, setTab] = useState<"all" | string>("all");

  if (!open) return null;

  const avatarGroups = new Map<string, { name: string; items: typeof stickers }>();
  for (const s of stickers ?? []) {
    const key = s.avatarId || "default";
    const group = avatarGroups.get(key) ?? { name: s.avatarName || "Mis stickers", items: [] };
    group.items.push(s);
    avatarGroups.set(key, group);
  }
  const groups = [...avatarGroups.entries()];
  const visible =
    tab === "all"
      ? stickers ?? []
      : (avatarGroups.get(tab)?.items ?? []);

  return (
    <div className="fixed inset-0 z-[125] flex items-end sm:items-center justify-center bg-black/55 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="glass-panel neon-border rounded-2xl w-full max-w-md max-h-[75dvh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-border/30">
          <div className="flex items-center gap-2">
            <Sticker className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-sm">Mis stickers</h3>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10">
            <X className="w-5 h-5" />
          </button>
        </div>

        {groups.length > 1 && (
          <div className="flex gap-2 px-4 py-2 overflow-x-auto border-b border-border/20">
            <button
              type="button"
              onClick={() => setTab("all")}
              className={cn("px-3 py-1 rounded-full text-xs shrink-0", tab === "all" ? "bg-primary/20 text-primary" : "bg-white/5")}
            >
              Todos
            </button>
            {groups.map(([id, g]) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={cn("px-3 py-1 rounded-full text-xs shrink-0", tab === id ? "bg-primary/20 text-primary" : "bg-white/5")}
              >
                {g.name}
              </button>
            ))}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : (visible?.length ?? 0) === 0 ? (
            <div className="text-center py-10 px-4">
              <Sticker className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground mb-3">Aún no tienes stickers de avatar</p>
              <Link href="/profile?tab=avatars" className="text-sm text-primary hover:underline" onClick={onClose}>
                Crear mi avatar en el perfil
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-3">
              {visible.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  title={s.label}
                  onClick={() => {
                    onSelect({ imageUrl: s.imageUrl, label: s.label, stickerId: s.id });
                    onClose();
                  }}
                  className="aspect-square rounded-2xl bg-white/5 border border-border/30 hover:ring-2 hover:ring-primary/40 p-1.5 transition-all active:scale-95"
                  data-testid={`sticker-${s.id}`}
                >
                  <img src={s.imageUrl} alt={s.label} className="w-full h-full object-contain" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
