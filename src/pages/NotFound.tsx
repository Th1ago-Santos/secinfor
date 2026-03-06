import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center animate-in-page">
        <p className="text-8xl font-bold text-primary/20 mb-2">404</p>
        <p className="text-xl font-semibold mb-2">Página não encontrada</p>
        <p className="text-muted-foreground mb-6 text-sm">A página que você procura não existe ou foi removida.</p>
        <Button variant="outline" onClick={() => window.location.href = '/'} className="transition-hover">
          <ArrowLeft className="h-4 w-4 mr-1.5" />
          Voltar ao início
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
