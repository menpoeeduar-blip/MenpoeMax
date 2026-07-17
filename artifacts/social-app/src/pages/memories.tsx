import { Link } from "wouter";
import { Shell } from "@/components/layout/Shell";
import { useGetMemories } from "@workspace/api-client-react";
import { Clock, ImageIcon } from "lucide-react";
import { format } from "date-fns";

export default function Memories() {
  const { data, isLoading } = useGetMemories();

  return (
    <Shell>
      <div className="max-w-3xl mx-auto w-full p-4 pb-24">
        <div className="mb-8">
          <h1 className="text-3xl font-bold neon-title flex items-center gap-2">
            <Clock className="w-8 h-8 text-primary" />
            Recuerdos
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Publicaciones de este día en años anteriores — como “Un día como hoy” en Facebook.
          </p>
          {data?.dateLabel && (
            <p className="text-xs text-primary mt-2 neon-subtle">{data.dateLabel}</p>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="h-40 glass-panel rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : (data?.posts ?? []).length === 0 ? (
          <div className="glass-panel rounded-2xl p-12 text-center">
            <ImageIcon className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
            <p className="font-medium">Sin recuerdos por ahora</p>
            <p className="text-sm text-muted-foreground mt-1">
              Cuando publiques más, aquí verás lo que compartiste en esta fecha.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {(data?.posts ?? []).map((post: any) => (
              <div key={post.id} className="glass-panel feed-post-card rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-bold text-primary px-2 py-0.5 rounded-full bg-primary/10">
                    Hace {post.yearsAgo} {post.yearsAgo === 1 ? "año" : "años"}
                  </span>
                  <Link href={`/profile/${post.authorId}`} className="text-xs text-muted-foreground hover:text-primary">
                    {post.author?.displayName ?? "Usuario"}
                  </Link>
                  <span className="text-xs text-muted-foreground">
                    · {format(new Date(post.createdAt), "d MMM yyyy")}
                  </span>
                </div>
                <p className="text-sm leading-relaxed">{post.content}</p>
                {post.mediaUrls?.[0] && (
                  <img src={post.mediaUrls[0]} alt="" className="mt-3 rounded-xl w-full max-h-64 object-cover" />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Shell>
  );
}
