import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, ShieldAlert, CheckCircle, XCircle, FileText, Eye, Clock, User, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  useGetEntityVerifications,
  useReviewEntityVerification,
  type EntityVerificationRequest,
} from "@/lib/entity-verification-api";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityType: "group" | "page" | "community";
  entityId: string;
  entityName: string;
};

export function EntityVerificationAdminModal({
  open,
  onOpenChange,
  entityType,
  entityId,
  entityName,
}: Props) {
  const { toast } = useToast();
  const { data: requests, isLoading } = useGetEntityVerifications(entityId);
  const reviewVerification = useReviewEntityVerification();

  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const pendingList = requests?.filter((r) => r.status === "pending") || [];
  const approvedList = requests?.filter((r) => r.status === "approved") || [];
  const rejectedList = requests?.filter((r) => r.status === "rejected") || [];

  const handleApprove = (req: EntityVerificationRequest) => {
    reviewVerification.mutate(
      {
        requestId: req.id,
        entityType,
        entityId,
        userId: req.userId,
        status: "approved",
      },
      {
        onSuccess: () => {
          toast({
            title: "Verificación Aprobada 🎉",
            description: `${req.userName} ahora tiene el distintivo verificado en ${entityName}.`,
          });
        },
      }
    );
  };

  const handleConfirmReject = (req: EntityVerificationRequest) => {
    reviewVerification.mutate(
      {
        requestId: req.id,
        entityType,
        entityId,
        userId: req.userId,
        status: "rejected",
        rejectionReason: rejectionReason.trim() || "Documentos incompletos o ilegibles",
      },
      {
        onSuccess: () => {
          setRejectingId(null);
          setRejectionReason("");
          toast({
            title: "Solicitud Rechazada",
            description: `Se ha notificado a ${req.userName}.`,
          });
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-panel neon-border max-w-2xl rounded-3xl p-6 overflow-y-auto max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-center text-lg font-bold neon-text flex items-center justify-center gap-2">
            <ShieldCheck className="w-6 h-6 text-cyan-400" />
            Panel de Verificaciones — {entityName}
          </DialogTitle>
        </DialogHeader>

        {/* Lightbox photo viewer */}
        {selectedPhoto && (
          <div
            className="fixed inset-0 z-[500] bg-black/90 flex items-center justify-center p-4"
            onClick={() => setSelectedPhoto(null)}
          >
            <div className="relative max-w-3xl max-h-[85vh]">
              <img src={selectedPhoto} className="max-w-full max-h-[85vh] object-contain rounded-2xl border-2 border-primary/50" alt="Documento" />
              <p className="text-center text-white/80 text-xs mt-2">Clic en cualquier lugar para cerrar</p>
            </div>
          </div>
        )}

        <div className="space-y-6 pt-2">
          {/* Section: Pending */}
          <div className="space-y-3">
            <h3 className="font-bold text-sm flex items-center gap-2 text-amber-400">
              <Clock className="w-4 h-4" />
              Solicitudes Pendientes ({pendingList.length})
            </h3>

            {isLoading ? (
              <div className="h-24 bg-white/5 animate-pulse rounded-2xl" />
            ) : pendingList.length === 0 ? (
              <div className="p-6 rounded-2xl bg-white/5 border border-border/30 text-center text-xs text-muted-foreground">
                No hay solicitudes pendientes de verificación.
              </div>
            ) : (
              pendingList.map((req) => (
                <div
                  key={req.id}
                  className="p-4 rounded-2xl glass-panel neon-border border-amber-500/30 space-y-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={req.userAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${req.userId}`}
                        className="w-10 h-10 rounded-full object-cover border-2 border-amber-400/40"
                        alt=""
                      />
                      <div>
                        <p className="font-semibold text-sm neon-text">{req.userName}</p>
                        <p className="text-xs text-muted-foreground">
                          {req.documentType}: <span className="font-mono text-foreground font-medium">{req.documentNumber}</span>
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="border-amber-500/50 text-amber-400 text-[10px]">
                      Pendiente
                    </Badge>
                  </div>

                  {req.additionalInfo && (
                    <p className="text-xs italic bg-white/5 p-2 rounded-xl text-muted-foreground">
                      "{req.additionalInfo}"
                    </p>
                  )}

                  {/* Document Photos Thumbnails */}
                  <div className="space-y-1">
                    <p className="text-[11px] font-semibold text-muted-foreground">Fotos adjuntas (clic para ampliar):</p>
                    <div className="flex gap-2">
                      {req.frontImageUrl && (
                        <div
                          className="relative w-28 h-16 rounded-xl overflow-hidden border border-primary/40 cursor-pointer hover:opacity-90 group"
                          onClick={() => setSelectedPhoto(req.frontImageUrl)}
                        >
                          <img src={req.frontImageUrl} className="w-full h-full object-cover" alt="Frente" />
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Eye className="w-4 h-4 text-white" />
                          </div>
                          <span className="absolute bottom-0.5 left-1 text-[8px] bg-black/70 px-1 rounded text-white font-bold">Frente</span>
                        </div>
                      )}

                      {req.backImageUrl && (
                        <div
                          className="relative w-28 h-16 rounded-xl overflow-hidden border border-accent/40 cursor-pointer hover:opacity-90 group"
                          onClick={() => setSelectedPhoto(req.backImageUrl)}
                        >
                          <img src={req.backImageUrl} className="w-full h-full object-cover" alt="Reverso" />
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Eye className="w-4 h-4 text-white" />
                          </div>
                          <span className="absolute bottom-0.5 left-1 text-[8px] bg-black/70 px-1 rounded text-white font-bold">Reverso</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  {rejectingId === req.id ? (
                    <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 space-y-2">
                      <p className="text-xs font-semibold text-red-400">Motivo del rechazo:</p>
                      <Input
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        placeholder="Ej: Foto de documento borrosa / ilegible"
                        className="neon-input text-xs rounded-xl"
                      />
                      <div className="flex gap-2 justify-end">
                        <Button size="sm" variant="ghost" className="text-xs rounded-xl" onClick={() => setRejectingId(null)}>
                          Cancelar
                        </Button>
                        <Button
                          size="sm"
                          className="bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs"
                          onClick={() => handleConfirmReject(req)}
                        >
                          Confirmar Rechazo
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2 justify-end pt-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-red-500/30 text-red-400 hover:bg-red-500/10 text-xs rounded-xl gap-1"
                        onClick={() => setRejectingId(req.id)}
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        Rechazar
                      </Button>
                      <Button
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs rounded-xl gap-1 font-bold"
                        onClick={() => handleApprove(req)}
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        Aprobar y Verificar
                      </Button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Section: Approved */}
          {approvedList.length > 0 && (
            <div className="space-y-3 pt-2">
              <h3 className="font-bold text-sm flex items-center gap-2 text-emerald-400">
                <CheckCircle className="w-4 h-4" />
                Miembros Verificados ({approvedList.length})
              </h3>
              <div className="space-y-2">
                {approvedList.map((req) => (
                  <div
                    key={req.id}
                    className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={req.userAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${req.userId}`}
                        className="w-8 h-8 rounded-full object-cover"
                        alt=""
                      />
                      <div>
                        <p className="font-semibold text-xs text-emerald-400 flex items-center gap-1">
                          {req.userName}
                          <CheckCircle className="w-3.5 h-3.5 text-cyan-400 fill-cyan-400/20" />
                        </p>
                        <p className="text-[10px] text-muted-foreground">{req.documentType}: {req.documentNumber}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="border-emerald-500/50 text-emerald-400 text-[10px]">
                      Verificado ✓
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
