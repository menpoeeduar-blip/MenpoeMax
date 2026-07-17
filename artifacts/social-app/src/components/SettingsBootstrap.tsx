import { useEffect } from "react";
import { useGetAccountSettings } from "@workspace/api-client-react";
import { applyAccessibility } from "@/lib/account-settings";

/** Aplica preferencias guardadas (accesibilidad, idioma) al cargar la app. */
export function SettingsBootstrap() {
  const { data } = useGetAccountSettings();
  useEffect(() => {
    if (data?.accessibility) applyAccessibility(data.accessibility);
    if (data?.locale) document.documentElement.lang = data.locale === "en" ? "en" : "es";
  }, [data]);
  return null;
}
