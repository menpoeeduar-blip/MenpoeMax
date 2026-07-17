import { useEffect } from "react";
import { useLocation } from "wouter";
import { useGetMe } from "@workspace/api-client-react";

/** Redirige al perfil — fotos viven en la pestaña Fotos */
export default function Photos() {
  const [, setLocation] = useLocation();
  const { data: me } = useGetMe();

  useEffect(() => {
    if (me?.id) setLocation(`/profile/${me.id}?tab=photos`);
    else setLocation("/profile");
  }, [me?.id, setLocation]);

  return null;
}
