import { useEffect, useMemo, useState } from "react";
import { Loader2, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

/** Lista curada (CDN Giphy) + búsqueda Tenor demo cuando hay red. */
const CURATED: { url: string; tags: string }[] = [
  { url: "https://media.giphy.com/media/3o7abKhOpu0NwenH3O/giphy.gif", tags: "hola hi wave" },
  { url: "https://media.giphy.com/media/l0MYC0LajbaPoEADu/giphy.gif", tags: "ok yes thumbs" },
  { url: "https://media.giphy.com/media/26BRuo6sLetdllPAQ/giphy.gif", tags: "risa laugh haha" },
  { url: "https://media.giphy.com/media/13CoXDiaCcCoyk/giphy.gif", tags: "clap aplauso" },
  { url: "https://media.giphy.com/media/5GoVLqeAIo5dM/giphy.gif", tags: "love corazon" },
  { url: "https://media.giphy.com/media/l3q2K5jinAlChoCLY/giphy.gif", tags: "wow surprise" },
  { url: "https://media.giphy.com/media/3o6Zt4HU9HIgEQxDfO/giphy.gif", tags: "dance baile" },
  { url: "https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif", tags: "party fiesta" },
  { url: "https://media.giphy.com/media/3o7TKSjRrfIPRei1Hq/giphy.gif", tags: "sad triste" },
  { url: "https://media.giphy.com/media/l0HlBO7yoXgtc5ull/giphy.gif", tags: "coffee cafe" },
  { url: "https://media.giphy.com/media/3o7btPCcdNniyf0ArS/giphy.gif", tags: "fire fuego" },
  { url: "https://media.giphy.com/media/26BRv0ThflsHCqDrq/giphy.gif", tags: "cool" },
];

type TenorResult = { media_formats?: { gif?: { url?: string }; tinygif?: { url?: string } }; url?: string };

type Props = {
  open: boolean;
  onClose: () => void;
  onSelect: (url: string) => void;
};

export function GifPicker({ open, onClose, onSelect }: Props) {
  const [q, setQ] = useState("");
  const [remote, setRemote] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const curatedHits = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return CURATED;
    return CURATED.filter((g) => g.tags.includes(term) || term.split(/\s+/).some((t) => g.tags.includes(t)));
  }, [q]);

  useEffect(() => {
    if (!open) return;
    const term = q.trim();
    if (term.length < 2) {
      setRemote([]);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        // Clave demo pública de Tenor (bajo volumen); si falla, usamos curados.
        const res = await fetch(
          `https://g.tenor.com/v1/search?q=${encodeURIComponent(term)}&key=LIVDSRZULELA&limit=24&media_filter=minimal`,
          { signal: ctrl.signal },
        );
        if (!res.ok) throw new Error("tenor");
        const data = (await res.json()) as { results?: TenorResult[] };
        const urls = (data.results || [])
          .map((r) => r.media_formats?.tinygif?.url || r.media_formats?.gif?.url || "")
          .filter(Boolean);
        setRemote(urls);
      } catch {
        setRemote([]);
      } finally {
        setLoading(false);
      }
    }, 350);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q, open]);

  if (!open) return null;

  const urls = remote.length > 0 ? remote : curatedHits.map((c) => c.url);

  return (
    <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="glass-panel neon-border rounded-2xl w-full max-w-md max-h-[80dvh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-border/30">
          <h3 className="font-semibold text-sm">GIF (externos — sin Storage)</h3>
          <button type="button" onClick={onClose} className="p-1 rounded-lg hover:bg-white/10">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-3 flex gap-2 border-b border-border/20">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar GIF (hola, risa, love…)"
              className="rounded-xl bg-white/5 text-sm h-9 pl-9"
            />
          </div>
          {loading && <Loader2 className="w-5 h-5 animate-spin text-primary self-center" />}
        </div>
        <div className="p-3 grid grid-cols-3 gap-2 overflow-y-auto">
          {urls.map((url) => (
            <button
              key={url}
              type="button"
              onClick={() => {
                onSelect(url);
                onClose();
              }}
              className="aspect-square rounded-xl overflow-hidden border border-border/30 hover:ring-2 hover:ring-primary/50 transition-all"
            >
              <img src={url} alt="" className="w-full h-full object-cover" loading="lazy" />
            </button>
          ))}
        </div>
        <div className="p-3 border-t border-border/20">
          <Button type="button" variant="ghost" size="sm" className="w-full text-xs text-muted-foreground" onClick={onClose}>
            Solo texto y stickers también está bien
          </Button>
        </div>
      </div>
    </div>
  );
}
