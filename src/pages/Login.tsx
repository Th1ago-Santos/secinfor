import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Monitor, AlertCircle, Lock, Mail, Shield, ChevronRight } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error } = await signIn(email, password);
    if (error) {
      setError('E-mail ou senha inválidos.');
    } else {
      navigate('/');
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background relative overflow-hidden px-4">
      {/* Animated background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,hsl(var(--primary)/0.12),transparent)]" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
      </div>

      {/* Grid pattern */}
      <div 
        className="absolute inset-0 opacity-[0.015] dark:opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
        }}
      />

      <div className="w-full max-w-[420px] relative animate-in-page">
        {/* Logo above card */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative mb-4">
            <div className="rounded-2xl shadow-glow overflow-hidden">
              <img src="/favicon.png" alt="14º B Log" className="h-16 w-16 object-contain" />
            </div>
            <div className="absolute -inset-1 rounded-2xl gradient-primary opacity-20 blur-lg -z-10" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Controle de Patrimônio</h1>
          <p className="text-sm text-muted-foreground mt-1">Sistema de Gestão Patrimonial</p>
        </div>

        <Card className="shadow-card-hover border-border/50 backdrop-blur-sm">
          <CardHeader className="pb-0 pt-7 px-7">
            <p className="text-sm font-medium text-foreground">Acesse sua conta</p>
            <p className="text-xs text-muted-foreground mt-0.5">Digite suas credenciais para continuar</p>
          </CardHeader>
          <CardContent className="p-7 pt-5">
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive" className="animate-in-card py-2.5">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-sm">{error}</AlertDescription>
                </Alert>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-medium text-muted-foreground">E-mail</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-11 bg-muted/30 border-border/60 focus:bg-background focus:border-primary/50 focus:shadow-glow transition-all duration-300"
                    required
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs font-medium text-muted-foreground">Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 h-11 bg-muted/30 border-border/60 focus:bg-background focus:border-primary/50 focus:shadow-glow transition-all duration-300"
                    required
                  />
                </div>
              </div>
              <Button 
                type="submit" 
                className="w-full h-11 text-sm font-semibold gradient-primary border-0 shadow-glow hover:opacity-90 transition-all duration-300 group"
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full" />
                    Entrando...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Entrar
                    <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </span>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="flex items-center justify-center gap-2 mt-6">
          <div className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
          <p className="text-[11px] text-muted-foreground/60">Sistema online • v2.0</p>
        </div>
      </div>
    </div>
  );
}
