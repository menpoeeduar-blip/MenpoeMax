import { Link, useParams } from "wouter";
import { Shell } from "@/components/layout/Shell";
import { useGetBusinessPage, useGetMe, useUpdateBusinessPage } from "@workspace/api-client-react";
import { getPageTypeLabel } from "@/lib/page-types";
import { ArrowLeft, Building2, Users, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { uploadFile } from "@/lib/upload";
import { useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

export default function BusinessPageDetail() {
  const params = useParams<{ id: string }>();
  const id = params.id ?? "";
  const { data: page, isLoading } = useGetBusinessPage(id);
  const { data: me } = useGetMe();
  const updatePage = useUpdateBusinessPage();
  const qc = useQueryClient();
  const { toast } = useToast();
  const avatarRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);
  const isOwner = page?.ownerId === me?.id;

  const upload = async (file: File, field: "avatarUrl" | "coverUrl") => {
    try {
      const url = await uploadFile(file, { purpose: field === "avatarUrl" ? "avatar" : "cover" });
      updatePage.mutate(
        { pageId: id, data: { [field]: url } },
        {
          onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["business-page", id] });
            toast({ title: "Imagen actualizada" });
          },
        },
      );
    } catch {
      toast({ title: "Error al subir", variant: "destructive" });
    }
  };

  return (
    <Shell>
      <div className="max-w-3xl mx-auto p-4 pb-24">
        <Link href="/business">
          <Button variant="ghost" size="sm" className="mb-4 rounded-xl">
            <ArrowLeft className="w-4 h-4 mr-1" /> Páginas
          </Button>
        </Link>

        {isLoading ? (
          <div className="h-48 glass-panel rounded-2xl animate-pulse" />
        ) : !page ? (
          <div className="text-center py-16 text-muted-foreground">
            <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Página no encontrada</p>
          </div>
        ) : (
          <div className="glass-panel neon-border rounded-3xl overflow-hidden">
            <div className="h-32 bg-gradient-to-br from-primary/30 via-accent/25 to-emerald-500/20 relative group">
              {(page as { coverUrl?: string }).coverUrl && (
                <img src={(page as { coverUrl?: string }).coverUrl} className="w-full h-full object-cover absolute inset-0" alt="" />
              )}
              {isOwner && (
                <>
                  <button type="button" className="absolute top-3 right-3 p-2 rounded-full bg-black/50" onClick={() => coverRef.current?.click()}><Camera className="w-4 h-4 text-white" /></button>
                  <input ref={coverRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f, "coverUrl"); }} />
                </>
              )}
              <div className="absolute -bottom-8 left-6 w-20 h-20 rounded-2xl border-4 border-background bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white text-3xl font-bold overflow-hidden relative group/av">
                {(page as { avatarUrl?: string }).avatarUrl ? (
                  <img src={(page as { avatarUrl?: string }).avatarUrl} className="w-full h-full object-cover" alt="" />
                ) : (
                  page.name[0]
                )}
                {isOwner && (
                  <>
                    <button type="button" className="absolute inset-0 bg-black/40 opacity-0 group-hover/av:opacity-100 flex items-center justify-center" onClick={() => avatarRef.current?.click()}><Camera className="w-5 h-5" /></button>
                    <input ref={avatarRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f, "avatarUrl"); }} />
                  </>
                )}
              </div>
            </div>
            <div className="pt-12 p-6">
              <h1 className="text-2xl font-bold neon-title">{page.name}</h1>
              <p className="text-sm text-muted-foreground mt-1">
                @{page.slug} · {page.category}
                {page.pageType ? ` · ${getPageTypeLabel(page.pageType)}` : ""}
              </p>
              <p className="text-sm mt-4 leading-relaxed">{page.description}</p>
              <div className="flex items-center gap-2 mt-6 text-sm text-muted-foreground">
                <Users className="w-4 h-4 text-primary" />
                {page.followersCount ?? 0} seguidores
              </div>
            </div>
          </div>
        )}
      </div>
    </Shell>
  );
}
