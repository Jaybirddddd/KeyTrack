import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, Pencil, Loader2, KeyRound } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function LostKeys() {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editKey, setEditKey] = useState(null);
  const [deleteKey, setDeleteKey] = useState(null);
  const [form, setForm] = useState({ key_number: '', location: '', notes: '', status: 'unmatched' });
  const [saving, setSaving] = useState(false);

  const { data: lostKeys = [], isLoading } = useQuery({
    queryKey: ['lost_keys'],
    queryFn: () => base44.entities.LostKey.list('-created_date'),
  });

  const statusConfig = {
    unmatched: { label: 'Unmatched', color: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
    matched: { label: 'Matched', color: 'bg-green-500/15 text-green-500 border-green-500/30' },
    archived: { label: 'Archived', color: 'bg-muted text-muted-foreground border-border' },
  };

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['lost_keys'] });
  };

  const handleOpen = (key = null) => {
    if (key) {
      setForm({ key_number: key.key_number, location: key.location || '', notes: key.notes || '', status: key.status });
      setEditKey(key);
    } else {
      setForm({ key_number: '', location: '', notes: '', status: 'unmatched' });
      setEditKey(null);
    }
    setFormOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    if (editKey) {
      await base44.entities.LostKey.update(editKey.id, form);
    } else {
      await base44.entities.LostKey.create(form);
    }
    setSaving(false);
    setFormOpen(false);
    refresh();
  };

  const handleDelete = async () => {
    await base44.entities.LostKey.delete(deleteKey.id);
    setDeleteKey(null);
    refresh();
  };

  const unmatched = lostKeys.filter((k) => k.status === 'unmatched');
  const matched = lostKeys.filter((k) => k.status === 'matched');
  const archived = lostKeys.filter((k) => k.status === 'archived');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Lost Keys</h1>
          <p className="text-muted-foreground text-sm mt-1">{lostKeys.length} key{lostKeys.length !== 1 ? 's' : ''} total</p>
        </div>
        <Button onClick={() => handleOpen()}>
          <Plus className="h-4 w-4 mr-2" />
          Add Lost Key
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
        </div>
      ) : lostKeys.length === 0 ? (
        <div className="text-center py-16 rounded-xl border border-border bg-card">
          <KeyRound className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
          <p className="text-muted-foreground">No lost keys tracked yet.</p>
          <Button variant="outline" className="mt-4" onClick={() => handleOpen()}>
            <Plus className="h-4 w-4 mr-2" /> Add your first lost key
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Unmatched */}
          {unmatched.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold">Unmatched</h2>
                <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/30">{unmatched.length}</Badge>
              </div>
              <div className="grid gap-2">
                {unmatched.map((key) => (
                  <div key={key.id} className="flex items-start gap-3 p-4 rounded-lg border border-border bg-card hover:bg-muted/40 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-foreground">{key.key_number}</p>
                        <Badge className={statusConfig[key.status].color}>{statusConfig[key.status].label}</Badge>
                      </div>
                      {key.location && <p className="text-sm text-muted-foreground mt-1">📍 {key.location}</p>}
                      {key.notes && <p className="text-sm text-muted-foreground mt-1">{key.notes}</p>}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button size="sm" variant="ghost" onClick={() => handleOpen(key)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setDeleteKey(key)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Matched */}
          {matched.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold">Matched</h2>
                <Badge className="bg-green-500/15 text-green-500 border-green-500/30">{matched.length}</Badge>
              </div>
              <div className="grid gap-2">
                {matched.map((key) => (
                  <div key={key.id} className="flex items-start gap-3 p-4 rounded-lg border border-border bg-card hover:bg-muted/40 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-foreground">{key.key_number}</p>
                        <Badge className={statusConfig[key.status].color}>{statusConfig[key.status].label}</Badge>
                      </div>
                      {key.location && <p className="text-sm text-muted-foreground mt-1">📍 {key.location}</p>}
                      {key.notes && <p className="text-sm text-muted-foreground mt-1">{key.notes}</p>}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button size="sm" variant="ghost" onClick={() => handleOpen(key)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setDeleteKey(key)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Archived */}
          {archived.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold">Archived</h2>
                <Badge className="bg-muted text-muted-foreground border-border">{archived.length}</Badge>
              </div>
              <div className="grid gap-2">
                {archived.map((key) => (
                  <div key={key.id} className="flex items-start gap-3 p-4 rounded-lg border border-border bg-card hover:bg-muted/40 transition-colors opacity-60">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-foreground">{key.key_number}</p>
                        <Badge className={statusConfig[key.status].color}>{statusConfig[key.status].label}</Badge>
                      </div>
                      {key.location && <p className="text-sm text-muted-foreground mt-1">📍 {key.location}</p>}
                      {key.notes && <p className="text-sm text-muted-foreground mt-1">{key.notes}</p>}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button size="sm" variant="ghost" onClick={() => handleOpen(key)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setDeleteKey(key)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Form Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editKey ? 'Edit Lost Key' : 'Add Lost Key'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Key Number / ID *</Label>
              <Input value={form.key_number} onChange={(e) => setForm({ ...form, key_number: e.target.value })} required />
            </div>
            <div>
              <Label>Location</Label>
              <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="e.g., desk drawer, office box" />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unmatched">Unmatched</SelectItem>
                  <SelectItem value="matched">Matched</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="What vehicle might this be for?" rows={2} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editKey ? 'Update' : 'Add Key'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteKey} onOpenChange={(v) => !v && setDeleteKey(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Lost Key</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete key "{deleteKey?.key_number}"? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}