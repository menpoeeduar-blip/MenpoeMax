import { Link } from "wouter";
import { useGetAllSaved } from "@workspace/api-client-react";
import { Bookmark, Briefcase, FileText, ExternalLink } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function ProfileSavedTab() {
  const { data, isLoading } = useGetAllSaved();

  if (isLoading) {
    return <div className="h-32 glass-panel rounded-2xl animate-pulse" />;
  }

  return (
    <Tabs defaultValue="posts" className="w-full">
      <TabsList className="glass-panel neon-border w-full grid grid-cols-2 rounded-xl mb-4">
        <TabsTrigger value="posts" className="rounded-lg text-xs sm:text-sm">Publicaciones</TabsTrigger>
        <TabsTrigger value="jobs" className="rounded-lg text-xs sm:text-sm">Empleos</TabsTrigger>
      </TabsList>
      <TabsContent value="posts" className="space-y-3 mt-0">
        {(data?.posts ?? []).length === 0 ? (
          <div className="glass-panel neon-border rounded-2xl p-8 text-center text-muted-foreground">
            <FileText className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p>No hay publicaciones guardadas</p>
          </div>
        ) : (
          (data?.posts ?? []).map((p: { id: string; content?: string; author?: { displayName?: string; id?: string } }) => (
            <Link key={p.id} href={`/?post=${p.id}`}>
              <div className="glass-panel neon-border rounded-2xl p-4 flex gap-3 hover:bg-white/5 transition-colors cursor-pointer">
                <Bookmark className="w-5 h-5 text-primary flex-none" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium neon-text">{p.author?.displayName || "Usuario"}</p>
                  <p className="text-sm line-clamp-2">{p.content}</p>
                </div>
                <ExternalLink className="w-4 h-4 text-muted-foreground flex-none" />
              </div>
            </Link>
          ))
        )}
      </TabsContent>
      <TabsContent value="jobs" className="space-y-3 mt-0">
        {(data?.jobs ?? []).length === 0 ? (
          <div className="glass-panel neon-border rounded-2xl p-8 text-center text-muted-foreground">
            <Briefcase className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p>No hay empleos guardados</p>
          </div>
        ) : (
          (data?.jobs ?? []).map((j: { id: string; title?: string; company?: string; location?: string }) => (
            <Link key={j.id} href={`/jobs?job=${j.id}`}>
              <div className="glass-panel neon-border rounded-2xl p-4 hover:bg-white/5 transition-colors cursor-pointer flex justify-between items-start gap-2">
                <div>
                  <p className="font-semibold neon-text">{j.title}</p>
                  <p className="text-sm text-muted-foreground">{j.company} · {j.location}</p>
                </div>
                <ExternalLink className="w-4 h-4 text-muted-foreground flex-none mt-1" />
              </div>
            </Link>
          ))
        )}
      </TabsContent>
    </Tabs>
  );
}
