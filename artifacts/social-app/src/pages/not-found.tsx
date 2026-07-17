import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background px-4">
      <div className="text-center">
        <div className="text-9xl font-black bg-clip-text text-transparent bg-gradient-to-br from-primary to-accent mb-4">
          404
        </div>
        <h1 className="text-2xl font-bold mb-2">Página no encontrada</h1>
        <p className="text-muted-foreground mb-6">
          La página que buscas no existe o fue movida.
        </p>
        <Link href="/">
          <Button className="rounded-2xl">
            <Home className="w-4 h-4 mr-2" />Volver al inicio
          </Button>
        </Link>
      </div>
    </div>
  );
}
