import { useState } from "react";
import { X, Sparkles, Shuffle, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AvatarPreview } from "./AvatarPreview";
import {
  AVATAR_CATEGORIES,
  AVATAR_OPTIONS,
  DEFAULT_AVATAR_CONFIG,
  randomAvatarConfig,
} from "@/lib/avatar-studio/options";
import type { AvatarStudioConfig } from "@/lib/avatar-studio/types";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onClose: () => void;
  initialConfig?: AvatarStudioConfig;
  onSave: (config: AvatarStudioConfig, name: string) => Promise<void>;
  saving?: boolean;
};

export function AvatarStudio({ open, onClose, initialConfig, onSave, saving }: Props) {
  const [config, setConfig] = useState<AvatarStudioConfig>(initialConfig ?? DEFAULT_AVATAR_CONFIG);
  const [activeCategory, setActiveCategory] = useState<keyof AvatarStudioConfig>("skinColor");
  const [name, setName] = useState("Mi avatar");

  if (!open) return null;

  const options = AVATAR_OPTIONS[activeCategory] ?? [];

  const setOption = (value: string) => {
    setConfig((c) => ({ ...c, [activeCategory]: value }));
  };

  return (
    <div className="fixed inset-0 z-[130] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4">
      <div className="glass-panel neon-border w-full max-w-4xl max-h-[96dvh] sm:max-h-[90vh] rounded-t-3xl sm:rounded-3xl overflow-hidden flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-border/30 shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <div>
              <h2 className="text-lg font-bold neon-title">Estudio de avatares</h2>
              <p className="text-xs text-muted-foreground">Crea tu avatar y genera stickers automáticamente</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-xl hover:bg-white/10">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="grid md:grid-cols-[280px_1fr] gap-0 md:gap-4 p-4 sm:p-6">
            <div className="flex flex-col items-center gap-4 mb-4 md:mb-0">
              <AvatarPreview config={config} size="xl" className="w-full" />
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nombre del avatar"
                className="rounded-xl bg-white/5 text-sm max-w-[240px]"
              />
              <Button
                type="button"
                variant="outline"
                className="rounded-xl w-full max-w-[240px]"
                onClick={() => setConfig(randomAvatarConfig())}
              >
                <Shuffle className="w-4 h-4 mr-2" /> Aleatorio
              </Button>
            </div>

            <div className="min-w-0">
              <div className="flex gap-2 overflow-x-auto pb-3 mb-3 scrollbar-none">
                {AVATAR_CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setActiveCategory(cat.id as keyof AvatarStudioConfig)}
                    className={cn(
                      "shrink-0 px-3 py-2 rounded-xl text-xs font-medium border transition-all",
                      activeCategory === cat.id
                        ? "bg-primary/20 border-primary/50 text-primary"
                        : "bg-white/5 border-border/30 text-muted-foreground hover:bg-white/8",
                    )}
                  >
                    <span className="mr-1">{cat.icon}</span>
                    {cat.label}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {options.map((opt) => {
                  const selected = config[activeCategory] === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setOption(opt.value)}
                      className={cn(
                        "flex items-center gap-2 px-3 py-2.5 rounded-xl border text-left text-sm transition-all",
                        selected
                          ? "bg-primary/15 border-primary/50 text-primary shadow-[0_0_12px_hsl(var(--primary)/0.25)]"
                          : "bg-white/5 border-border/30 hover:bg-white/8",
                      )}
                    >
                      {opt.swatch && (
                        <span
                          className="w-5 h-5 rounded-full border border-white/20 shrink-0"
                          style={{ backgroundColor: `#${opt.swatch.replace("#", "")}` }}
                        />
                      )}
                      <span className="truncate">{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 sm:px-6 border-t border-border/30 flex gap-3 shrink-0">
          <Button variant="outline" className="flex-1 rounded-xl" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button
            className="flex-1 rounded-xl neon-btn"
            disabled={saving || !name.trim()}
            onClick={() => void onSave(config, name.trim())}
            data-testid="button-save-avatar-studio"
          >
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            {saving ? "Generando stickers..." : "Guardar y crear stickers"}
          </Button>
        </div>
      </div>
    </div>
  );
}
