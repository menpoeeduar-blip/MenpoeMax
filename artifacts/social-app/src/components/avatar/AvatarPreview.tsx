import { useMemo } from "react";
import { renderAvatarDataUrl } from "@/lib/avatar-studio/render";
import type { AvatarStudioConfig } from "@/lib/avatar-studio/types";
import { cn } from "@/lib/utils";

type Props = {
  config: AvatarStudioConfig;
  overrides?: Partial<AvatarStudioConfig>;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
};

const SIZE_CLASS = {
  sm: "w-20 h-20",
  md: "w-32 h-32",
  lg: "w-48 h-48",
  xl: "w-64 h-64",
};

export function AvatarPreview({ config, overrides, className, size = "lg" }: Props) {
  const src = useMemo(() => renderAvatarDataUrl(config, overrides), [config, overrides]);
  return (
    <div className={cn("rounded-3xl bg-gradient-to-br from-primary/15 via-accent/10 to-violet-500/15 p-4 flex items-center justify-center neon-border", className)}>
      <img
        src={src}
        alt="Vista previa del avatar"
        className={cn(SIZE_CLASS[size], "drop-shadow-2xl")}
        draggable={false}
      />
    </div>
  );
}
