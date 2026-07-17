import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type FormSelectOption = { value: string; label: string };

type Props = {
  value: string;
  onValueChange: (value: string) => void;
  options: FormSelectOption[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
};

/** Select accesible con opciones visibles (evita listas en blanco del `<select>` nativo en Windows). */
export function FormSelect({ value, onValueChange, options, placeholder = "Seleccionar...", className, disabled }: Props) {
  return (
    <Select value={value || undefined} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger className={cn("neon-input rounded-xl h-10 w-full bg-card/80 text-foreground", className)}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="glass-panel neon-border z-[300] bg-card text-foreground border-border">
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value} className="text-foreground focus:bg-primary/20 focus:text-foreground">
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
