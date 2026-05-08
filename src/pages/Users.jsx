import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/lib/useCurrentUser';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { UserPlus, ShieldCheck, User, Wrench, Loader2, Trash2, Zap, Hammer, Store, Pencil } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

const roleConfig = {
  admin: { label: 'Admin', icon: ShieldCheck, className: 'bg-primary/10 text-primary border-primary/20' },
  salesperson: { label: 'Salesperson', icon: User, className: 'bg-green-500/10 text-green-700 border-green-200' },
  porter: { label: 'Porter', icon: Wrench, className: 'bg-amber-500/10 text-amber-700 border-amber-200' },
  vendor: { label: 'Vendor', icon: Store, className: 'bg-purple-500/10 text-purple-700 border-purple-200' },
  detail_team: { label: 'Detail Team', icon: Zap, className: 'bg-blue-500/10 text-blue-700 border-blue-200' },
  service_team: { label: 'Service Team', icon: Hammer, className: 'bg-orange-500/10 text-orange-700 border-orange-200' },
};

export default function Users() {
  const { user: currentUser, isAdmin } = useCurrentUser();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('salesperson');
  const [inviting, setInviting] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);
  const [deleteUser, setDeleteUser] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [renameUser, setRenameUser] = useState(null);
  const [renameName, setRenameName] = useState('');
  const [renaming, setRenaming] = useState(false);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">You don't have permission to manage users.</p>
      </div>
    );
  }

  const handleInvite = async (e) => {
    e.preventDefault();
    setInviting(true);

    await base44.users.inviteUser(inviteEmail, inviteRole === 'admin' ? 'admin' : 'user');

    toast({
      title: 'Invitation sent!',
      description: `${inviteEmail} has been invited. Once they sign in, set their role using the dropdown next to their name.`,
    });
    setInviting(false);
    setInviteEmail('');
    setInviteRole('salesperson');
    setInviteOpen(false);
    queryClient.invalidateQueries({ queryKey: ['users'] });
  };

  const handleDelete = async () => {
    setDeleting(true);
    await base44.entities.User.delete(deleteUser.id);
    setDeleteUser(null);
    setDeleting(false);
    queryClient.invalidateQueries({ queryKey: ['users'] });
    toast({ title: 'User removed' });
  };

  const handleRename = async (e) => {
    e.preventDefault();
    setRenaming(true);
    await base44.entities.User.update(renameUser.id, { display_name: renameName.trim() });
    setRenaming(false);
    setRenameUser(null);
    queryClient.invalidateQueries({ queryKey: ['users'] });
    toast({ title: 'Name updated' });
  };

  const handleRoleChange = async (userId, newRole) => {
    setUpdatingId(userId);
    await base44.entities.User.update(userId, { role: newRole });
    setUpdatingId(null);
    // Invalidate both user list and current user cache (affects target user on next poll)
    queryClient.invalidateQueries({ queryKey: ['users'] });
    queryClient.invalidateQueries({ queryKey: ['current_user'] });
    toast({ title: 'Role updated — the user will see their new role within 60 seconds.' });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">User Management</h1>
          <p className="text-muted-foreground text-sm mt-1">Control who has access and what they can do</p>
        </div>
        <Button onClick={() => setInviteOpen(true)}>
          <UserPlus className="h-4 w-4 mr-2" />
          Invite User
        </Button>
      </div>

      {/* Role legend */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <span className="font-semibold text-sm">Admin</span>
          </div>
          <p className="text-xs text-muted-foreground">Full access: inventory CRUD, import, user management, key operations</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <User className="h-4 w-4 text-green-600" />
            <span className="font-semibold text-sm">Salesperson</span>
          </div>
          <p className="text-xs text-muted-foreground">View inventory, check keys in/out. No editing or deleting vehicles.</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Wrench className="h-4 w-4 text-amber-600" />
            <span className="font-semibold text-sm">Porter</span>
          </div>
          <p className="text-xs text-muted-foreground">View inventory, check keys in/out. No editing or deleting vehicles.</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Store className="h-4 w-4 text-purple-600" />
            <span className="font-semibold text-sm">Vendor</span>
          </div>
          <p className="text-xs text-muted-foreground">VIN scanner only — scan to check in vehicles, labeled as Vendor.</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Zap className="h-4 w-4 text-blue-600" />
            <span className="font-semibold text-sm">Detail Team</span>
          </div>
          <p className="text-xs text-muted-foreground">VIN scanner only — scan to check in vehicles automatically.</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Hammer className="h-4 w-4 text-orange-600" />
            <span className="font-semibold text-sm">Service Team</span>
          </div>
          <p className="text-xs text-muted-foreground">VIN scanner only — scan to check in vehicles automatically.</p>
        </Card>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-2">
          {[...users].sort((a, b) => {
            const roleOrder = ['admin', 'salesperson', 'porter', 'vendor', 'detail_team', 'service_team'];
            const ai = roleOrder.indexOf(a.role || 'salesperson');
            const bi = roleOrder.indexOf(b.role || 'salesperson');
            return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
          }).map((u) => {
            const cfg = roleConfig[u.role] || roleConfig.salesperson;
            const Icon = cfg.icon;
            const isSelf = u.email === currentUser?.email;
            return (
              <Card key={u.id}>
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <Icon className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="font-medium text-sm truncate">
                        {u.display_name || u.full_name || u.email}
                        {isSelf && <span className="ml-2 text-xs text-muted-foreground">(you)</span>}
                      </p>
                      <button
                        className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                        title="Rename"
                        onClick={() => { setRenameUser(u); setRenameName(u.display_name || u.full_name || ''); }}
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className={cfg.className}>{cfg.label}</Badge>
                    {!isSelf && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        onClick={() => setDeleteUser(u)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                    {!isSelf && (
                      <Select
                        key={u.role}
                        value={u.role || 'salesperson'}
                        onValueChange={(val) => handleRoleChange(u.id, val)}
                        disabled={updatingId === u.id}
                      >
                        <SelectTrigger className="w-36 h-8 text-xs">
                          {updatingId === u.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <SelectValue />
                          )}
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="salesperson">Salesperson</SelectItem>
                          <SelectItem value="porter">Porter</SelectItem>
                          <SelectItem value="vendor">Vendor</SelectItem>
                          <SelectItem value="detail_team">Detail Team</SelectItem>
                          <SelectItem value="service_team">Service Team</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteUser} onOpenChange={(v) => !v && setDeleteUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove <strong>{deleteUser?.display_name || deleteUser?.full_name || deleteUser?.email}</strong> from the app? They will lose all access immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive hover:bg-destructive/90">
              {deleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Rename Dialog */}
      <Dialog open={!!renameUser} onOpenChange={(v) => !v && setRenameUser(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Rename User</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleRename} className="space-y-4">
            <div>
              <Label>Display Name</Label>
              <Input
                value={renameName}
                onChange={(e) => setRenameName(e.target.value)}
                placeholder="Enter a name..."
                required
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setRenameUser(null)}>Cancel</Button>
              <Button type="submit" disabled={renaming}>
                {renaming && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Invite Dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Invite a User</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleInvite} className="space-y-4">
            <div>
              <Label>Email Address</Label>
              <Input
                type="email"
                placeholder="name@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <Label>Intended Role</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin (full access)</SelectItem>
                  <SelectItem value="salesperson">Salesperson</SelectItem>
                  <SelectItem value="porter">Porter</SelectItem>
                  <SelectItem value="vendor">Vendor (scanner only)</SelectItem>
                  <SelectItem value="detail_team">Detail Team (scanner only)</SelectItem>
                  <SelectItem value="service_team">Service Team (scanner only)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1.5">
                ⚠️ After they sign in, you'll need to manually set their role using the dropdown next to their name below.
              </p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setInviteOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={inviting}>
                {inviting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Send Invite
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}