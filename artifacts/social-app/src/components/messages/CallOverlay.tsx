import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Phone, PhoneOff, Video, VideoOff } from "lucide-react";
import {
  clearCallSignals,
  clearIncomingCall,
  ICE_SERVERS,
  pushCallSignal,
  subscribeCallSignals,
  type CallMode,
  type CallSignal,
} from "@/lib/call-signaling";

type Props = {
  callId: string;
  conversationId: string;
  mode: CallMode;
  role: "caller" | "callee";
  meId: string;
  peerId: string;
  peerName: string;
  peerAvatar?: string | null;
  onClose: () => void;
};

export function CallOverlay({
  callId,
  mode,
  role,
  meId,
  peerId,
  peerName,
  peerAvatar,
  onClose,
}: Props) {
  const [status, setStatus] = useState<"ringing" | "connecting" | "active" | "ended">(
    role === "caller" ? "ringing" : "ringing",
  );
  const [muted, setMuted] = useState(false);
  const [camOff, setCamOff] = useState(mode === "audio");
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const handledIds = useRef(new Set<string>());
  const closedRef = useRef(false);

  const cleanupMedia = () => {
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    try {
      pcRef.current?.close();
    } catch {
      /* ignore */
    }
    pcRef.current = null;
  };

  const hangup = () => {
    if (closedRef.current) return;
    closedRef.current = true;
    pushCallSignal(callId, { callId, from: meId, to: peerId, type: "hangup", mode });
    void clearIncomingCall(peerId);
    void clearIncomingCall(meId);
    void clearCallSignals(callId);
    cleanupMedia();
    setStatus("ended");
    onClose();
  };

  useEffect(() => {
    let cancelled = false;
    let unsub: (() => void) | undefined;

    const attachRemote = (stream: MediaStream) => {
      if (mode === "video" && remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = stream;
      }
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = stream;
        void remoteAudioRef.current.play().catch(() => undefined);
      }
      setStatus("active");
    };

    const handleSignal = async (s: CallSignal, pc: RTCPeerConnection) => {
      if (s.from === meId) return;
      if (s.type === "reject" || s.type === "hangup") {
        hangup();
        return;
      }
      if (s.type === "accept" && role === "caller") {
        setStatus("connecting");
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        pushCallSignal(callId, {
          callId,
          from: meId,
          to: peerId,
          type: "offer",
          mode,
          payload: JSON.stringify(offer),
        });
      }
      if (s.type === "offer" && s.payload) {
        await pc.setRemoteDescription(JSON.parse(s.payload));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        pushCallSignal(callId, {
          callId,
          from: meId,
          to: peerId,
          type: "answer",
          mode,
          payload: JSON.stringify(answer),
        });
        setStatus("connecting");
      }
      if (s.type === "answer" && s.payload) {
        if (!pc.currentRemoteDescription) {
          await pc.setRemoteDescription(JSON.parse(s.payload));
        }
        setStatus("active");
      }
      if (s.type === "ice" && s.payload) {
        try {
          await pc.addIceCandidate(JSON.parse(s.payload));
        } catch {
          /* ignore */
        }
      }
    };

    const setup = async () => {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: mode === "video",
      });
      if (cancelled) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        localVideoRef.current.muted = true;
      }

      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      pcRef.current = pc;
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));

      pc.ontrack = (ev) => {
        const remote = ev.streams[0];
        if (remote) attachRemote(remote);
      };

      pc.onicecandidate = (ev) => {
        if (ev.candidate) {
          pushCallSignal(callId, {
            callId,
            from: meId,
            to: peerId,
            type: "ice",
            mode,
            payload: JSON.stringify(ev.candidate),
          });
        }
      };

      if (role === "caller") {
        pushCallSignal(callId, { callId, from: meId, to: peerId, type: "invite", mode });
      }

      unsub = subscribeCallSignals(callId, (signals) => {
        void (async () => {
          for (const s of signals) {
            if (handledIds.current.has(s.id)) continue;
            // process signals addressed to me, or broadcast hangup/reject
            if (s.to && s.to !== meId && s.type !== "hangup" && s.type !== "reject") continue;
            handledIds.current.add(s.id);
            await handleSignal(s, pc);
          }
        })();
      });
    };

    setup().catch(() => setStatus("ended"));

    return () => {
      cancelled = true;
      unsub?.();
      if (!closedRef.current) cleanupMedia();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callId, meId, peerId, mode, role]);

  const acceptAsCallee = () => {
    pushCallSignal(callId, { callId, from: meId, to: peerId, type: "accept", mode });
    setStatus("connecting");
  };

  const rejectAsCallee = () => {
    pushCallSignal(callId, { callId, from: meId, to: peerId, type: "reject", mode });
    hangup();
  };

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    localStreamRef.current?.getAudioTracks().forEach((t) => {
      t.enabled = !next;
    });
  };

  const toggleCam = () => {
    if (mode !== "video") return;
    const next = !camOff;
    setCamOff(next);
    localStreamRef.current?.getVideoTracks().forEach((t) => {
      t.enabled = !next;
    });
  };

  return (
    <div className="fixed inset-0 z-[140] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4">
      <audio ref={remoteAudioRef} autoPlay className="hidden" />
      <div className="w-full max-w-lg glass-panel neon-border neon-run rounded-3xl overflow-hidden relative">
        <div className="aspect-[9/14] sm:aspect-video bg-gradient-to-br from-violet-950 to-slate-950 relative">
          {mode === "video" ? (
            <>
              <video ref={remoteVideoRef} autoPlay playsInline className="absolute inset-0 w-full h-full object-cover" />
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="absolute bottom-3 right-3 w-28 h-40 object-cover rounded-xl border border-white/30 mirror bg-black/40"
              />
            </>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
              <img
                src={peerAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${peerId}`}
                className="w-28 h-28 rounded-full object-cover ring-4 ring-cyan-400/40"
                alt=""
              />
            </div>
          )}
          <div className="absolute top-4 left-0 right-0 text-center px-4">
            <p className="font-semibold text-white drop-shadow">{peerName}</p>
            <p className="text-xs text-white/70">
              {status === "ringing" && (role === "caller" ? "Llamando…" : "Llamada entrante…")}
              {status === "connecting" && "Conectando…"}
              {status === "active" && (mode === "video" ? "Videollamada activa" : "Llamada en curso")}
              {status === "ended" && "Finalizada"}
            </p>
          </div>
        </div>

        <div className="p-4 flex items-center justify-center gap-3 flex-wrap">
          {role === "callee" && status === "ringing" && (
            <>
              <Button className="rounded-full h-14 w-14 bg-emerald-500 hover:bg-emerald-400" onClick={acceptAsCallee} title="Contestar">
                <Phone className="w-6 h-6" />
              </Button>
              <Button variant="destructive" className="rounded-full h-14 w-14" onClick={rejectAsCallee} title="Rechazar">
                <PhoneOff className="w-6 h-6" />
              </Button>
            </>
          )}
          {(status === "connecting" || status === "active" || role === "caller") && (
            <>
              <Button variant="secondary" className="rounded-full h-12 w-12" onClick={toggleMute} title={muted ? "Activar mic" : "Silenciar"}>
                {muted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </Button>
              {mode === "video" && (
                <Button variant="secondary" className="rounded-full h-12 w-12" onClick={toggleCam}>
                  {camOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
                </Button>
              )}
              <Button variant="destructive" className="rounded-full h-14 w-14" onClick={hangup}>
                <PhoneOff className="w-6 h-6" />
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
