import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormSelect } from "@/components/ui/form-select";
import { Shield, ShieldCheck, Camera, Upload, CheckCircle2, Clock, XCircle, FileText, Loader2 } from "lucide-react";
import { uploadFile } from "@/lib/upload";
import { useToast } from "@/hooks/use-toast";
import {
  useSubmitEntityVerification,
  useGetUserEntityVerification,
  type EntityVerificationRequest,
} from "@/lib/entity-verification-api";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityType: "profile" | "user" | "group" | "page" | "community";
  entityId: string;
  entityName: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  isAlreadyVerified?: boolean;
};

export function EntityVerificationModal({
  open,
  onOpenChange,
  entityType,
  entityId,
  entityName,
  userId,
  userName,
  userAvatar,
  isAlreadyVerified,
}: Props) {
  const { toast } = useToast();
  const submitVerification = useSubmitEntityVerification();
  const { data: existingRequest, isLoading: loadingExisting } = useGetUserEntityVerification(entityId, userId);

  const [documentType, setDocumentType] = useState("Cédula de Ciudadanía / DNI");
  const [documentNumber, setDocumentNumber] = useState("");
  const [additionalInfo, setAdditionalInfo] = useState("");
  const [frontImageUrl, setFrontImageUrl] = useState("");
  const [backImageUrl, setBackImageUrl] = useState("");
  const [selfieImageUrl, setSelfieImageUrl] = useState("");

  const [uploadingFront, setUploadingFront] = useState(false);
  const [uploadingBack, setUploadingBack] = useState(false);
  const [uploadingSelfie, setUploadingSelfie] = useState(false);

  const frontInputRef = useRef<HTMLInputElement>(null);
  const backInputRef = useRef<HTMLInputElement>(null);
  const selfieInputRef = useRef<HTMLInputElement>(null);

  const handleUploadFile = async (file: File, side: "front" | "back" | "selfie") => {
    if (side === "front") setUploadingFront(true);
    else if (side === "back") setUploadingBack(true);
    else setUploadingSelfie(true);

    try {
      const url = await uploadFile(file, { purpose: "post" });
      if (side === "front") setFrontImageUrl(url);
      else if (side === "back") setBackImageUrl(url);
      else setSelfieImageUrl(url);
      toast({
        title: "Documento adjuntado",
        description: `Foto ${side === "front" ? "frontal" : side === "back" ? "reversa" : "selfie"} subida con éxito.`,
      });
    } catch (err) {
      toast({ title: "Error al subir", description: "No se pudo cargar la imagen del documento.", variant: "destructive" });
    } finally {
      if (side === "front") setUploadingFront(false);
      else if (side === "back") setUploadingBack(false);
      else setUploadingSelfie(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!documentNumber.trim()) {
      toast({ title: "Campo requerido", description: "Por favor escribe tu número de documento.", variant: "destructive" });
      return;
    }
    if (!frontImageUrl) {
      toast({ title: "Foto requerida", description: "Adjunta al menos la foto frontal de tu documento.", variant: "destructive" });
      return;
    }

    submitVerification.mutate(
      {
        entityType,
        entityId,
        entityTitle: entityName,
        userId,
        userName,
        userAvatar,
        documentType,
        documentNumber: documentNumber.trim(),
        frontImageUrl,
        backImageUrl: backImageUrl || undefined,
        selfieImageUrl: selfieImageUrl || undefined,
        additionalInfo: additionalInfo.trim() || undefined,
      },
      {
        onSuccess: () => {
          toast({
            title: "Solicitud enviada 🛡️",
            description: `El administrador de ${entityName} revisará tus documentos para verificar tu cuenta.`,
          });
          onOpenChange(false);
        },
        onError: () => {
          toast({ title: "Error al enviar", description: "No se pudo procesar la solicitud.", variant: "destructive" });
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-panel neon-border max-w-lg rounded-3xl p-6 overflow-y-auto max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-center text-lg font-bold neon-text flex items-center justify-center gap-2">
            <ShieldCheck className="w-6 h-6 text-cyan-400" />
            Verificación en {entityName}
          </DialogTitle>
        </DialogHeader>

        {isAlreadyVerified ? (
          <div className="text-center py-8 space-y-3">
            <div className="w-16 h-16 rounded-full bg-cyan-500/20 border-2 border-cyan-400 flex items-center justify-center mx-auto text-cyan-400">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <h3 className="font-bold text-lg text-cyan-400">¡Ya estás Verificado!</h3>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto">
              Cuentas con la insignia oficial de miembro verificado en <strong>{entityName}</strong>. Tu insignia se muestra junto a tu nombre en publicaciones y comentarios.
            </p>
          </div>
        ) : existingRequest?.status === "pending" ? (
          <div className="text-center py-8 space-y-3">
            <div className="w-16 h-16 rounded-full bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center mx-auto text-amber-400 animate-pulse">
              <Clock className="w-8 h-8" />
            </div>
            <h3 className="font-bold text-lg text-amber-400">Solicitud en Revisión</h3>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto">
              Tus documentos fueron enviados. El creador o administrador de <strong>{entityName}</strong> está verificando tu información. Te notificaremos cuando sea procesada.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            {existingRequest?.status === "rejected" && (
              <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
                <p className="font-bold flex items-center gap-1"><XCircle className="w-4 h-4" /> Solicitud previa rechazada</p>
                {existingRequest.rejectionReason && <p className="mt-1 opacity-90">Motivo: {existingRequest.rejectionReason}</p>}
                <p className="mt-1 text-[11px] opacity-70">Puedes enviar tus datos nuevamente corregidos a continuación.</p>
              </div>
            )}

            <p className="text-xs text-muted-foreground text-center">
              Para obtener la insignia de verificado en <strong>{entityName}</strong>, adjunta fotos claras de tu documento de identidad para revisión por el administrador.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">Tipo de Documento</label>
                <FormSelect
                  value={documentType}
                  onValueChange={setDocumentType}
                  options={[
                    { value: "DNI", label: "Cédula / DNI / ID" },
                    { value: "PASAPORTE", label: "Pasaporte" },
                    { value: "LICENCIA", label: "Licencia de Conducir" },
                    { value: "EMPRESA", label: "Registro Mercantil / RIF" },
                  ]}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">Número de Documento</label>
                <Input
                  value={documentNumber}
                  onChange={(e) => setDocumentNumber(e.target.value)}
                  placeholder="Ej: V-12345678"
                  className="neon-input rounded-xl text-sm"
                  required
                />
              </div>
            </div>

            {/* Document Photos Upload */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground block">
                Fotos del Documento (Frente y Reverso)
              </label>

              <div className="grid grid-cols-2 gap-3">
                {/* Front Photo */}
                <div className="border border-dashed border-border/60 hover:border-primary rounded-2xl p-3 text-center bg-white/5 relative flex flex-col items-center justify-center min-h-[110px]">
                  <input
                    ref={frontInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void handleUploadFile(f, "front");
                    }}
                  />
                  {uploadingFront ? (
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  ) : frontImageUrl ? (
                    <div className="relative w-full h-24 rounded-xl overflow-hidden group">
                      <img src={frontImageUrl} className="w-full h-full object-cover" alt="Frente" />
                      <button
                        type="button"
                        onClick={() => setFrontImageUrl("")}
                        className="absolute top-1 right-1 bg-black/70 p-1 rounded-full text-white"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => frontInputRef.current?.click()}
                      className="flex flex-col items-center gap-1 text-muted-foreground hover:text-foreground text-xs"
                    >
                      <Camera className="w-6 h-6 text-primary" />
                      <span className="font-semibold text-primary">Foto Frontal</span>
                      <span className="text-[10px] opacity-70">Clic para subir</span>
                    </button>
                  )}
                </div>

                {/* Back Photo */}
                <div className="border border-dashed border-border/60 hover:border-primary rounded-2xl p-3 text-center bg-white/5 relative flex flex-col items-center justify-center min-h-[110px]">
                  <input
                    ref={backInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void handleUploadFile(f, "back");
                    }}
                  />
                  {uploadingBack ? (
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  ) : backImageUrl ? (
                    <div className="relative w-full h-24 rounded-xl overflow-hidden group">
                      <img src={backImageUrl} className="w-full h-full object-cover" alt="Reverso" />
                      <button
                        type="button"
                        onClick={() => setBackImageUrl("")}
                        className="absolute top-1 right-1 bg-black/70 p-1 rounded-full text-white"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => backInputRef.current?.click()}
                      className="flex flex-col items-center gap-1 text-muted-foreground hover:text-foreground text-xs"
                    >
                      <Camera className="w-6 h-6 text-accent" />
                      <span className="font-semibold text-accent">Foto Reverso</span>
                      <span className="text-[10px] opacity-70">(Opcional)</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Selfie / Rostro con documento */}
              <div className="pt-2">
                <label className="text-xs font-semibold text-muted-foreground block mb-1">
                  Selfie sosteniendo tu documento (Opcional pero acelera la aprobación)
                </label>
                <div className="border border-dashed border-border/60 hover:border-primary rounded-2xl p-3 text-center bg-white/5 relative flex flex-col items-center justify-center min-h-[90px]">
                  <input
                    ref={selfieInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void handleUploadFile(f, "selfie");
                    }}
                  />
                  {uploadingSelfie ? (
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  ) : selfieImageUrl ? (
                    <div className="relative w-full h-24 rounded-xl overflow-hidden group">
                      <img src={selfieImageUrl} className="w-full h-full object-cover" alt="Selfie" />
                      <button
                        type="button"
                        onClick={() => setSelfieImageUrl("")}
                        className="absolute top-1 right-1 bg-black/70 p-1 rounded-full text-white"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => selfieInputRef.current?.click()}
                      className="flex items-center justify-center gap-2 text-muted-foreground hover:text-foreground text-xs py-2 w-full"
                    >
                      <Camera className="w-5 h-5 text-cyan-400" />
                      <span className="font-semibold text-cyan-400">Adjuntar Selfie con documento</span>
                      <span className="text-[10px] opacity-70">(Opcional)</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">
                Información adicional o motivo (Opcional)
              </label>
              <textarea
                value={additionalInfo}
                onChange={(e) => setAdditionalInfo(e.target.value)}
                placeholder="Describe tu cargo o la razón de verificación en el grupo..."
                className="w-full bg-white/5 border border-border/40 rounded-xl p-3 text-xs focus:outline-none focus:border-primary/60 min-h-[60px] resize-none"
              />
            </div>

            <Button
              type="submit"
              className="w-full neon-btn rounded-xl font-bold gap-2 py-3"
              disabled={submitVerification.isPending || uploadingFront || uploadingBack}
            >
              {submitVerification.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ShieldCheck className="w-4 h-4" />
              )}
              Enviar para Verificación
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
