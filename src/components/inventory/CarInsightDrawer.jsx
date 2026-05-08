import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Loader2, Trash2, AlertTriangle, CheckCircle2, RefreshCw, Plus } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useCurrentUser } from '@/lib/useCurrentUser';

const typeConfig = {
  update: { label: 'Update', icon: RefreshCw, badgeClass: 'bg-muted text-muted-foreground border-border', rowClass: 'bg-muted/30', iconClass: 'text-muted-foreground' },
  watch_out: { label: 'Watch Out', icon: AlertTriangle, badgeClass: 'bg-destructive/10 text-destructive border-destructive/20', rowClass: 'bg-destructive/5 border border-destructive/10', iconClass: 'text-destructive' },
  ready: { label: 'Ready', icon: CheckCircle2, badgeClass: 'bg-green-500/10 text-green-500 border-green-500/20', rowClass: 'bg-green-500/5 border border-green-500/10', iconClass: 'text-green-500' },
};

export default function CarInsightDrawer({ car, open, onOpenChange }) {
  const queryClient = useQueryClient();
  const { user } = useCurrentUser();
  const isAdmin = user?.role !== 'vendor' && user?.role !== 'porter';
  const [note, setNote] = useState('');
  const [type, setType] = useState('update');
  const [saving, setSaving] = useState(false);

  const { data: insights = [], isLoading } = useQuery({
    queryKey: ['insights', car?.id],
    queryFn: () => base44.entities.CarInsight.filter({ car_id: car.id }, '-created_date'),
    enabled: !!car?.id && open,
  });

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!note.trim()) return;
    setSaving(true);
    await base44.entities.CarInsight.create({
      car_id: car.id,
      stock_number: car.stock_number,
      car_label: `${car.year} ${car.make} ${car.model}`,
      note,
      type,
    });
    setNote('');
    setType('update');
    setSaving(false);
    queryClient.invalidateQueries({ queryKey: ['insights', car.id] });
    queryClient.invalidateQueries({ queryKey: ['insights'] });
  };

  const handleDelete = async (id) => {
    await base44.entities.CarInsight.delete(id);
    queryClient.invalidateQueries({ queryKey: ['insights', car.id] });
    queryClient.invalidateQueries({ queryKey: ['insights'] });
  };

  if (!car) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md flex flex-col overflow-hidden">
        <SheetHeader>
          <SheetTitle className="text-left">
            <span className="text-foreground">{car.year} {car.make} {car.model}</span>
            <span className="block text-sm font-normal text-muted-foreground mt-0.5">Stock #{car.stock_number}</span>
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto mt-3 space-y-2">
          {/* Add new insight */}
          {isAdmin && <form onSubmit={handleAdd} className="space-y-3 border-b border-border pb-4">
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="update">Update — recent work done</SelectItem>
                  <SelectItem value="watch_out">Watch Out — issue to be aware of</SelectItem>
                  <SelectItem value="ready">Ready — good to go</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Note</Label>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Just back from detail, needs new tires, AC repaired..."
                rows={2}
                className="text-sm resize-none"
              />
            </div>
            <Button type="submit" size="sm" disabled={saving || !note.trim()} className="w-full">
              {saving ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Plus className="h-3.5 w-3.5 mr-1.5" />}
              Add Insight
            </Button>
          </form>}

          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : insights.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No insights yet for this vehicle.</p>
          ) : (
            insights.map((insight) => {
              const cfg = typeConfig[insight.type] || typeConfig.update;
              const Icon = cfg.icon;
              return (
                <div key={insight.id} className={`flex items-start gap-3 p-3 rounded-lg group ${cfg.rowClass}`}>
                  <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${cfg.iconClass}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge className={`${cfg.badgeClass} text-xs`}>{cfg.label}</Badge>
                      <span className="text-xs text-muted-foreground ml-auto">
                        {formatDistanceToNow(new Date(insight.created_date.endsWith('Z') ? insight.created_date : insight.created_date + 'Z'), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-sm text-foreground mt-1">{insight.note}</p>
                  </div>
                  {isAdmin && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 shrink-0 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(insight.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}