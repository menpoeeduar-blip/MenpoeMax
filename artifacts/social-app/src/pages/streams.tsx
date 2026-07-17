import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { Shell } from "@/components/layout/Shell";
import {
  useGetLiveStreams,
  useStartStream,
  useEndStream,
  useGetMe,
  useGetStream,
  getGetStreamQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Radio, Eye, ArrowLeft, CheckCircle, VideoOff } from "lucide-react";
import { CreateLiveModal } from "@/components/live/CreateLiveModal";
import { LiveVideoRoom } from "@/components/live/LiveVideoRoom";
import { LiveChatPanel } from "@/components/live/LiveChatPanel";
import { useToast } from "@/hooks/use-toast";
import { auth, db } from "@/lib/firebase";
import { doc, increment, updateDoc } from "firebase/firestore";

function updateStreamLocal(streamId: string, patch: Record<string, unknown>) {
  try {
    const raw = localStorage.getItem("socialhub_data_v1");
    if (!raw) return;
    const d = JSON.parse(raw);
    const s = (d.streams || []).find((x: { id: string }) => x.id === streamId);
    if (s) {
      Object.assign(s, patch);
      localStorage.setItem("socialhub_data_v1", JSON.stringify(d));
    }
  } catch {
    /* ignore */
  }
}

async function updateStreamThumbnail(streamId: string, thumbnailUrl: string) {
  updateStreamLocal(streamId, { thumbnailUrl });
  if (auth.currentUser) {
    try {
      await updateDoc(doc(db, "streams", streamId), { thumbnailUrl });
    } catch (err) {
      console.warn("[live] thumbnail FS", err);
    }
  }
}

async function bumpViewer(streamId: string) {
  updateStreamLocal(streamId, {});
  try {
    const raw = localStorage.getItem("socialhub_data_v1");
    if (raw) {
      const d = JSON.parse(raw);
      const s = (d.streams || []).find((x: { id: string }) => x.id === streamId);
      if (s) {
        s.viewersCount = (s.viewersCount || 0) + 1;
        s.peakViewers = Math.max(s.peakViewers || 0, s.viewersCount);
        localStorage.setItem("socialhub_data_v1", JSON.stringify(d));
      }
    }
  } catch {
    /* ignore */
  }
  if (auth.currentUser) {
    try {
      await updateDoc(doc(db, "streams", streamId), {
        viewersCount: increment(1),
        peakViewers: increment(1),
      });
    } catch (err) {
      console.warn("[live] viewers FS", err);
    }
  }
}

function StreamViewer({ streamId, onBack }: { streamId: string; onBack: () => void }) {
  const { data: stream, isLoading } = useGetStream(streamId, {
    query: { enabled: !!streamId, queryKey: getGetStreamQueryKey(streamId) },
  });
  const { data: me, isLoading: meLoading } = useGetMe();
  const [, setLocation] = useLocation();
  const endStream = useEndStream();
  const qc = useQueryClient();
  const { toast } = useToast();
  const isHost = !!(me && stream && String(stream.hostId) === String(me.id));

  useEffect(() => {
    if (!streamId || !stream?.isLive || !me?.id) return;
    if (String(me.id) === String(stream.hostId)) return;
    void bumpViewer(streamId).then(() => {
      qc.invalidateQueries({ queryKey: getGetStreamQueryKey(streamId) });
      qc.invalidateQueries({ queryKey: ["live-streams"] });
    });
  }, [streamId, stream?.isLive, stream?.hostId, me?.id, qc]);

  if (isLoading || meLoading) {
    return (
      <div className="flex items-center justify-center p-20">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!stream) {
    return (
      <div className="text-center py-20 neon-text">
        <p className="text-lg font-medium mb-4">Transmisión no encontrada</p>
        <Button variant="outline" className="rounded-xl" onClick={onBack}>Volver</Button>
      </div>
    );
  }

  const host = stream.host as { id: string; displayName?: string; avatarUrl?: string; isVerified?: boolean };

  return (
    <div>
      <button type="button" onClick={onBack} className="flex items-center gap-2 text-muted-foreground hover:text-primary mb-4 transition-colors neon-subtle">
        <ArrowLeft className="w-4 h-4" /> Volver a transmisiones
      </button>

      {stream.isLive && me ? (
        <LiveVideoRoom
          streamId={streamId}
          userId={me.id}
          hostId={stream.hostId}
          isHost={isHost}
          onThumbnail={isHost ? (url) => void updateStreamThumbnail(streamId, url) : undefined}
        />
      ) : stream.isLive && !me ? (
        <div className="relative aspect-video rounded-2xl overflow-hidden bg-black mb-4 neon-border neon-run flex items-center justify-center">
          <p className="text-sm text-muted-foreground">Cargando sesión para ver el directo…</p>
        </div>
      ) : (
        <div className="relative aspect-video rounded-2xl overflow-hidden bg-black mb-4 neon-border neon-run">
          {stream.thumbnailUrl ? (
            <img src={stream.thumbnailUrl} className="w-full h-full object-cover opacity-60" alt="" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-violet-900 to-indigo-900" />
          )}
          <div className="absolute inset-0 flex items-center justify-center">
            <Badge variant="outline" className="text-base">Transmisión finalizada</Badge>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-4">
        <div className="md:col-span-2 glass-panel neon-border neon-run rounded-2xl p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                {stream.isLive && (
                  <Badge className="bg-red-500 text-white font-bold flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-white animate-pulse" /> EN VIVO
                  </Badge>
                )}
                <Badge variant="outline" className="flex items-center gap-1">
                  <Eye className="w-3.5 h-3.5" /> {stream.viewersCount ?? 0} espectadores
                </Badge>
              </div>
              <h1 className="text-xl font-bold neon-title mb-1">{stream.title}</h1>
              {stream.description && <p className="text-sm text-muted-foreground mb-3">{stream.description}</p>}
              <div className="flex items-center gap-3">
                <img
                  src={host?.avatarUrl ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${host?.id}`}
                  className="w-9 h-9 rounded-full object-cover ring-2 ring-primary/40 cursor-pointer"
                  alt=""
                  onClick={() => host?.id && setLocation(`/profile/${host.id}`)}
                />
                <div>
                  <button
                    type="button"
                    className="font-medium text-sm neon-text flex items-center gap-1 hover:text-primary"
                    onClick={() => host?.id && setLocation(`/profile/${host.id}`)}
                  >
                    {host?.displayName || "Anfitrión"}
                    {host?.isVerified && <CheckCircle className="w-3.5 h-3.5 text-primary" />}
                  </button>
                  {stream.category && <div className="text-xs text-muted-foreground">{stream.category}</div>}
                </div>
              </div>
            </div>
            {isHost && stream.isLive && (
              <Button
                variant="destructive"
                size="sm"
                className="rounded-xl"
                onClick={() =>
                  endStream.mutate(
                    { streamId },
                    {
                      onSuccess: () => {
                        qc.invalidateQueries();
                        toast({ title: "Transmisión finalizada" });
                        onBack();
                      },
                    },
                  )
                }
              >
                <VideoOff className="w-4 h-4 mr-1" /> Finalizar
              </Button>
            )}
          </div>
        </div>
        {me && stream.isLive && (
          <LiveChatPanel streamId={streamId} userId={me.id} displayName={me.displayName || "Usuario"} />
        )}
      </div>
    </div>
  );
}

export default function Streams() {
  const params = useParams<{ id?: string }>();
  const [, setLocation] = useLocation();
  const streamIdFromUrl = params.id ?? null;
  const { data: streams, isLoading } = useGetLiveStreams();
  const { data: me, isLoading: meLoading } = useGetMe();
  const startStream = useStartStream();
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const { toast } = useToast();

  const openStream = (id: string) => setLocation(`/streams/${id}`);
  const goBack = () => setLocation("/streams");

  const handleStart = (data: { title: string; description: string; category: string }) => {
    startStream.mutate(
      { data },
      {
        onSuccess: (stream) => {
          qc.invalidateQueries();
          setShowCreate(false);
          toast({ title: "¡Estás en vivo!", description: "Permite cámara y micrófono para transmitir." });
          openStream(stream.id);
        },
        onError: () => toast({ title: "Error", description: "No se pudo iniciar la transmisión.", variant: "destructive" }),
      },
    );
  };

  return (
    <Shell>
      <div className="max-w-6xl mx-auto w-full p-4 pb-24">
        <CreateLiveModal open={showCreate} onClose={() => setShowCreate(false)} onStart={handleStart} loading={startStream.isPending} />

        {streamIdFromUrl ? (
          meLoading && !me ? (
            <div className="flex justify-center p-20">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <StreamViewer streamId={streamIdFromUrl} onBack={goBack} />
          )
        ) : (
          <>
            <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
              <div>
                <h1 className="text-3xl font-bold neon-title flex items-center gap-3">
                  En vivo
                  <span className="flex items-center gap-1.5 text-base font-normal neon-subtle">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    {streams?.length ?? 0} activas
                  </span>
                </h1>
                <p className="text-muted-foreground text-sm mt-1">Transmite o mira directos de la comunidad</p>
              </div>
              <Button className="neon-btn rounded-2xl" onClick={() => setShowCreate(true)} disabled={startStream.isPending}>
                <Radio className="w-4 h-4 mr-2" /> Ir en vivo
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {isLoading
                ? [...Array(6)].map((_, i) => <div key={i} className="glass-panel rounded-2xl aspect-video animate-pulse" />)
                : streams?.length === 0
                  ? (
                    <div className="col-span-full text-center py-20 glass-panel neon-border neon-run rounded-2xl">
                      <Radio className="w-16 h-16 mx-auto mb-4 text-primary/40" />
                      <p className="text-lg font-medium neon-text">No hay transmisiones en este momento</p>
                      <p className="text-sm text-muted-foreground mt-1">¡Sé el primero en transmitir en vivo!</p>
                      <Button className="mt-4 neon-btn rounded-2xl" onClick={() => setShowCreate(true)}>
                        <Radio className="w-4 h-4 mr-2" /> Iniciar transmisión
                      </Button>
                    </div>
                  )
                  : streams?.map((stream) => (
                    <button
                      key={stream.id}
                      type="button"
                      onClick={() => openStream(stream.id)}
                      className="glass-panel neon-border neon-run rounded-2xl overflow-hidden hover:scale-[1.02] transition-transform text-left group"
                    >
                      <div className="relative aspect-video bg-gradient-to-br from-violet-900 to-indigo-900">
                        {stream.thumbnailUrl && (
                          <img src={stream.thumbnailUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform" alt="" />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                        <div className="absolute top-2 left-2">
                          <Badge className="bg-red-500 text-white text-xs font-bold flex items-center gap-1 px-2 py-0.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> EN VIVO
                          </Badge>
                        </div>
                        <div className="absolute top-2 right-2">
                          <Badge variant="outline" className="bg-black/60 backdrop-blur text-white border-white/20 flex items-center gap-1 text-xs">
                            <Eye className="w-3 h-3" /> {(stream.viewersCount ?? 0).toLocaleString("es-CO")}
                          </Badge>
                        </div>
                        <div className="absolute bottom-2 left-2 right-2 flex items-center gap-2">
                          <img
                            src={stream.host?.avatarUrl ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${stream.host?.id}`}
                            className="w-7 h-7 rounded-full border border-white/30 object-cover"
                            alt=""
                          />
                          <span className="text-white text-xs font-medium truncate drop-shadow neon-subtle">{stream.host?.displayName}</span>
                        </div>
                      </div>
                      <div className="p-3">
                        <div className="font-medium text-sm neon-text line-clamp-1">{stream.title}</div>
                        {stream.category && <div className="text-xs text-muted-foreground mt-0.5">{stream.category}</div>}
                      </div>
                    </button>
                  ))}
            </div>
          </>
        )}
      </div>
    </Shell>
  );
}
