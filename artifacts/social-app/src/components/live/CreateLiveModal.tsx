import { useState } from "react";
import { AppModal } from "@/components/ui/app-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormSelect } from "@/components/ui/form-select";
import { Radio } from "lucide-react";

const CATEGORIES = [
  { value: "General", label: "General" },
  { value: "Gaming", label: "Videojuegos" },
  { value: "Musica", label: "Música" },
  { value: "Charla", label: "Charla / Q&A" },
  { value: "Educacion", label: "Educación" },
  { value: "Negocios", label: "Negocios" },
];

type Props = {
  open: boolean;
  onClose: () => void;
  onStart: (data: { title: string; description: string; category: string }) => void;
  loading?: boolean;
};

export function CreateLiveModal({ open, onClose, onStart, loading }: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("General");

  const submit = () => {
    if (!title.trim()) return;
    onStart({ title: title.trim(), description: description.trim(), category });
  };

  return (
    <AppModal open={open} onClose={onClose} title="Iniciar transmisión en vivo">
      <div className="space-y-4">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block neon-subtle">Título *</label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ej. Charla con la comunidad" className="neon-input rounded-xl" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block neon-subtle">Descripción</label>
          <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="De qué tratará tu directo..." className="neon-input rounded-xl" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block neon-subtle">Categoría</label>
          <FormSelect value={category} onValueChange={setCategory} options={CATEGORIES} />
        </div>
        <Button className="neon-btn rounded-xl w-full" onClick={submit} disabled={loading || !title.trim()}>
          <Radio className="w-4 h-4 mr-2" /> {loading ? "Iniciando..." : "Ir en vivo"}
        </Button>
      </div>
    </AppModal>
  );
}
