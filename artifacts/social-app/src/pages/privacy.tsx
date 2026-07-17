import { useEffect } from "react";
import { useLocation } from "wouter";

/** Redirige al centro de configuración unificado. */
export default function Privacy() {
  const [, setLocation] = useLocation();
  useEffect(() => {
    setLocation("/settings?section=default-audience", { replace: true });
  }, [setLocation]);
  return null;
}
