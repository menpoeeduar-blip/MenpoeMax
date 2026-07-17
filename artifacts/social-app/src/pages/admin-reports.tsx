import { useEffect, useState } from "react";
import { Redirect } from "wouter";
import { Shell } from "@/components/layout/Shell";
import { useIsAdmin } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { listPendingReports, resolveReport, type ContentReport } from "@/lib/moderation";
import { Flag, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

export default function AdminReportsPage() {
  const { data: isAdmin, isLoading: loadingRole } = useIsAdmin();
  const [reports, setReports] = useState<ContentReport[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const reload = async () => {
    setLoading(true);
    try {
      setReports(await listPendingReports());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
  }, []);

  if (!loadingRole && !isAdmin) return <Redirect to="/" />;

  const act = async (id: string, status: "dismissed" | "actioned") => {
    await resolveReport(id, status);
    toast({ title: status === "actioned" ? "Marcado como atendido" : "Reporte descartado" });
    await reload();
  };

  return (
    <Shell>
      <div className="max-w-2xl mx-auto p-4 pb-24">
        <div className="flex items-center gap-3 mb-6">
          <Flag className="w-10 h-10 text-primary" />
          <div>
            <h1 className="text-2xl font-bold neon-title">Moderación</h1>
            <p className="text-sm text-muted-foreground">Cola de reportes de contenido</p>
          </div>
        </div>

        {loading ? (
          <div className="h-32 glass-panel rounded-2xl animate-pulse" />
        ) : reports.length === 0 ? (
          <div className="glass-panel neon-border rounded-2xl p-10 text-center text-muted-foreground">
            <Shield className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No hay reportes pendientes</p>
          </div>
        ) : (
          <div className="space-y-3">
            {reports.map((r) => (
              <div key={r.id} className="glass-panel neon-border rounded-2xl p-4 space-y-2">
                <div className="flex justify-between gap-2 text-sm">
                  <span className="font-medium capitalize">{r.targetType}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(r.createdAt), { addSuffix: true, locale: es })}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">ID: {r.targetId}</p>
                <p className="text-sm">Motivo: {r.reason}</p>
                {r.details && <p className="text-xs text-muted-foreground">{r.details}</p>}
                <div className="flex gap-2 pt-1">
                  <Button size="sm" variant="outline" className="rounded-xl" onClick={() => void act(r.id, "dismissed")}>
                    Descartar
                  </Button>
                  <Button size="sm" className="rounded-xl neon-btn" onClick={() => void act(r.id, "actioned")}>
                    Atendido
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Shell>
  );
}
