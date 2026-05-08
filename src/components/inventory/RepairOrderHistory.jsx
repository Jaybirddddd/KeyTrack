import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Trash2, Wrench, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { useCurrentUser } from '@/lib/useCurrentUser';

export default function RepairOrderHistory({ car }) {
  const queryClient = useQueryClient();
  const { user } = useCurrentUser();
  const isAdmin = user?.role === 'admin';
  const [summary, setSummary] = useState('');
  const [summarizing, setSummarizing] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['repair_orders', car?.id],
    queryFn: () => base44.entities.RepairOrder.filter({ car_id: car.id }, '-repair_date'),
    enabled: !!car?.id,
  });

  const handleDelete = async (id) => {
    await base44.entities.RepairOrder.delete(id);
    queryClient.invalidateQueries({ queryKey: ['repair_orders', car.id] });
    setSummary('');
  };

  const handleSummarize = async () => {
    setSummarizing(true);
    setSummaryOpen(true);
    const allServices = orders.map(o =>
      `${o.repair_date}: ${o.services_performed} (Cost: $${o.total_cost})`
    ).join('\n');

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a used car manager at a Mercedes-Benz dealership. Below is the full repair history for a ${car.year} ${car.make} ${car.model}.

Summarize the key takeaways in 3–5 bullet points. Focus on:
- Major services or repairs done
- Any recalls completed
- Overall condition impression based on service history
- Any concerns or things to be aware of

Keep it short, clear, and useful for a salesperson showing this vehicle to a customer.

Repair history:
${allServices}`,
    });

    setSummary(result);
    setSummarizing(false);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-6">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-6">
        No repair orders on file. Use "Import Repairs" on the Inventory page to add history.
      </p>
    );
  }

  return (
    <div className="space-y-3 pb-4">
      {/* AI Summary */}
      <div className="rounded-lg border border-border bg-muted/30">
        <button
          className="w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium text-foreground"
          onClick={() => summaryOpen ? setSummaryOpen(false) : (summary ? setSummaryOpen(true) : handleSummarize())}
        >
          <span className="flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-secondary" />
            AI Summary
          </span>
          {summarizing
            ? <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
            : summaryOpen ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          }
        </button>
        {summaryOpen && !summarizing && summary && (
          <div className="px-3 pb-3 text-xs text-muted-foreground leading-relaxed border-t border-border pt-2 whitespace-pre-line">
            {summary}
            <Button size="sm" variant="ghost" className="mt-2 h-6 text-xs text-muted-foreground" onClick={handleSummarize}>
              Regenerate
            </Button>
          </div>
        )}
      </div>

      {/* Individual repair orders */}
      {orders.map((order) => (
        <div key={order.id} className="rounded-lg border border-border bg-card p-3 group">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Wrench className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="text-sm font-semibold text-foreground">{order.repair_date}</span>
              {order.ro_number && (
                <Badge variant="outline" className="text-xs font-mono">RO#{order.ro_number}</Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-sm font-semibold ${order.total_cost > 0 ? 'text-foreground' : 'text-muted-foreground'}`}>
                {order.total_cost > 0 ? `$${order.total_cost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'No charge'}
              </span>
              {isAdmin && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive"
                  onClick={() => handleDelete(order.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{order.services_performed}</p>
        </div>
      ))}
    </div>
  );
}