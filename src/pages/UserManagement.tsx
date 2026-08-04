import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from '@/hooks/useUserRole';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Plus, Pencil, Trash2, KeyRound, ShieldCheck, ShieldAlert, Eye, Ban } from 'lucide-react';
import { toast } from 'sonner';
import PageTransition from '@/components/PageTransition';
import PageHeader from '@/components/PageHeader';
import { useSections } from '@/hooks/useSections';

type ManagedUser = {
  id: string;
  email: string;
  display_name: string;
  role: string;
  role_id: string | null;
  section_id: string | null;
  section_name: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  banned: boolean;
};

const roleLabels: Record<string, string> = {
  admin: 'Administrador',
  operador: 'Operador',
  chefe_secao: 'Chefe de Seção',
  visualizador: 'Visualizador',
};

const roleIcons: Record<string, typeof ShieldCheck> = {
  admin: ShieldCheck,
  operador: ShieldAlert,
  chefe_secao: ShieldAlert,
  visualizador: Eye,
};

export default function UserManagement() {
  const { isAdmin } = useUserRole();
  const { sections } = useSections();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editUser, setEditUser] = useState<ManagedUser | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [resetUser, setResetUser] = useState<ManagedUser | null>(null);
  const [newPassword, setNewPassword] = useState('');

  // Create form
  const [newEmail, setNewEmail] = useState('');
  const [newPass, setNewPass] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('operador');
  const [newSection, setNewSection] = useState('none');
  const [saving, setSaving] = useState(false);

  const invoke = async (action: string, body?: any) => {
    const { data: { session } } = await supabase.auth.getSession();
    const resp = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-users?action=${action}`,
      {
        method: body ? 'POST' : 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: body ? JSON.stringify(body) : undefined,
      }
    );
    const result = await resp.json();
    if (!resp.ok) throw new Error(result.error || 'Erro');
    return result;
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await invoke('list');
      setUsers(data);
    } catch (err: any) {
      toast.error(err.message);
    }
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleCreate = async () => {
    if (!newEmail || !newPass) { toast.error('Email e senha são obrigatórios.'); return; }
    setSaving(true);
    try {
      if (newRole === 'chefe_secao' && newSection === 'none') {
        toast.error('Selecione a seção do Chefe de Seção.');
        setSaving(false);
        return;
      }
      const sec = sections.find(s => s.name === newSection);
      await invoke('create', {
        email: newEmail, password: newPass, display_name: newName, role: newRole,
        section_id: sec?.id || null, section_name: sec?.name || null,
      });
      toast.success('Usuário criado com sucesso.');
      setCreateOpen(false);
      setNewEmail(''); setNewPass(''); setNewName(''); setNewRole('operador'); setNewSection('none');
      fetchUsers();
    } catch (err: any) { toast.error(err.message); }
    setSaving(false);
  };

  const handleUpdateRole = async () => {
    if (!editUser) return;
    setSaving(true);
    try {
      if (editUser.role === 'chefe_secao' && !editUser.section_name) {
        toast.error('Chefe de Seção precisa de uma seção vinculada.');
        setSaving(false);
        return;
      }
      await invoke('update_role', {
        user_id: editUser.id,
        role: editUser.role,
        section_id: editUser.section_id,
        section_name: editUser.section_name,
      });
      toast.success('Perfil atualizado.');
      setEditUser(null);
      fetchUsers();
    } catch (err: any) { toast.error(err.message); }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await invoke('delete', { user_id: deleteId });
      toast.success('Usuário excluído.');
      setDeleteId(null);
      fetchUsers();
    } catch (err: any) { toast.error(err.message); }
  };

  const handleResetPassword = async () => {
    if (!resetUser || !newPassword) return;
    setSaving(true);
    try {
      await invoke('reset_password', { user_id: resetUser.id, new_password: newPassword });
      toast.success('Senha redefinida.');
      setResetUser(null); setNewPassword('');
    } catch (err: any) { toast.error(err.message); }
    setSaving(false);
  };

  const handleToggleBan = async (user: ManagedUser) => {
    try {
      await invoke('toggle_ban', { user_id: user.id, ban: !user.banned });
      toast.success(user.banned ? 'Usuário reativado.' : 'Usuário desativado.');
      fetchUsers();
    } catch (err: any) { toast.error(err.message); }
  };

  if (!isAdmin) {
    return (
      <PageTransition>
        <div className="container mx-auto py-20 text-center">
          <p className="text-muted-foreground">Acesso restrito a administradores.</p>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="container mx-auto py-6 px-4">
        <PageHeader
          icon={Users}
          title="Gerenciamento de Usuários"
          description={`${users.length} usuário(s) cadastrado(s)`}
          actions={
            <Button onClick={() => setCreateOpen(true)} className="gradient-primary border-0 shadow-glow hover:opacity-90 transition-all duration-300">
              <Plus className="h-4 w-4 mr-1.5" />Novo Usuário
            </Button>
          }
        />

        <Card className="shadow-card border-border/50">
          <CardContent className="pt-5">
            {loading ? (
              <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}</div>
            ) : (
              <div className="rounded-xl border border-border/50 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40 border-b border-border/50">
                      <TableHead className="font-semibold text-[10px] uppercase tracking-widest text-muted-foreground">Usuário</TableHead>
                      <TableHead className="font-semibold text-[10px] uppercase tracking-widest text-muted-foreground">Perfil</TableHead>
                      <TableHead className="font-semibold text-[10px] uppercase tracking-widest text-muted-foreground">Seção</TableHead>
                      <TableHead className="font-semibold text-[10px] uppercase tracking-widest text-muted-foreground">Status</TableHead>
                      <TableHead className="font-semibold text-[10px] uppercase tracking-widest text-muted-foreground">Último Acesso</TableHead>
                      <TableHead className="font-semibold text-[10px] uppercase tracking-widest text-muted-foreground text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((u) => {
                      const RoleIcon = roleIcons[u.role] || Eye;
                      return (
                        <TableRow key={u.id} className="hover:bg-muted/30 transition-colors duration-200 group border-b border-border/30 last:border-0">
                          <TableCell>
                            <div>
                              <p className="text-sm font-medium">{u.display_name}</p>
                              <p className="text-xs text-muted-foreground font-mono">{u.email}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="gap-1">
                              <RoleIcon className="h-3 w-3" />
                              {roleLabels[u.role] || u.role}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {u.section_name || '—'}
                          </TableCell>
                          <TableCell>
                            <Badge variant={u.banned ? 'destructive' : 'default'} className="text-[10px]">
                              {u.banned ? 'Desativado' : 'Ativo'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleString('pt-BR') : 'Nunca'}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-0.5 opacity-60 group-hover:opacity-100 transition-opacity">
                              <Button variant="ghost" size="icon" onClick={() => setEditUser({ ...u })} title="Alterar perfil" className="h-8 w-8 hover:text-primary hover:bg-primary/10 rounded-lg"><Pencil className="h-3.5 w-3.5" /></Button>
                              <Button variant="ghost" size="icon" onClick={() => setResetUser(u)} title="Resetar senha" className="h-8 w-8 hover:text-primary hover:bg-primary/10 rounded-lg"><KeyRound className="h-3.5 w-3.5" /></Button>
                              <Button variant="ghost" size="icon" onClick={() => handleToggleBan(u)} title={u.banned ? 'Reativar' : 'Desativar'} className="h-8 w-8 hover:text-warning hover:bg-warning/10 rounded-lg"><Ban className="h-3.5 w-3.5" /></Button>
                              <Button variant="ghost" size="icon" onClick={() => setDeleteId(u.id)} title="Excluir" className="h-8 w-8 text-destructive/60 hover:text-destructive hover:bg-destructive/10 rounded-lg"><Trash2 className="h-3.5 w-3.5" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Create dialog */}
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Novo Usuário</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Nome</Label>
                <Input placeholder="Nome de exibição" value={newName} onChange={e => setNewName(e.target.value)} className="h-10 bg-muted/30 border-border/60" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Email *</Label>
                <Input type="email" placeholder="email@exemplo.com" value={newEmail} onChange={e => setNewEmail(e.target.value)} className="h-10 bg-muted/30 border-border/60" required />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Senha *</Label>
                <Input type="password" placeholder="Mínimo 6 caracteres" value={newPass} onChange={e => setNewPass(e.target.value)} className="h-10 bg-muted/30 border-border/60" required />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Perfil</Label>
                <Select value={newRole} onValueChange={setNewRole}>
                  <SelectTrigger className="h-10 bg-muted/30 border-border/60"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Administrador</SelectItem>
                    <SelectItem value="operador">Operador</SelectItem>
                    <SelectItem value="chefe_secao">Chefe de Seção</SelectItem>
                    <SelectItem value="visualizador">Visualizador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Seção {newRole === 'chefe_secao' ? '*' : '(opcional)'}
                </Label>
                <Select value={newSection} onValueChange={setNewSection}>
                  <SelectTrigger className="h-10 bg-muted/30 border-border/60"><SelectValue placeholder="Sem seção" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem seção</SelectItem>
                    {sections.map(s => (<SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
              <Button onClick={handleCreate} disabled={saving}>{saving ? 'Criando...' : 'Criar Usuário'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit role dialog */}
        <Dialog open={!!editUser} onOpenChange={() => setEditUser(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>Alterar Perfil — {editUser?.display_name}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <Select value={editUser?.role || 'visualizador'} onValueChange={r => editUser && setEditUser({ ...editUser, role: r })}>
                <SelectTrigger className="h-10 bg-muted/30 border-border/60"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrador</SelectItem>
                  <SelectItem value="operador">Operador</SelectItem>
                    <SelectItem value="chefe_secao">Chefe de Seção</SelectItem>
                  <SelectItem value="visualizador">Visualizador</SelectItem>
                </SelectContent>
              </Select>
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Seção {editUser?.role === 'chefe_secao' ? '*' : '(opcional)'}
                </Label>
                <Select
                  value={editUser?.section_name || 'none'}
                  onValueChange={v => {
                    if (!editUser) return;
                    const sec = sections.find(s => s.name === v);
                    setEditUser({ ...editUser, section_id: sec?.id || null, section_name: sec?.name || null });
                  }}
                >
                  <SelectTrigger className="h-10 bg-muted/30 border-border/60"><SelectValue placeholder="Sem seção" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem seção</SelectItem>
                    {sections.map(s => (<SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditUser(null)}>Cancelar</Button>
              <Button onClick={handleUpdateRole} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Reset password dialog */}
        <Dialog open={!!resetUser} onOpenChange={() => setResetUser(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>Resetar Senha — {resetUser?.display_name}</DialogTitle></DialogHeader>
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Nova Senha</Label>
              <Input type="password" placeholder="Mínimo 6 caracteres" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="h-10 bg-muted/30 border-border/60" />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setResetUser(null); setNewPassword(''); }}>Cancelar</Button>
              <Button onClick={handleResetPassword} disabled={saving || !newPassword}>{saving ? 'Salvando...' : 'Redefinir Senha'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete dialog */}
        <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
              <AlertDialogDescription>Tem certeza que deseja excluir este usuário? Esta ação não pode ser desfeita.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </PageTransition>
  );
}
