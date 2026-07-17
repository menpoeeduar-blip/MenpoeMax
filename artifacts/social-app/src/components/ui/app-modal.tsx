import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  overlayClassName?: string;
  align?: "center" | "bottom";
};

/** Modal en portal con z-index alto — evita quedar detrás de paneles del layout. */
export function AppModal({ open, onClose, children, className, overlayClassName, align = "center" }: Props) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className={cn(
        "fixed inset-0 z-[200] flex bg-black/75 backdrop-blur-md p-0 sm:p-4",
        align === "center" ? "items-center justify-center" : "items-end sm:items-center justify-center",
        overlayClassName,
      )}
      onClick={onClose}
      role="presentation"
    >
      <div className={cn("relative z-[201] max-h-[94vh] overflow-hidden", className)} onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>,
    document.body,
  );
}
