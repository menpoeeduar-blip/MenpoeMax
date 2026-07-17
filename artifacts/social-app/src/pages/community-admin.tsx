import { useState } from "react";
import { Shell } from "@/components/layout/Shell";
import { useGetCommunityAdminList, useUpdateCommunityMeta, useApproveCommunityMember } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Shield, Users, CheckCircle } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

export default function CommunityAdmin() {
  const { data: communities } = useGetCommunityAdminList();
  const updateMeta = useUpdateCommunityMeta();
  const approve = useApproveCommunityMember();
  const { toast } = useToast();
  const [selected, setSelected] = useState<string | null>(null);
  const [rules, setRules] = useState("");

  const current = (communities ?? []).find((c: any) => c.id === selected);

  const selectCommunity = (c: any) => {
    setSelected(c.id);
    setRules(c.meta?.rules ?? "");
  };

  const saveRules = () => {
    if (!selected) return;
    updateMeta.mutate(
      { communityId: selected, rules },
      {
        onSuccess: () => toast({ title: "Reglas guardadas", description: "Los miembros verán las nuevas reglas del grupo." }),
        onError: () => toast({ title: "Error", description: "No se pudieron guardar las reglas.", variant: "destructive" }),
      },
    );
  };

  return (
    <Shell>
      <div className="max-w-4xl mx-auto p-4 pb-24">
        <h1 className="text-3xl font-bold neon-title mb-2">Administrar grupos</h1>
        <p className="text-sm text-muted-foreground neon-subtle mb-6">Reglas, aprobación de miembros y roles admin/mod.</p>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            {(communities ?? []).map((c: any) => (
              <button key={c.id} onClick={() => selectCommunity(c)} className={`w-full glass-panel neon-border rounded-2xl p-4 text-left ${selected === c.id ? "ring-2 ring-primary" : ""}`}>
                <p className="font-semibold neon-text">{c.name}</p>
                <p className="text-xs text-muted-foreground">{c.membersCount} miembros · {c.meta?.pendingMembers?.length ?? 0} pendientes</p>
              </button>
            ))}
            {(communities ?? []).length === 0 && <p className="text-muted-foreground text-sm">Únete a una comunidad para administrarla.</p>}
          </div>

          {current && (
            <div className="glass-panel neon-border rounded-2xl p-5 space-y-4">
              <div className="flex items-center gap-2"><Shield className="w-5 h-5 text-primary" /><span className="font-semibold neon-text">Reglas del grupo</span></div>
              <Textarea value={rules} onChange={(e) => setRules(e.target.value)} rows={5} className="neon-input rounded-xl" />
              <Button onClick={saveRules} className="neon-btn rounded-xl w-full">Guardar reglas</Button>

              <div className="flex items-center justify-between pt-2 border-t border-border/40">
                <span className="text-sm">Aprobación manual de miembros</span>
                <Switch
                  checked={current.meta?.requireApproval ?? false}
                  onCheckedChange={(v) => updateMeta.mutate({ communityId: current.id, requireApproval: v })}
                />
              </div>

              <div>
                <p className="text-sm font-medium neon-text mb-2 flex items-center gap-1"><Users className="w-4 h-4" />Solicitudes pendientes</p>
                {(current.meta?.pendingMembers ?? []).length === 0 ? (
                  <p className="text-xs text-muted-foreground">Sin solicitudes pendientes</p>
                ) : (
                  (current.meta.pendingMembers as any[]).map((m) => (
                    <div key={m.userId} className="flex items-center justify-between py-2">
                      <span className="text-sm">Usuario {m.userId.slice(0, 8)}</span>
                      <Button size="sm" variant="outline" onClick={() => approve.mutate({ communityId: current.id, userId: m.userId })}><CheckCircle className="w-4 h-4" /></Button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </Shell>
  );
}
