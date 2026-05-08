import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Brain, RefreshCw, Loader2, AlertTriangle, Clock, TrendingDown, Wrench, Key, ChevronDown, ChevronUp } from 'lucide-react';

const INITIAL_SHOW = 4;

const alertIcons = {
  stale_key: Key,
  aged_inventory: TrendingDown,
  overdue_service: Wrench,
  missing_info: AlertTriangle,
  general: Brain,
};

const alertColors = {
  high: 'bg-destructive/10 border-destructive/20',
  medium: 'bg-amber-500/15 border-amber-500/30',
  low: 'bg-muted border-border',
};

const alertIconColors = {
  high: 'text-destructive',
  medium: 'text-amber-400',
  low: 'text-muted-foreground',
};

const alertBadgeColors = {
  high: 'bg-destructive/10 text-destructive border-destructive/20',
  medium: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  low: 'bg-muted text-muted-foreground border-border',
};

export default function AiAlerts({ cars, logs }) {
  const [alerts, setAlerts] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const generateAlerts = async () => {
    setLoading(true);
    try {
      const recentLogs = logs.slice(0, 30);
      const keysOut = cars.filter((c) => c.key_status === 'out');
      const agedCars = cars.filter((c) => c.age && c.age > 60);
      const noVin = cars.filter((c) => !c.vin);
      const inService = cars.filter((c) => c.disp === 'Service' || c.disp === 'Detail');

      // Find keys that have been out a long time by checking the last checkout log
      const keyOutDurations = keysOut.map((car) => {
        const log = recentLogs.find((l) => l.car_id === car.id && l.action === 'checked_out');
        const hoursOut = log
          ? Math.round((Date.now() - new Date(log.created_date.endsWith('Z') ? log.created_date : log.created_date + 'Z').getTime()) / 3600000)
          : null;
        return { car, hoursOut };
      });

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a smart dealership assistant. Analyze the following inventory and key data, and return actionable alerts for the manager. Be concise, practical, and specific.

TODAY: ${new Date().toDateString()}

KEYS CURRENTLY OUT (${keysOut.length}):
${keyOutDurations.map(({ car, hoursOut }) => `- ${car.year} ${car.make} ${car.model} (Stock #${car.stock_number}) — with: ${car.key_holder || 'unknown'}${hoursOut !== null ? `, ${hoursOut}h ago` : ''}`).join('\n') || 'None'}

AGED INVENTORY (60+ days, ${agedCars.length} vehicles):
${agedCars.map((c) => `- ${c.year} ${c.make} ${c.model} (Stock #${c.stock_number}) — ${c.age} days, $${c.price?.toLocaleString() || 'N/A'}, Exit: ${c.exit_strategy || '?'}`).join('\n') || 'None'}

IN SERVICE/DETAIL (${inService.length}):
${inService.map((c) => `- ${c.year} ${c.make} ${c.model} (Stock #${c.stock_number}) — ${c.disp}, holder: ${c.key_holder || 'unknown'}`).join('\n') || 'None'}

MISSING VIN (${noVin.length}): ${noVin.map((c) => `Stock #${c.stock_number}`).join(', ') || 'None'}

Generate 3-7 specific, prioritized alerts. Each alert should be actionable and specific to the data. Examples: a key that's been out too long, a vehicle that's been in service too long, aged inventory that needs attention, missing data that should be filled in, etc.`,
        response_json_schema: {
          type: 'object',
          properties: {
            alerts: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  detail: { type: 'string' },
                  priority: { type: 'string', enum: ['high', 'medium', 'low'] },
                  type: { type: 'string', enum: ['stale_key', 'aged_inventory', 'overdue_service', 'missing_info', 'general'] },
                },
              },
            },
          },
        },
      });

      setAlerts(result?.alerts || []);
    } finally {
      setLoading(false);
    }
  };

  const visible = showAll ? (alerts || []) : (alerts || []).slice(0, INITIAL_SHOW);
  const extra = (alerts || []).length - INITIAL_SHOW;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Brain className="h-4 w-4 text-primary" />
            AI Alerts
          </CardTitle>
          <Button
            size="sm"
            variant={alerts ? 'outline' : 'default'}
            onClick={generateAlerts}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            )}
            {alerts ? 'Refresh' : 'Analyze Now'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!alerts && !loading && (
          <div className="text-center py-6">
            <Brain className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Click <strong>Analyze Now</strong> to get AI-generated alerts about your inventory, keys out, aged vehicles, and more.</p>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center py-8 gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Analyzing your dealership data...</p>
          </div>
        )}

        {alerts && !loading && (
          <div className="space-y-2">
            {alerts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">All clear — no critical alerts right now.</p>
            ) : (
              <>
                {visible.map((alert, i) => {
                  const Icon = alertIcons[alert.type] || Brain;
                  return (
                    <div key={i} className={`flex items-start gap-3 p-3 rounded-lg border ${alertColors[alert.priority] || alertColors.low}`}>
                      <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${alertIconColors[alert.priority] || alertIconColors.low}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-foreground">{alert.title}</p>
                          <Badge className={`text-xs ${alertBadgeColors[alert.priority]}`}>
                            {alert.priority}
                          </Badge>
                        </div>
                        <p className="text-xs mt-0.5 text-muted-foreground">{alert.detail}</p>
                      </div>
                    </div>
                  );
                })}
                {(alerts.length > INITIAL_SHOW) && (
                  <button
                    className="w-full flex items-center justify-center gap-1.5 text-sm text-primary font-medium hover:underline pt-1"
                    onClick={() => setShowAll((v) => !v)}
                  >
                    {showAll ? <><ChevronUp className="h-4 w-4" /> Show less</> : <><ChevronDown className="h-4 w-4" /> Show {extra} more</>}
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}