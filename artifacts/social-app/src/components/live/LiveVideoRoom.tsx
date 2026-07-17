import { useEffect, useRef, useState, useCallback } from "react";
import {
  ICE_SERVERS,
  pushSignal,
  subscribeSignals,
  captureVideoThumbnail,
  clearSignals,
  type LiveRtcSignal,
} from "@/lib/live-signaling";

type Props = {
  streamId: string;
  userId: string;
  hostId: string;
  isHost: boolean;
  onThumbnail?: (url: string) => void;
};

export function LiveVideoRoom({ streamId, userId, hostId, isHost, onThumbnail }: Props) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const pcsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const seenRef = useRef(new Set<string>());
  const [status, setStatus] = useState("Conectando...");
  const [hasRemote, setHasRemote] = useState(false);

  const stopAll = useCallback(() => {
    pcsRef.current.forEach((pc) => pc.close());
    pcsRef.current.clear();
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
  }, []);

  const processSignal = useCallback(async (sig: LiveRtcSignal, stream: MediaStream | null) => {
    if (seenRef.current.has(sig.id)) return;
    seenRef.current.add(sig.id);

    if (isHost) {
      if (sig.type === "join" && sig.from !== userId) {
        const viewerId = sig.from;
        if (pcsRef.current.has(viewerId) || !stream) return;
        const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
        pcsRef.current.set(viewerId, pc);
        stream.getTracks().forEach((t) => pc.addTrack(t, stream));
        pc.onicecandidate = (e) => {
          if (e.candidate) {
            pushSignal(streamId, { streamId, from: userId, to: viewerId, type: "ice", payload: JSON.stringify(e.candidate) });
          }
        };
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        pushSignal(streamId, { streamId, from: userId, to: viewerId, type: "offer", payload: JSON.stringify(offer) });
      } else if (sig.type === "answer" && sig.to === userId) {
        const pc = pcsRef.current.get(sig.from);
        if (pc) await pc.setRemoteDescription(JSON.parse(sig.payload)).catch(() => undefined);
      } else if (sig.type === "ice" && sig.to === userId) {
        const pc = pcsRef.current.get(sig.from);
        if (pc) await pc.addIceCandidate(JSON.parse(sig.payload)).catch(() => undefined);
      }
    } else {
      if (sig.type === "offer" && sig.to === userId) {
        let pc = pcsRef.current.get("host");
        if (!pc) {
          pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
          pcsRef.current.set("host", pc);
          pc.ontrack = (e) => {
            if (remoteVideoRef.current && e.streams[0]) {
              remoteVideoRef.current.srcObject = e.streams[0];
              void remoteVideoRef.current.play().catch(() => undefined);
              setHasRemote(true);
              setStatus("Conectado al directo");
            }
          };
          pc.onicecandidate = (e) => {
            if (e.candidate) {
              pushSignal(streamId, { streamId, from: userId, to: hostId, type: "ice", payload: JSON.stringify(e.candidate) });
            }
          };
        }
        await pc.setRemoteDescription(JSON.parse(sig.payload));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        pushSignal(streamId, { streamId, from: userId, to: hostId, type: "answer", payload: JSON.stringify(answer) });
      } else if (sig.type === "ice" && sig.to === userId) {
        const pc = pcsRef.current.get("host");
        if (pc) await pc.addIceCandidate(JSON.parse(sig.payload)).catch(() => undefined);
      }
    }
  }, [hostId, isHost, streamId, userId]);

  useEffect(() => {
    let cancelled = false;
    let thumbTimer: number | undefined;

    async function start() {
      if (isHost) {
        setStatus("Activando cámara y micrófono...");
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: true });
          if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
          localStreamRef.current = stream;
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
            await localVideoRef.current.play().catch(() => undefined);
          }
          setStatus("Transmitiendo en vivo");

          thumbTimer = window.setInterval(async () => {
            if (localVideoRef.current && onThumbnail) {
              const url = await captureVideoThumbnail(localVideoRef.current);
              if (url) onThumbnail(url);
            }
          }, 6000);

          const onSignals = (signals: LiveRtcSignal[]) => {
            signals.forEach((sig) => { void processSignal(sig, stream); });
          };
          const unsub = subscribeSignals(streamId, onSignals);
          return unsub;
        } catch {
          setStatus("Permite el acceso a cámara y micrófono para transmitir.");
          return undefined;
        }
      }

      setStatus("Solicitando conexión con el anfitrión...");
      pushSignal(streamId, { streamId, from: userId, to: hostId, type: "join", payload: "" });
      const unsub = subscribeSignals(streamId, (signals: LiveRtcSignal[]) => {
        signals.forEach((sig) => { void processSignal(sig, null); });
      });
      const retry = window.setInterval(() => {
        pushSignal(streamId, { streamId, from: userId, to: hostId, type: "join", payload: "" });
      }, 5000);
      return () => {
        window.clearInterval(retry);
        unsub();
      };
    }

    let cleanup: (() => void) | undefined;
    void start().then((fn) => { cleanup = fn; });

    return () => {
      cancelled = true;
      if (thumbTimer) window.clearInterval(thumbTimer);
      cleanup?.();
      if (isHost) clearSignals(streamId);
      stopAll();
    };
  }, [isHost, streamId, userId, hostId, onThumbnail, processSignal, stopAll]);

  return (
    <div className="relative aspect-video rounded-2xl overflow-hidden bg-black mb-4 neon-border">
      {isHost ? (
        <video ref={localVideoRef} autoPlay muted playsInline className="w-full h-full object-cover mirror" />
      ) : (
        <>
          <video ref={remoteVideoRef} autoPlay playsInline className={`w-full h-full object-cover ${hasRemote ? "" : "hidden"}`} />
          {!hasRemote && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-violet-900/90 to-indigo-900/90 gap-2">
              <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-sm neon-text text-center px-6">{status}</p>
            </div>
          )}
        </>
      )}
      {isHost && (
        <div className="absolute bottom-3 left-3 text-xs neon-subtle bg-black/60 px-2 py-1 rounded-lg">{status}</div>
      )}
    </div>
  );
}
