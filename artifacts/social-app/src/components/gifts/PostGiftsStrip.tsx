import { useGetPostGifts } from "@workspace/api-client-react";

export function PostGiftsStrip({ postId, giftsCount }: { postId: string; giftsCount?: number }) {
  const { data: gifts } = useGetPostGifts(postId);
  const count = giftsCount ?? gifts?.length ?? 0;
  if (count === 0 && (!gifts || gifts.length === 0)) return null;

  const recent = (gifts ?? []).slice(0, 8);
  const totalTokens = (gifts ?? []).reduce((s: number, g: { tokens?: number }) => s + (g.tokens ?? 0), 0);

  return (
    <div className="flex items-center gap-2 mb-3 px-2 py-1.5 rounded-xl bg-primary/10 border border-primary/20">
      <div className="flex -space-x-1">
        {recent.map((g: { id: string; giftEmoji: string }) => (
          <span key={g.id} className="text-lg drop-shadow-[0_0_6px_hsl(var(--primary)/0.6)]" title="Regalo">
            {g.giftEmoji}
          </span>
        ))}
      </div>
      <span className="text-xs text-muted-foreground">
        {count} regalo{count !== 1 ? "s" : ""}
        {totalTokens > 0 && ` · ${totalTokens.toLocaleString("es-ES")} tokens`}
      </span>
    </div>
  );
}
