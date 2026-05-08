import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Lightbulb, Plus, Trash2, AlertTriangle, CheckCircle2, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';

const INITIAL_SHOW = 3;
import AddInsightDialog from './AddInsightDialog';
import { formatDistanceToNow } from 'date-fns';

const typeConfig = {
  update: { label: 'Update', icon: RefreshCw, badgeClass: 'bg-muted text-muted-foreground border-border', rowClass: 'bg-muted/30', iconClass: 'text-muted-foreground' },
  watch_out: { label: 'Watch Out', icon: AlertTriangle, badgeClass: 'bg-destructive/15 text-destructive border-destructive/30', rowClass: 'bg-destructive/5 border border-destructive/10', iconClass: 'text-destructive' },
  ready: { label: 'Ready', icon: CheckCircle2, badgeClass: 'bg-green-500/15 text-green-500 border-green-500/30', rowClass: 'bg-green-500/5 border border-green-500/10', iconClass: 'text-green-500' },
};

export default function VehicleInsights({ cars, readOnly = false }) {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const { data: insights = [] } = useQuery({
    queryKey: ['insights'],
    queryFn: () => base44.entities.CarInsight.list('-created_date', 50),
  });

  const handleDelete = async (id) => {
    await base44.entities.CarInsight.delete(id);
    queryClient.invalidateQueries({ queryKey: ['insights'] });
  };

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['insights'] });

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Lightbulb className="h-4 w-4 text-secondary" />
            Vehicle Insights
          </CardTitle>
          {!readOnly && (
            <Button size="sm" variant="outline" onClick={() => setDialogOpen(true)}>
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add Insight
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {insights.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            No insights yet. Add notes about recent work done or things to watch on specific vehicles.
          </p>
        ) : (
          <div className="space-y-2">
            {(showAll ? insights : insights.slice(0, INITIAL_SHOW)).map((insight) => {
              const cfg = typeConfig[insight.type] || typeConfig.update;
              const Icon = cfg.icon;
              return (
                <div key={insight.id} className={`flex items-start gap-3 p-3 rounded-lg transition-colors group ${cfg.rowClass}`}>
                  <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${cfg.iconClass}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-foreground truncate">
                        {insight.car_label || `Stock #${insight.stock_number}`}
                      </span>
                      <Badge className={`${cfg.badgeClass} text-xs`}>{cfg.label}</Badge>
                      <span className="text-xs text-muted-foreground ml-auto shrink-0">
                        {formatDistanceToNow(new Date(insight.created_date.endsWith('Z') ? insight.created_date : insight.created_date + 'Z'), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">{insight.note}</p>
                  </div>
                  {!readOnly && (
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
            })}
            {insights.length > INITIAL_SHOW && (
              <button
                className="w-full flex items-center justify-center gap-1.5 text-sm text-primary font-medium hover:underline pt-1"
                onClick={() => setShowAll((v) => !v)}
              >
                {showAll ? <><ChevronUp className="h-4 w-4" /> Show less</> : <><ChevronDown className="h-4 w-4" /> Show {insights.length - INITIAL_SHOW} more</>}
              </button>
            )}
          </div>
        )}
      </CardContent>

      <AddInsightDialog open={dialogOpen} onOpenChange={setDialogOpen} cars={cars} onSaved={refresh} />
    </Card>
  );
}