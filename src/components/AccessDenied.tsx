import { ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export default function AccessDenied({ message }: { message?: string }) {
  const navigate = useNavigate();
  return (
    <div className="container mx-auto flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="rounded-2xl bg-destructive/10 p-4">
        <ShieldAlert className="h-8 w-8 text-destructive" />
      </div>
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">Acesso negado</h2>
        <p className="max-w-md text-sm text-muted-foreground">
          {message || 'Você não tem permissão para acessar esta área do sistema.'}
        </p>
      </div>
      <Button variant="outline" onClick={() => navigate(-1)}>Voltar</Button>
    </div>
  );
}
