import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { X, ChevronLeft, Sparkles, Globe, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PAGE_TYPE_OPTIONS, type PageTypeOption } from "@/lib/page-types";
import { useCreateCommunity, useCreateBusinessPage } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";

type Props = {
  onClose: () => void;
  onCreated?: (result: { kind: "community" | "page"; id: string }) => void;
  /** Si se define, salta el paso de tipo y usa este tipo */
  initialTypeId?: string;
};

export function CreateProfessionalEntityModal({ onClose, onCreated, initialTypeId }: Props) {
  const initialType = initialTypeId
    ? PAGE_TYPE_OPTIONS.find((t) => t.id === initialTypeId)
    : undefined;

  const [step, setStep] = useState<"type" | "details">(initialType ? "details" : "type");
  const [selectedType, setSelectedType] = useState<PageTypeOption | undefined>(initialType);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const [error, setError] = useState("");

  const createCommunity = useCreateCommunity();
  const createPage = useCreateBusinessPage();
  const qc = useQueryClient();
  const pending = createCommunity.isPending || createPage.isPending;

  const pickType = (t: PageTypeOption) => {
    setSelectedType(t);
    setStep("details");
    setError("");
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!selectedType) {
      setError("Elige un tipo de página");
      return;
    }
    if (!name.trim()) {
      setError("El nombre es obligatorio");
      return;
    }

    const category = selectedType.label;

    if (selectedType.kind === "community") {
      createCommunity.mutate(
        {
          data: {
            name: name.trim(),
            description: description.trim() || undefined,
            visibility,
            pageType: selectedType.id,
            category,
          },
        },
        {
          onSuccess: (created) => {
            qc.invalidateQueries();
            onClose();
            if (created?.id) onCreated?.({ kind: "community", id: created.id });
          },
          onError: () => setError("No se pudo crear la comunidad. Intenta de nuevo."),
        },
      );
      return;
    }

    createPage.mutate(
      {
        name: name.trim(),
        description: description.trim() || name.trim(),
        category,
        pageType: selectedType.id,
      },
      {
        onSuccess: (page) => {
          qc.invalidateQueries();
          onClose();
          if (page?.id) onCreated?.({ kind: "page", id: page.id });
        },
        onError: () => setError("No se pudo crear la página. Intenta de nuevo."),
      },
    );
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-md"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-entity-title"
    >
      <div
        className="page-create-modal w-full sm:max-w-lg max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 border-b border-primary/25 bg-[hsl(258_52%_6%/0.95)] backdrop-blur-xl">
          {step === "details" && !initialType ? (
            <button
              type="button"
              onClick={() => setStep("type")}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              <ChevronLeft className="w-4 h-4" /> Tipo
            </button>
          ) : (
            <span className="text-xs uppercase tracking-[0.2em] text-primary/80 neon-subtle">Nuevo espacio</span>
          )}
          <button type="button" onClick={onClose} className="p-2 rounded-xl hover:bg-white/10 text-muted-foreground" aria-label="Cerrar">
            <X className="w-5 h-5" />
          </button>
        </div>

        {step === "type" && (
          <div className="p-5 pb-8">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-primary via-accent to-emerald-400 mb-3 shadow-[0_0_24px_hsl(var(--primary)/0.5)]">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <h2 id="create-entity-title" className="text-xl sm:text-2xl font-bold neon-title">
                Elige tu tipo de página
              </h2>
              <p className="text-sm text-muted-foreground mt-2 neon-subtle">
                Crea tu primera página profesional con seguidores propios
              </p>
            </div>

            <ul className="space-y-2">
              {PAGE_TYPE_OPTIONS.map((t) => {
                const Icon = t.icon;
                const active = selectedType?.id === t.id;
                return (
                  <li key={t.id}>
                    <button
                      type="button"
                      onClick={() => pickType(t)}
                      className={cn(
                        "page-type-row w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl border transition-all text-left",
                        active
                          ? "border-primary/70 bg-primary/15 ring-1 ring-primary/40"
                          : "border-white/10 bg-white/[0.04] hover:border-primary/40 hover:bg-white/[0.07]",
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-11 w-11 flex-none items-center justify-center rounded-xl bg-black/30 border border-white/10",
                          t.accent,
                          t.glow,
                        )}
                      >
                        <Icon className="w-5 h-5" strokeWidth={1.75} />
                      </span>
                      <span className="flex-1 font-medium text-sm sm:text-base">{t.label}</span>
                      <span
                        className={cn(
                          "h-5 w-5 rounded-full border-2 flex-none transition-all",
                          active
                            ? "border-primary bg-primary shadow-[0_0_12px_hsl(var(--primary)/0.8)]"
                            : "border-muted-foreground/40",
                        )}
                      >
                        {active && <span className="block w-full h-full rounded-full scale-50 bg-primary-foreground" />}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {step === "details" && selectedType && (
          <form onSubmit={submit} className="p-5 pb-8 space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-2xl border border-primary/30 bg-primary/10">
              <selectedType.icon className={cn("w-8 h-8", selectedType.accent)} />
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Tipo seleccionado</p>
                <p className="font-semibold neon-text">{selectedType.label}</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">
                {selectedType.kind === "community" ? "Nombre de la comunidad" : "Nombre de la página"} *
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={selectedType.kind === "community" ? "Ej. Taxpiya, Movilidad..." : "Nombre visible"}
                className="neon-input rounded-xl h-12"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">Descripción</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Cuéntanos de qué trata..."
                rows={3}
                className="w-full rounded-xl neon-input border border-input bg-white/5 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            {selectedType.kind === "community" && (
              <div className="space-y-2">
                <label className="block text-sm font-medium">Visibilidad</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setVisibility("public")}
                    className={cn(
                      "flex flex-col items-center gap-1 p-3 rounded-xl border text-sm transition-all",
                      visibility === "public"
                        ? "border-primary bg-primary/15 text-primary"
                        : "border-border/50 bg-white/5 text-muted-foreground",
                    )}
                  >
                    <Globe className="w-5 h-5" />
                    Pública
                  </button>
                  <button
                    type="button"
                    onClick={() => setVisibility("private")}
                    className={cn(
                      "flex flex-col items-center gap-1 p-3 rounded-xl border text-sm transition-all",
                      visibility === "private"
                        ? "border-primary bg-primary/15 text-primary"
                        : "border-border/50 bg-white/5 text-muted-foreground",
                    )}
                  >
                    <Lock className="w-5 h-5" />
                    Privada
                  </button>
                </div>
              </div>
            )}

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" className="flex-1 rounded-xl" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" className="flex-1 neon-btn rounded-xl" disabled={pending}>
                {pending ? "Creando..." : selectedType.kind === "community" ? "Crear comunidad" : "Crear página"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
