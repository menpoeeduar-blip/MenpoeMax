import { Link } from "wouter";
import { Shell } from "@/components/layout/Shell";
import { useGetMemories, useCreatePost } from "@workspace/api-client-react";
import { Clock, ImageIcon, Share2, Sparkles, Calendar, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

export default function Memories() {
  const { data, isLoading } = useGetMemories();
  const createPost = useCreatePost();
  const { toast } = useToast();
  const qc = useQueryClient();

  const handleShareMemory = (post: any) => {
    createPost.mutate(
      {
        data: {
          content: `🔄 Recordando un momento especial de hace ${post.yearsAgo} ${post.yearsAgo === 1 ? "año" : "años"}:\n\n"${post.content}"`,
          mediaUrls: post.mediaUrls || [],
          postType: post.mediaUrls?.length ? "image" : "text",
          visibility: "publico",
        },
      },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: ["feed"] });
          toast({
            title: "¡Recuerdo compartido!",
            description: "Tu publicación de recuerdo ya está en tu muro.",
          });
        },
        onError: () => {
          toast({
            title: "Error al compartir",
            description: "No se pudo volver a publicar el recuerdo.",
            variant: "destructive",
          });
        },
      }
    );
  };

  const todayStr = format(new Date(), "EEEE, d 'de' MMMM", { locale: es });

  return (
    <Shell>
      <div className="max-w-3xl mx-auto w-full p-4 pb-24">
        {/* Header Hero */}
        <div className="glass-panel glass-panel-glow rounded-3xl p-6 mb-8 border border-primary/30 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-primary/20 via-accent/10 to-transparent rounded-full blur-3xl pointer-events-none" />
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-2xl bg-primary/20 border border-primary/40 flex items-center justify-center text-primary shadow-[0_0_20px_hsl(var(--primary)/0.3)]">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold neon-title">Un Día Como Hoy</h1>
              <p className="text-xs text-primary capitalize font-medium">{todayStr}</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
            Revive tus momentos más especiales. Aquí encontrarás publicaciones que compartiste este mismo día en años anteriores.
          </p>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="h-48 glass-panel rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : (data?.posts ?? []).length === 0 ? (
          <div className="glass-panel neon-border rounded-3xl p-12 text-center relative overflow-hidden">
            <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-4 text-primary">
              <Sparkles className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-white mb-1">Sin recuerdos para hoy</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
              Aún no tienes publicaciones registradas en esta fecha de años pasados. ¡Sigue publicando para acumular recuerdos inolvidables!
            </p>
            <Link href="/">
              <Button className="rounded-xl neon-btn bg-primary text-black font-bold">
                Ir al Inicio a publicar <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {(data?.posts ?? []).map((post: any) => (
              <div key={post.id} className="glass-panel neon-border rounded-3xl p-6 transition-all hover:border-primary/50 group relative">
                {/* Years Ago Badge */}
                <div className="flex items-center justify-between gap-2 mb-4 pb-3 border-b border-border/50">
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-primary/30 to-accent/30 text-primary border border-primary/40 shadow-[0_0_12px_hsl(var(--primary)/0.3)]">
                      ✨ Hace {post.yearsAgo} {post.yearsAgo === 1 ? "año" : "años"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      · {format(new Date(post.createdAt), "d 'de' MMMM 'de' yyyy", { locale: es })}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleShareMemory(post)}
                    disabled={createPost.isPending}
                    className="rounded-xl text-xs font-semibold hover:bg-primary/20 text-primary border border-primary/30"
                  >
                    <Share2 className="w-3.5 h-3.5 mr-1.5" />
                    Compartir de nuevo
                  </Button>
                </div>

                {/* Content */}
                <p className="text-sm sm:text-base leading-relaxed text-foreground mb-4">
                  {post.content}
                </p>

                {/* Media */}
                {post.mediaUrls?.[0] && (
                  <div className="rounded-2xl overflow-hidden border border-border/40 max-h-80 bg-black/40">
                    <img
                      src={post.mediaUrls[0]}
                      alt=""
                      className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Shell>
  );
}
