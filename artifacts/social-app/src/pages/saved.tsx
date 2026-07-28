import { useState } from "react";
import { Shell } from "@/components/layout/Shell";
import { useGetAllSaved, useManageSavedCollection, useGetMe } from "@workspace/api-client-react";
import {
  Bookmark, Briefcase, FileText, ExternalLink, Plus, Folder,
  Trash2, X, FolderOpen, BookmarkCheck, LayoutGrid,
} from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const COLLECTION_COLORS = [
  { name: "primary", css: "bg-primary/20 border-primary/50 text-primary" },
  { name: "accent", css: "bg-accent/20 border-accent/50 text-accent" },
  { name: "green", css: "bg-emerald-500/20 border-emerald-500/50 text-emerald-400" },
  { name: "orange", css: "bg-orange-500/20 border-orange-500/50 text-orange-400" },
  { name: "pink", css: "bg-pink-500/20 border-pink-500/50 text-pink-400" },
];

function getColorCss(color: string) {
  return COLLECTION_COLORS.find((c) => c.name === color)?.css ?? COLLECTION_COLORS[0].css;
}

function FolderCard({
  collection,
  posts,
  onDelete,
  onClick,
}: {
  collection: { id: string; name: string; color: string; postIds: string[] };
  posts: any[];
  onDelete: () => void;
  onClick: () => void;
}) {
  const colorCss = getColorCss(collection.color);
  const postPreviews = collection.postIds
    .slice(0, 3)
    .map((id) => posts.find((p: any) => p.id === id))
    .filter(Boolean);

  return (
    <div
      onClick={onClick}
      className={`glass-panel border ${colorCss} rounded-2xl p-4 cursor-pointer hover:brightness-110 transition-all group relative`}
    >
      {/* Delete button */}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        className="absolute top-3 right-3 w-6 h-6 rounded-full bg-black/50 text-white/70 hover:text-red-400 items-center justify-center hidden group-hover:flex transition-colors"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>

      <div className="flex items-center gap-2 mb-3">
        <FolderOpen className="w-5 h-5 opacity-70" />
        <span className="font-semibold text-sm truncate">{collection.name}</span>
      </div>

      {/* Mini previews */}
      {postPreviews.length > 0 ? (
        <div className="grid grid-cols-3 gap-1 rounded-xl overflow-hidden mb-2">
          {postPreviews.map((post: any) => (
            <div key={post.id} className="aspect-square bg-white/5 overflow-hidden rounded">
              {post.mediaUrls?.[0] ? (
                <img src={post.mediaUrls[0]} className="w-full h-full object-cover" alt="" loading="lazy" />
              ) : (
                <div className="w-full h-full flex items-center justify-center p-1">
                  <p className="text-[8px] text-muted-foreground text-center leading-tight line-clamp-3">{post.content}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="h-16 flex items-center justify-center text-muted-foreground/40">
          <Bookmark className="w-6 h-6" />
        </div>
      )}

      <p className="text-xs text-muted-foreground mt-1">
        {collection.postIds.length} publicación{collection.postIds.length !== 1 ? "es" : ""}
      </p>
    </div>
  );
}

function CollectionDetail({
  collection,
  posts,
  onClose,
  onRemove,
}: {
  collection: { id: string; name: string; color: string; postIds: string[] };
  posts: any[];
  onClose: () => void;
  onRemove: (postId: string) => void;
}) {
  const colorCss = getColorCss(collection.color);
  const collectionPosts = collection.postIds
    .map((id) => posts.find((p: any) => p.id === id))
    .filter(Boolean);

  return (
    <div className="space-y-4">
      <div className={`glass-panel border ${colorCss} rounded-2xl p-4 flex items-center gap-3`}>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <X className="w-5 h-5" />
        </button>
        <FolderOpen className="w-6 h-6" />
        <h2 className="font-bold text-lg flex-1">{collection.name}</h2>
        <span className="text-sm text-muted-foreground">{collectionPosts.length} item{collectionPosts.length !== 1 ? "s" : ""}</span>
      </div>

      {collectionPosts.length === 0 ? (
        <div className="glass-panel neon-border rounded-2xl p-10 text-center text-muted-foreground">
          <BookmarkCheck className="w-10 h-10 mx-auto mb-2 opacity-40" />
          <p>Esta colección está vacía</p>
          <p className="text-xs mt-1">Guarda publicaciones aquí desde el feed</p>
        </div>
      ) : (
        <div className="space-y-3">
          {collectionPosts.map((p: any) => (
            <div key={p.id} className="glass-panel neon-border rounded-2xl p-4 flex gap-3 items-start">
              <Bookmark className="w-5 h-5 text-primary flex-none mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium neon-text">{p.author?.displayName || "Usuario"}</p>
                <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">{p.content}</p>
                {p.mediaUrls?.[0] && (
                  <img src={p.mediaUrls[0]} className="w-full max-h-48 object-cover rounded-xl mt-2" alt="" loading="lazy" />
                )}
              </div>
              <div className="flex flex-col gap-1 flex-none">
                <Link href={`/?post=${p.id}`}>
                  <button className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-muted-foreground hover:text-primary transition-colors">
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </Link>
                <button
                  onClick={() => onRemove(p.id)}
                  className="w-7 h-7 rounded-lg bg-white/5 hover:bg-red-500/20 flex items-center justify-center text-muted-foreground hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Saved() {
  const { data: me } = useGetMe();
  const { data, isLoading } = useGetAllSaved();
  const manageCollection = useManageSavedCollection();

  const [activeView, setActiveView] = useState<"all" | "collections">("all");
  const [openCollectionId, setOpenCollectionId] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newColName, setNewColName] = useState("");
  const [newColColor, setNewColColor] = useState("primary");
  // Per-post collection assignment dialog
  const [assignPostId, setAssignPostId] = useState<string | null>(null);

  const collections = (data?.collections ?? []) as any[];
  const posts = (data?.posts ?? []) as any[];
  const jobs = (data?.jobs ?? []) as any[];

  const openCollection = openCollectionId
    ? collections.find((c: any) => c.id === openCollectionId)
    : null;

  const handleCreateCollection = () => {
    if (!newColName.trim()) return;
    manageCollection.mutate({
      action: "create",
      collection: { id: "", name: newColName.trim(), color: newColColor },
    });
    setNewColName("");
    setNewColColor("primary");
    setShowCreateDialog(false);
  };

  const handleDeleteCollection = (colId: string) => {
    const col = collections.find((c: any) => c.id === colId);
    if (!col) return;
    manageCollection.mutate({ action: "delete", collection: col });
  };

  const handleRemoveFromCollection = (colId: string, postId: string) => {
    const col = collections.find((c: any) => c.id === colId);
    if (!col) return;
    manageCollection.mutate({ action: "remove_post", collection: col, postId });
  };

  const handleAddToCollection = (colId: string, postId: string) => {
    const col = collections.find((c: any) => c.id === colId);
    if (!col) return;
    manageCollection.mutate({ action: "add_post", collection: col, postId });
    setAssignPostId(null);
  };

  return (
    <Shell>
      <div className="max-w-2xl mx-auto w-full p-4 pb-24">
        <div className="glass-panel neon-border neon-run rounded-2xl p-5 mb-4 flex items-start gap-3">
          <Bookmark className="w-8 h-8 text-primary flex-none mt-0.5" />
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold neon-title">Guardados</h1>
            <p className="text-sm text-muted-foreground">Publicaciones y empleos que marcaste para después</p>
          </div>
        </div>

        {isLoading ? (
          <div className="h-48 glass-panel rounded-2xl animate-pulse" />
        ) : openCollection ? (
          <CollectionDetail
            collection={openCollection}
            posts={posts}
            onClose={() => setOpenCollectionId(null)}
            onRemove={(postId) => handleRemoveFromCollection(openCollection.id, postId)}
          />
        ) : (
          <>
            {/* View Toggle */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex gap-2 p-1 bg-white/5 rounded-xl">
                <button
                  onClick={() => setActiveView("all")}
                  className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeView === "all" ? "bg-primary text-white shadow-[0_0_12px_hsl(var(--primary)/0.4)]" : "text-muted-foreground hover:bg-white/5"}`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" /> Todo
                </button>
                <button
                  onClick={() => setActiveView("collections")}
                  className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeView === "collections" ? "bg-primary text-white shadow-[0_0_12px_hsl(var(--primary)/0.4)]" : "text-muted-foreground hover:bg-white/5"}`}
                >
                  <Folder className="w-3.5 h-3.5" /> Colecciones <span className="text-[9px] bg-white/10 px-1.5 py-0.5 rounded-full">{collections.length}</span>
                </button>
              </div>

              <Button
                size="sm"
                onClick={() => setShowCreateDialog(true)}
                className="rounded-xl h-8 gap-1.5 text-xs"
              >
                <Plus className="w-3.5 h-3.5" /> Nueva colección
              </Button>
            </div>

            {activeView === "all" ? (
              <Tabs defaultValue="posts" className="w-full">
                <TabsList className="glass-panel neon-border w-full grid grid-cols-2 rounded-xl mb-4">
                  <TabsTrigger value="posts" className="rounded-lg text-xs sm:text-sm">Publicaciones ({posts.length})</TabsTrigger>
                  <TabsTrigger value="jobs" className="rounded-lg text-xs sm:text-sm">Empleos ({jobs.length})</TabsTrigger>
                </TabsList>

                <TabsContent value="posts" className="space-y-3 mt-0">
                  {posts.length === 0 ? (
                    <div className="glass-panel neon-border rounded-2xl p-10 text-center text-muted-foreground">
                      <FileText className="w-10 h-10 mx-auto mb-2 opacity-40" />
                      <p>No hay publicaciones guardadas</p>
                      <p className="text-xs mt-1">Guarda publicaciones desde el botón 🔖 en el feed</p>
                    </div>
                  ) : (
                    posts.map((p: any) => (
                      <div key={p.id} className="glass-panel neon-border rounded-2xl p-4 flex gap-3 hover:bg-white/5 transition-colors">
                        <Bookmark className="w-5 h-5 text-primary flex-none mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium neon-text">{p.author?.displayName || "Usuario"}</p>
                          <p className="text-sm line-clamp-2 mt-0.5">{p.content}</p>
                        </div>
                        <div className="flex flex-col gap-1 flex-none">
                          <Link href={`/?post=${p.id}`}>
                            <button className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-muted-foreground hover:text-primary transition-colors">
                              <ExternalLink className="w-3.5 h-3.5" />
                            </button>
                          </Link>
                          {collections.length > 0 && (
                            <button
                              onClick={() => setAssignPostId(p.id)}
                              className="w-7 h-7 rounded-lg bg-white/5 hover:bg-primary/20 flex items-center justify-center text-muted-foreground hover:text-primary transition-colors"
                              title="Agregar a colección"
                            >
                              <FolderOpen className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </TabsContent>

                <TabsContent value="jobs" className="space-y-3 mt-0">
                  {jobs.length === 0 ? (
                    <div className="glass-panel neon-border rounded-2xl p-10 text-center text-muted-foreground">
                      <Briefcase className="w-10 h-10 mx-auto mb-2 opacity-40" />
                      <p>No hay empleos guardados</p>
                    </div>
                  ) : (
                    jobs.map((j: any) => (
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
            ) : (
              <div className="space-y-4">
                {collections.length === 0 ? (
                  <div className="glass-panel neon-border rounded-2xl p-10 text-center text-muted-foreground">
                    <Folder className="w-10 h-10 mx-auto mb-2 opacity-40" />
                    <p className="font-medium mb-1">Sin colecciones aún</p>
                    <p className="text-xs">Crea colecciones para organizar tus guardados en carpetas</p>
                    <Button
                      size="sm"
                      onClick={() => setShowCreateDialog(true)}
                      className="mt-4 rounded-xl gap-1.5"
                    >
                      <Plus className="w-4 h-4" /> Crear primera colección
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {collections.map((col: any) => (
                      <FolderCard
                        key={col.id}
                        collection={col}
                        posts={posts}
                        onDelete={() => handleDeleteCollection(col.id)}
                        onClick={() => setOpenCollectionId(col.id)}
                      />
                    ))}
                    <button
                      onClick={() => setShowCreateDialog(true)}
                      className="glass-panel border-2 border-dashed border-border/40 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary/50 hover:text-primary transition-all h-32"
                    >
                      <Plus className="w-6 h-6" />
                      <span className="text-xs font-medium">Nueva carpeta</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Create Collection Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="sm:max-w-sm bg-card border-border">
            <DialogHeader>
              <DialogTitle>Nueva colección</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <Input
                placeholder="Nombre de la colección"
                value={newColName}
                onChange={(e) => setNewColName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreateCollection()}
                className="bg-white/5 border-border/30 rounded-xl"
                autoFocus
              />
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground font-semibold">Color</p>
                <div className="flex gap-2">
                  {COLLECTION_COLORS.map((c) => (
                    <button
                      key={c.name}
                      onClick={() => setNewColColor(c.name)}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${newColColor === c.name ? "scale-110 shadow-lg border-white/60" : "border-transparent"} ${c.css}`}
                    />
                  ))}
                </div>
              </div>
              <Button
                onClick={handleCreateCollection}
                disabled={!newColName.trim() || manageCollection.isPending}
                className="w-full rounded-xl"
              >
                Crear colección
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Assign to Collection Dialog */}
        <Dialog open={!!assignPostId} onOpenChange={(open) => !open && setAssignPostId(null)}>
          <DialogContent className="sm:max-w-sm bg-card border-border">
            <DialogHeader>
              <DialogTitle>Agregar a colección</DialogTitle>
            </DialogHeader>
            <div className="space-y-2 pt-2">
              {collections.map((col: any) => {
                const isIn = col.postIds.includes(assignPostId);
                return (
                  <button
                    key={col.id}
                    onClick={() => assignPostId && handleAddToCollection(col.id, assignPostId)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-left transition-all ${isIn ? "bg-primary/15 border border-primary/40" : "glass-panel hover:bg-white/8"}`}
                  >
                    <FolderOpen className={`w-4 h-4 ${getColorCss(col.color).split(" ").find((s) => s.startsWith("text-")) || "text-primary"}`} />
                    <span className="flex-1 font-medium">{col.name}</span>
                    {isIn && <span className="text-[10px] text-primary/80 font-semibold">AGREGADO</span>}
                  </button>
                );
              })}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Shell>
  );
}
